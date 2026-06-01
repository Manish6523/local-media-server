import { NextRequest, NextResponse } from "next/server";
import { getDb, getMediaById } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ nextEpisode: null }, { status: 400 });
  }

  try {
    const current = getMediaById(parseInt(id));
    if (!current || current.type !== "show") {
      return NextResponse.json({ nextEpisode: null });
    }

    const db = getDb();

    // Try same season, next episode
    const nextInSeason = db.prepare(
      `SELECT * FROM media 
       WHERE type = 'show' AND title = ? AND season = ? AND episode_start = ? AND available = 1
       ORDER BY episode_start ASC LIMIT 1`
    ).get(current.title, current.season, (current.episode_end || current.episode_start || 0) + 1);

    if (nextInSeason) {
      return NextResponse.json({ nextEpisode: nextInSeason });
    }

    // Try next season, episode 1
    const nextSeason = db.prepare(
      `SELECT * FROM media 
       WHERE type = 'show' AND title = ? AND season = ? AND episode_start = 1 AND available = 1
       ORDER BY episode_start ASC LIMIT 1`
    ).get(current.title, (current.season || 0) + 1);

    if (nextSeason) {
      return NextResponse.json({ nextEpisode: nextSeason });
    }

    return NextResponse.json({ nextEpisode: null });
  } catch (error) {
    console.error("[NextEpisode API] Error:", error);
    return NextResponse.json({ nextEpisode: null }, { status: 500 });
  }
}
