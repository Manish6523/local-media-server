import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import { getConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "both";

    const { sqliteDb } = getDb();
    const hddPath = getConfig("hdd_path");
    const hddConnected = hddPath ? fs.existsSync(hddPath) : false;

    // Build the query based on the normalized schema:
    // For movies: media_assets JOIN movies JOIN playback_progress
    // For shows: media_assets JOIN episodes JOIN tv_shows JOIN playback_progress
    // We need to pick one random UNWATCHED item

    let rows: Array<{ title: string; type: string; source: string }> = [];

    if (type === "movie" || type === "both") {
      const movieRows = sqliteDb.prepare(`
        SELECT m.title, ma.type, ma.source
        FROM media_assets ma
        JOIN movies m ON m.media_asset_id = ma.id
        LEFT JOIN playback_progress pp ON pp.media_asset_id = ma.id
        WHERE ma.available = 1
          AND (pp.is_watched = 0 OR pp.is_watched IS NULL)
      `).all() as Array<{ title: string; type: string; source: string }>;
      rows.push(...movieRows);
    }

    if (type === "show" || type === "both") {
      // For shows, we deduplicate by show title so we don't pick
      // the same show multiple times from different episodes.
      // Pick shows that have at least one unwatched episode.
      const showRows = sqliteDb.prepare(`
        SELECT DISTINCT ts.title, 'show' as type, ma.source
        FROM media_assets ma
        JOIN episodes e ON e.media_asset_id = ma.id
        JOIN tv_shows ts ON ts.id = e.show_id
        LEFT JOIN playback_progress pp ON pp.media_asset_id = ma.id
        WHERE ma.available = 1
          AND (pp.is_watched = 0 OR pp.is_watched IS NULL)
        GROUP BY ts.title
      `).all() as Array<{ title: string; type: string; source: string }>;
      rows.push(...showRows);
    }

    // Filter out HDD items if HDD is not connected
    rows = rows.filter(r => {
      if (r.source === "hdd" && !hddConnected) return false;
      return true;
    });

    if (rows.length === 0) {
      return NextResponse.json({ found: false, type });
    }

    // Pick a random item
    const result = rows[Math.floor(Math.random() * rows.length)];

    // Build the slug the same way PosterCard does
    const slug = encodeURIComponent(
      result.title.toLowerCase().replace(/\s+/g, "-")
    );
    const href = result.type === "show"
      ? `/shows/${slug}`
      : `/movies/${slug}`;

    return NextResponse.json({
      found: true,
      href,
      title: result.title,
      type: result.type,
    });
  } catch (err) {
    console.error("[Shuffle API] Error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
