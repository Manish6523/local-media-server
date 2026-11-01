import { NextRequest, NextResponse } from "next/server";
import { getAllMedia, getShowOfflineMedia } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const showOffline = getShowOfflineMedia();
    let all = getAllMedia();
    if (!showOffline) all = all.filter(m => m.available === 1);
    const favorites = all.filter(m => m.is_favorite === 1);

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
