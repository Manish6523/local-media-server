import { NextResponse } from "next/server";
import { getAllMedia, MediaEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = getAllMedia();
    const continueWatching = all
      .filter(m => m.watch_progress > 0 && m.is_watched === 0)
      .sort((a,b) => new Date(b.last_watched_at || 0).getTime() - new Date(a.last_watched_at || 0).getTime())
      .slice(0, 6);

    return NextResponse.json(continueWatching);
  } catch (error) {
    console.error("Failed to fetch continue watching:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
