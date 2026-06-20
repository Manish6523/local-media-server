import { NextResponse } from "next/server";
import fs from "fs";
import { getAllMedia, MediaEntry, getShowOfflineMedia, getConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const showOffline = getShowOfflineMedia();
    const hddPath = getConfig("hdd_path");
    const hddConnected = hddPath ? fs.existsSync(hddPath) : false;

    let all = getAllMedia();
    all = all.map(item => ({
      ...item,
      available: item.source === 'hdd' ? (hddConnected ? 1 : 0) : 1
    }));
    if (!showOffline) all = all.filter(m => m.available === 1);
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
