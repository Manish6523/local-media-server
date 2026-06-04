import { NextRequest, NextResponse } from "next/server";
import { searchMedia } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const results = searchMedia(query);

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
