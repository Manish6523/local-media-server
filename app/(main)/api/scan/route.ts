import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { scanAllSources } from "@/lib/scanner";
import { identifyFile, processLibraryFile } from "@/lib/metadata-matcher";
import { downloadPoster } from "@/lib/omdb";
import { getBackdropForMovie, getBackdropForShow } from "@/lib/fanart";
import { getDb, getMediaByFilepath, upsertMedia, setConfig, getMediaPaths, getAllMedia } from "@/lib/db";
import * as schema from "@/db/schema";

export const dynamic = "force-dynamic";

function firstNumber(value: number | number[] | undefined): number | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function text(value: string | undefined): string | null {
  return value && value !== "N/A" ? value : null;
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const mediaPaths = getMediaPaths();
        send({ message: "Starting scan...", progress: 0 });
        await new Promise(resolve => setTimeout(resolve, 10));
        const { files, connectedPaths } = scanAllSources(mediaPaths);
        const { db } = getDb();
        let deletedCount = 0;
        send({ message: "Cleaning up missing files...", progress: 10 });
        for (const media of getAllMedia()) {
          const parent = mediaPaths.find(root => {
            const relative = path.relative(root, media.filepath);
            return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
          });
          if (parent && !connectedPaths.includes(parent)) {
            db.update(schema.mediaAssets).set({ available: 0 }).where(eq(schema.mediaAssets.id, media.id)).run();
          } else if (!parent || !fs.existsSync(media.filepath)) {
            db.delete(schema.episodes).where(eq(schema.episodes.mediaAssetId, media.id)).run();
            db.delete(schema.movies).where(eq(schema.movies.mediaAssetId, media.id)).run();
            db.delete(schema.playbackProgress).where(eq(schema.playbackProgress.mediaAssetId, media.id)).run();
            db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, media.id)).run();
            db.delete(schema.mediaFiles).where(eq(schema.mediaFiles.filePath, media.filepath)).run();
            deletedCount++;
          }
        }

        let newCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const shows = new Set<string>();
        for (const [index, file] of files.entries()) {
          send({ message: `Processing: ${file.filename}`, progress: 10 + Math.floor(index / files.length * 80) });
          await new Promise(resolve => setTimeout(resolve, 10));
          try {
            const guess = identifyFile(file.filename);
            const existing = getMediaByFilepath(file.filepath);
            const result = await processLibraryFile(file.filepath);
            const type = (result.type ?? guess.type) === "episode" ? "show" : "movie";
            const details = result.omdb;
            const title = result.title || guess.title || file.filename;
            if (type === "show") shows.add(title);
            // A cached match already has its metadata in the existing library tables.
            const reuse = existing && existing.omdb_id === result.imdbId && result.status === "matched";
            let poster = reuse ? existing.poster : null;
            if (!poster && details?.Poster && details.Poster !== "N/A" && result.imdbId) {
              poster = await downloadPoster(result.imdbId, details.Poster);
            }
            let backdrop = reuse ? existing.backdrop : null;
            let backdropUrl = reuse ? existing.backdrop_url : null;
            if (!backdrop && result.imdbId) {
              const artwork = type === "show"
                ? await getBackdropForShow(result.imdbId)
                : await getBackdropForMovie(result.imdbId);
              backdrop = artwork?.backdropPath ?? null;
              backdropUrl = artwork?.backdropUrl ?? null;
            }
            const episodes = Array.isArray(guess.episode) ? guess.episode : guess.episode === undefined ? [] : [guess.episode];
            upsertMedia({
              filepath: file.filepath,
              filename: file.filename,
              source: file.source,
              type,
              title,
              year: Number.parseInt(details?.Year ?? "", 10) || (reuse ? existing.year : guess.year ?? null),
              season: type === "show" ? result.season ?? firstNumber(guess.season) : null,
              episode_start: type === "show" ? result.episode ?? (episodes.length ? Math.min(...episodes) : null) : null,
              episode_end: type === "show" ? result.episodeEnd ?? (episodes.length ? Math.max(...episodes) : null) : null,
              omdb_id: result.imdbId,
              poster,
              backdrop,
              backdrop_url: backdropUrl,
              overview: text(details?.Plot) ?? (reuse ? existing.overview : null),
              rating: text(details?.imdbRating) ? `${details?.imdbRating}/10` : reuse ? existing.rating : null,
              genres: text(details?.Genre) ?? (reuse ? existing.genres : null),
              runtime: Number.parseInt(details?.Runtime ?? "", 10) || (reuse ? existing.runtime : null),
              available: 1,
              fetched_at: result.status === "matched" ? result.updatedAt : null,
              omdb_confirmed: result.status === "matched" ? 1 : 0,
            });
            if (!existing) newCount++;
            else if (reuse && !details) skippedCount++;
            else updatedCount++;
          } catch (error) {
            console.error(`[Scan] Failed to process ${file.filename}:`, error);
            errorCount++;
          }
        }
        setConfig("last_scan", new Date().toISOString());
        send({ done: true, summary: {
          totalFiles: files.length, uniqueShows: shows.size,
          new: newCount, updated: updatedCount, skipped: skippedCount,
          errors: errorCount, deleted: deletedCount,
        } });
      } catch (error) {
        console.error("[Scan] Fatal error:", error);
        send({ error: String(error) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive",
  } });
}
