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
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const recent = all
      .filter(m => m.created_at && new Date(m.created_at).getTime() > sevenDaysAgo)
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
    const grouped = new Map<string, MediaEntry & { episode_count: number }>();
    for (const m of recent) {
      const key = `${m.type}-${m.title}`;
      if (!grouped.has(key)) {
        grouped.set(key, { ...m, episode_count: 1 });
      } else {
        grouped.get(key)!.episode_count++;
      }
    }
    
    const recentlyAdded = Array.from(grouped.values()).slice(0, 6);

    return NextResponse.json(recentlyAdded);
  } catch (error) {
    console.error("Failed to fetch recently added:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
