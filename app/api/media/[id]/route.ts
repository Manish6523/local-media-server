import { NextResponse } from "next/server";
import { getMediaById, upsertMedia } from "@/lib/db";
import { fetchOMDB } from "@/lib/omdb";
import { getBackdropForMovie, getBackdropForShow } from "@/lib/fanart";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ success: false, error: "Invalid title" }, { status: 400 });
    }

    const existing = getMediaById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Media not found" }, { status: 404 });
    }

    console.log(`[Edit Title] User edited title for ID ${id} to: "${title}"`);

    // Refetch OMDB with the new title
    const omdbData = await fetchOMDB(title, existing.type, existing.year);

    // Refetch Fanart.tv backdrop
    let backdropResult = null;
    if (omdbData?.omdb_id) {
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
      omdb_id: omdbData?.omdb_id || null,
      poster: omdbData?.poster || null,
      backdrop: backdropResult?.backdropPath || existing.backdrop || null,
      backdrop_url: backdropResult?.backdropUrl || existing.backdrop_url || null,
      overview: omdbData?.overview || null,
      rating: omdbData?.rating || null,
      genres: omdbData?.genres || null,
      runtime: omdbData?.runtime || null,
      fetched_at: omdbData ? new Date().toISOString() : null,
      omdb_confirmed: 1, // User manually confirmed/edited it
    });

    return NextResponse.json({ success: true, refetched: !!omdbData });
  } catch (err) {
    console.error("[Edit Title] Error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
