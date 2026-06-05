import { NextResponse } from "next/server";
import { getMediaById, upsertMedia } from "@/lib/db";
import { fetchOMDB } from "@/lib/omdb";
import { getBackdropForMovie, getBackdropForShow } from "@/lib/fanart";
import fs from "fs";
import path from "path";

async function downloadCustomImage(url: string, type: "posters" | "backdrops", id: number): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), "public", type);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `custom_${id}.jpg`;
    const filepath = path.join(dir, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const buffer = await res.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    console.log(`[Custom Image] Downloaded custom ${type} for ID ${id}`);
    return `/${type}/${filename}`;
  } catch (error) {
    console.error(`[Custom Image] Download failed for ${url}:`, error);
    return null;
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    const body = await request.json();
    const { title, customPoster, customBackdrop } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ success: false, error: "Invalid title" }, { status: 400 });
    }

    const existing = getMediaById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Media not found" }, { status: 404 });
    }

    console.log(`[Edit Title] User edited title for ID ${id} to: "${title}"`);

    // Download custom images if provided
    let localCustomPoster = null;
    if (customPoster) {
      localCustomPoster = await downloadCustomImage(customPoster, "posters", id);
    }

    let localCustomBackdrop = null;
    if (customBackdrop) {
      localCustomBackdrop = await downloadCustomImage(customBackdrop, "backdrops", id);
    }

    // Refetch OMDB with the new title
    const omdbData = await fetchOMDB(title, existing.type, existing.year);

    // Refetch Fanart.tv backdrop if no custom backdrop provided
    let backdropResult = null;
    if (omdbData?.omdb_id && !customBackdrop) {
      if (existing.type === "movie") {
        backdropResult = await getBackdropForMovie(omdbData.omdb_id);
      } else {
        backdropResult = await getBackdropForShow(omdbData.omdb_id);
      }
    }

    // Update the media entry
    upsertMedia({
      ...existing,
      title: omdbData?.confirmed_title || title,
      omdb_id: omdbData?.omdb_id || existing.omdb_id || null,
      poster: localCustomPoster || omdbData?.poster || existing.poster || null,
      backdrop: localCustomBackdrop || backdropResult?.backdropPath || existing.backdrop || null,
      backdrop_url: customBackdrop || backdropResult?.backdropUrl || existing.backdrop_url || null,
      overview: omdbData?.overview || existing.overview || null,
      rating: omdbData?.rating || existing.rating || null,
      genres: omdbData?.genres || existing.genres || null,
      runtime: omdbData?.runtime || existing.runtime || null,
      fetched_at: omdbData ? new Date().toISOString() : existing.fetched_at,
      omdb_confirmed: 1, // User manually confirmed/edited it
    });

    return NextResponse.json({ success: true, refetched: !!omdbData });
  } catch (err) {
    console.error("[Edit Title] Error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
