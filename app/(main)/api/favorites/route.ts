import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getAllMedia, MediaEntry, getShowOfflineMedia, getConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    
    const showOffline = getShowOfflineMedia();
    const hddPath = getConfig("hdd_path");
    const hddConnected = hddPath ? fs.existsSync(hddPath) : false;

    let all = getAllMedia();
    all = all.map(item => ({
      ...item,
      available: item.source === 'hdd' ? (hddConnected ? 1 : 0) : 1
    }));
    if (!showOffline) all = all.filter(m => m.available === 1);
    const favorites = all.filter(m => m.is_favorite === 1);

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
