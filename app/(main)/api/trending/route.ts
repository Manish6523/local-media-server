import { NextRequest, NextResponse } from "next/server";
import { getTrendingMovies, getTrendingShows } from "@/lib/2embed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = searchParams.get("window") || "day";

    const [movieData, tvData] = await Promise.all([
      getTrendingMovies(timeWindow as any),
      getTrendingShows(timeWindow as any)
    ]);

    return NextResponse.json({
      movies: movieData || [],
      shows: tvData || []
    });
  } catch (err) {
    console.error("[Trending API] Error:", err);
    return NextResponse.json({ movies: [], shows: [] }, { status: 500 });
  }
}
