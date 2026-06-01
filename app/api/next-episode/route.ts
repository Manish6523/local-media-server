import { NextRequest, NextResponse } from "next/server";
import { getAllMedia, getMediaById } from "@/lib/db";

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

    const all = getAllMedia();
    
    // Try same season, next episode
    const nextInSeason = all.find(m => 
      m.type === 'show' && m.title === current.title && m.season === current.season &&
      m.episode_start === ((current.episode_end || current.episode_start || 0) + 1) &&
      m.available === 1
    );

    if (nextInSeason) {
      return NextResponse.json({ nextEpisode: nextInSeason });
    }

    // Try next season, episode 1
    const nextSeason = all.find(m =>
      m.type === 'show' && m.title === current.title && m.season === ((current.season || 0) + 1) &&
      m.episode_start === 1 && m.available === 1
    );

    if (nextSeason) {
      return NextResponse.json({ nextEpisode: nextSeason });
    }

    return NextResponse.json({ nextEpisode: null });
  } catch (error) {
    console.error("[NextEpisode API] Error:", error);
    return NextResponse.json({ nextEpisode: null }, { status: 500 });
  }
}
