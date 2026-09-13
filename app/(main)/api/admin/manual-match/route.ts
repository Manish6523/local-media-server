import fs from "fs";
import path from "path";
import { eq, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-session";
import { getConfig, getDb, getMediaByFilepath, upsertMedia } from "@/lib/db";
import { mediaFiles } from "@/db/schema";
import { identifyFile, type OmdbMedia } from "@/lib/metadata-matcher";
import { getBackdropForMovie, getBackdropForShow } from "@/lib/fanart";

export const runtime = "nodejs";

async function omdb(params: Record<string, string>) {
  const key = getConfig("omdb_api_key") || process.env.OMDB_API_KEY;
  if (!key) throw new Error("Add your OMDb API key in Settings first.");
  const response = await fetch(`https://www.omdbapi.com/?${new URLSearchParams({ ...params, apikey: key })}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("OMDb is unavailable. Please try again.");
  return response.json();
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Unlock the admin panel again." }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    if (params.has("q")) {
      const q = params.get("q")?.trim() || "";
      const type = params.get("type");
      if (q.length < 2 || q.length > 200 || !["movie", "series"].includes(type || "")) return Response.json({ error: "Enter a title and select a media type." }, { status: 400 });
      const data = await omdb({ s: q, type: type! });
      if (data.Response !== "True") return Response.json({ error: data.Error || "No results found.", results: [] }, { status: 400 });
      return Response.json({ results: data.Search || [] });
    }
    const { db } = getDb();
    const rows = db.select().from(mediaFiles).where(eq(mediaFiles.status, "unmatched")).all();
    return Response.json({ files: rows.map(row => {
      let size: number | null = null;
      try { size = fs.statSync(row.filePath).size; } catch { /* Disconnected files remain reviewable. */ }
      const guess = identifyFile(path.basename(row.filePath));
      const media = getMediaByFilepath(row.filePath);
      return { id: row.id, mediaId: media?.id ?? null, filename: path.basename(row.filePath), folder: path.dirname(row.filePath), size,
        type: row.type ?? guess.type, season: row.season ?? (Array.isArray(guess.season) ? guess.season[0] : guess.season) ?? null,
        episode: row.episode ?? (Array.isArray(guess.episode) ? Math.min(...guess.episode) : guess.episode) ?? null,
        episodeEnd: row.episodeEnd ?? null };
    }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load review queue." }, { status: 502 });
  }
}

interface Assignment { id: number; season?: number; episode?: number; episodeEnd?: number }
export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Unlock the admin panel again." }, { status: 401 });
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = await request.json();
    const { imdbId, type, files } = body as { imdbId: string; type: string; files: Assignment[] };
    if (typeof imdbId !== "string" || !/^tt\d+$/.test(imdbId) || !["movie", "episode"].includes(type) || !Array.isArray(files) || !files.length || files.length > 200 || (type === "movie" && files.length !== 1)) {
      return Response.json({ error: "Choose a result and up to 200 episode files (or one movie)." }, { status: 400 });
    }
    if (files.some(f => !f || !Number.isInteger(f.id) || (type === "episode" && (!Number.isInteger(f.season) || f.season! < 0 || !Number.isInteger(f.episode) || f.episode! < 1 || (f.episodeEnd !== undefined && (!Number.isInteger(f.episodeEnd) || f.episodeEnd < f.episode!))))) || new Set(files.map(f => f.id)).size !== files.length) {
      return Response.json({ error: "Check season and episode numbers. Each file must be selected only once." }, { status: 400 });
    }
    const { db, sqliteDb } = getDb();
    const ids = files.map(f => f.id);
    const rows = db.select().from(mediaFiles).where(inArray(mediaFiles.id, ids)).all();
    if (rows.length !== files.length || rows.some(r => r.status !== "unmatched")) return Response.json({ error: "The queue changed. Refresh before saving." }, { status: 409 });
    const details: OmdbMedia = await omdb({ i: imdbId, plot: "full" });
    if (details.Response !== "True" || details.imdbID !== imdbId || !details.Title || details.Type !== (type === "movie" ? "movie" : "series")) return Response.json({ error: "OMDb could not verify this movie or series." }, { status: 400 });
    const clean = (value: string | undefined) => value && value !== "N/A" ? value : null;
    // Resolve artwork once per confirmed title, before opening the transaction.
    // Missing artwork must not prevent a valid manual match from being saved.
    let artwork: Awaited<ReturnType<typeof getBackdropForMovie>> = null;
    try {
      artwork = type === "movie"
        ? await getBackdropForMovie(imdbId)
        : await getBackdropForShow(imdbId);
    } catch (error) {
      console.error("[Manual match] Artwork lookup failed:", error);
    }
    const now = new Date().toISOString();
    sqliteDb.transaction(() => {
      // Re-check after the network lookup so concurrent saves cannot overwrite a choice.
      const current = db.select().from(mediaFiles).where(inArray(mediaFiles.id, ids)).all();
      if (current.length !== rows.length || current.some(r => r.status !== "unmatched")) throw new Error("These files were already matched. Refresh the queue.");
      for (const row of rows) {
        const assignment = files.find(f => f.id === row.id)!;
        const existing = getMediaByFilepath(row.filePath);
        const season = type === "episode" ? assignment.season! : null;
        const episode = type === "episode" ? assignment.episode! : null;
        const episodeEnd = type === "episode" ? assignment.episodeEnd ?? episode : null;
        upsertMedia({ filepath: row.filePath, filename: path.basename(row.filePath), source: existing?.source ?? "local",
          type: type === "episode" ? "show" : "movie", title: details.Title!, year: Number.parseInt(details.Year || "", 10) || null,
          season, episode_start: episode, episode_end: episodeEnd, omdb_id: imdbId,
          poster: clean(details.Poster),
          backdrop: artwork?.backdropPath ?? (existing?.omdb_id === imdbId ? existing.backdrop : null),
          backdrop_url: artwork?.backdropUrl ?? (existing?.omdb_id === imdbId ? existing.backdrop_url : null),
          overview: clean(details.Plot),
          rating: clean(details.imdbRating) ? `${details.imdbRating}/10` : null, genres: clean(details.Genre),
          runtime: type === "movie" ? Number.parseInt(details.Runtime || "", 10) || null : null,
          available: existing?.available ?? (fs.existsSync(row.filePath) ? 1 : 0), fetched_at: now, omdb_confirmed: 1,
        });
        db.update(mediaFiles).set({ imdbId, title: details.Title, type: type as "movie" | "episode", season, episode, episodeEnd,
          matchSource: "manual", status: "matched", updatedAt: now }).where(eq(mediaFiles.id, row.id)).run();
      }
    })();
    return Response.json({ saved: rows.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save matches." }, { status: 400 });
  }
}
