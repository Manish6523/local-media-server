import { NextRequest, NextResponse } from "next/server";
import { searchMedia, getShowOfflineMedia, getConfig } from "@/lib/db";
import { searchOnline } from "@/lib/2embed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const mode = searchParams.get("mode") || "local";
    const discoverEnabled = getConfig("show_discover_tab") === "true";

    let results = [];
    if (mode === "online") {
      if (discoverEnabled) {
        const [movies, shows] = await Promise.all([
          searchOnline(query, 1, "movie"),
          searchOnline(query, 1, "show")
        ]);
        results = [...movies, ...shows];
      } else {
        return NextResponse.json([]);
      }
    } else {
      results = searchMedia(query);
      if (!getShowOfflineMedia()) results = results.filter(m => m.available === 1);
    }

    // Deduplicate shows — return one entry per unique title
    const seen = new Set<string>();
    const deduped = results.filter((item) => {
      if (item.type === "movie") return true;
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json(deduped.slice(0, 20));
  } catch (err) {
    console.error("[Search] Error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
