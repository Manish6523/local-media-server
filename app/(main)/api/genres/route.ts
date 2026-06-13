import { NextResponse } from "next/server";
import { getAllMedia } from "@/lib/db";

export async function GET() {
  try {
    const all = getAllMedia();
    const rows = all.filter(m => m.genres && m.genres.trim() !== "");

    const genreSet = new Set<string>();
    for (const row of rows) {
      if (!row.genres) continue;
      const parts = row.genres.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) genreSet.add(trimmed);
      }
    }

    const sorted = [...genreSet].sort();
    return NextResponse.json(sorted);
  } catch (error) {
    console.error("[Genres API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
