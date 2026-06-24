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

    // Use a timestamp suffix so each edit gets a unique filename
    const timestamp = Date.now();
    const filename = `custom_${id}_${timestamp}.jpg`;
    const filepath = path.join(dir, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": new URL(url).origin + "/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const buffer = await res.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    console.log(`[Custom Image] Downloaded custom ${type} for ID ${id}: ${filename}`);
    
    // Clean up old custom images for this ID (including pre-patch un-timestamped ones)
    const allFiles = fs.readdirSync(dir);
    const oldFiles = allFiles.filter(f => 
      (f.startsWith(`custom_${id}_`) || f === `custom_${id}.jpg`) && f !== filename
    );
    for (const oldFile of oldFiles) {
      try {
        fs.unlinkSync(path.join(dir, oldFile));
        console.log(`[Custom Image] Cleaned up old file: ${oldFile}`);
      } catch (e) {
        console.error(`[Custom Image] Failed to delete old file ${oldFile}:`, e);
      }
    }

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
