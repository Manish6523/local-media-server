import { NextResponse } from "next/server";
import { getDb, MediaEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    
    // We need logic to group shows by title and just show latest poster
    // SQLite doesn't have a simple row_number window function in older versions, 
    // but better-sqlite3 uses the system sqlite which usually supports it.
    // An alternative is using GROUP BY and MAX(created_at)
    
    const recentlyAdded = db.prepare(`
      SELECT 
        id, filepath, filename, source, type, title, year, season, episode_start, episode_end,
        omdb_id, poster, overview, rating, genres, runtime, available, fetched_at, MAX(created_at) as created_at,
        last_watched_at, watch_progress, is_watched, is_favorite,
        COUNT(*) as episode_count
      FROM media
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY title, type
      ORDER BY created_at DESC
      LIMIT 6
    `).all() as (MediaEntry & { episode_count: number })[];

    return NextResponse.json(recentlyAdded);
  } catch (error) {
    console.error("Failed to fetch recently added:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
