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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 40;

    let results = [];
    if (mode === "online") {
      if (discoverEnabled) {
        const [movies, shows] = await Promise.all([
          searchOnline(query, page, "movie"),
          searchOnline(query, page, "show")
        ]);
        
        // Interleave movies and shows so highly relevant shows aren't buried under movies
        const maxLength = Math.max(movies.length, shows.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < shows.length) results.push(shows[i]);
          if (i < movies.length) results.push(movies[i]);
        }
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

    const startIndex = (page - 1) * limit;
    const paginated = mode === "local" ? deduped.slice(startIndex, startIndex + limit) : deduped.slice(0, limit);

    return NextResponse.json(paginated);
  } catch (err) {
    console.error("[Search] Error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
