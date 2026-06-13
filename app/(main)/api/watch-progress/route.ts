import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { playbackProgress } from "@/db/schema";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, currentTime, duration } = body;

    if (!id || currentTime === undefined || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = getDb();
    
    // Calculate if it's fully watched (90%+)
    const isWatched = currentTime >= duration * 0.9 ? 1 : 0;

    // We only update if progress > 5 seconds, to prevent accidental click saves
    if (currentTime < 5) {
      return NextResponse.json({ success: true, ignored: true });
    }

    db.update(playbackProgress).set({
      lastWatchedAt: new Date().toISOString(),
      watchProgress: Math.floor(currentTime),
      isWatched
    }).where(eq(playbackProgress.mediaAssetId, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update watch progress:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
