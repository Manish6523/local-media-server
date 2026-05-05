import { NextResponse } from "next/server";
import { getDb, MediaEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    
    // Get media where watch progress > 0 AND is_watched = 0
    // Sort by last watched, limit to 6
    const continueWatching = db.prepare(`
      SELECT * FROM media 
      WHERE watch_progress > 0 AND is_watched = 0 
      ORDER BY last_watched_at DESC 
      LIMIT 6
    `).all() as MediaEntry[];

    return NextResponse.json(continueWatching);
  } catch (error) {
    console.error("Failed to fetch continue watching:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
