import { NextRequest, NextResponse } from "next/server";
import { getAllMedia, getShowOfflineMedia } from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(request: NextRequest) {
  try {
    const showOffline = getShowOfflineMedia();
    let all = getAllMedia();
    if (!showOffline) all = all.filter(m => m.available === 1);
    const favorites = all.filter(m => m.is_favorite === 1);

    return NextResponse.json(favorites, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
