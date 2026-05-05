import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, currentTime, duration } = body;

    if (!id || currentTime === undefined || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    
    // Calculate if it's fully watched (90%+)
    const isWatched = currentTime >= duration * 0.9 ? 1 : 0;

    // We only update if progress > 5 seconds, to prevent accidental click saves
    if (currentTime < 5) {
      return NextResponse.json({ success: true, ignored: true });
    }

    db.prepare(`
      UPDATE media 
      SET last_watched_at = CURRENT_TIMESTAMP,
          watch_progress = ?,
          is_watched = ?
      WHERE id = ?
    `).run(Math.floor(currentTime), isWatched, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update watch progress:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
