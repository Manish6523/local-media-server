import { NextRequest, NextResponse } from "next/server";
import { fetchTVMazeShowByIMDB, fetchTVMazeEpisodes } from "@/lib/tvmaze";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ imdb: string }> }) {
  try {
    const { imdb } = await params;
    
    if (!imdb) {
      return NextResponse.json({ error: "Missing imdb parameter" }, { status: 400 });
    }

    const show = await fetchTVMazeShowByIMDB(imdb);
    
    if (!show || !show.tvmaze_id) {
      return NextResponse.json({ error: "Show not found on TVMaze" }, { status: 404 });
    }

    const episodes = await fetchTVMazeEpisodes(show.tvmaze_id);
    return NextResponse.json(episodes);
  } catch (err) {
    console.error("[TVMaze Episodes API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
