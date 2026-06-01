import { NextResponse } from "next/server";
import { getAllMedia, MediaEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = getAllMedia();
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
