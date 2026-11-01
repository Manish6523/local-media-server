import { NextResponse } from "next/server";
import { getAllMedia, getShowOfflineMedia } from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET() {
  try {
    const showOffline = getShowOfflineMedia();
    let all = getAllMedia();
    if (!showOffline) all = all.filter(m => m.available === 1);
    const continueWatching = all
      .filter(m => m.watch_progress > 0 && m.is_watched === 0)
      .sort((a, b) => new Date(b.last_watched_at || 0).getTime() - new Date(a.last_watched_at || 0).getTime())
      .slice(0, 6);

    return NextResponse.json(continueWatching, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to fetch continue watching:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
