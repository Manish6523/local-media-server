import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT DISTINCT genres FROM media WHERE genres IS NOT NULL AND genres != ''").all() as { genres: string }[];

    const genreSet = new Set<string>();
    for (const row of rows) {
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
