import { NextRequest, NextResponse } from "next/server";
import { getOnlineDetails } from "@/lib/2embed";
import { fetchTVMazeShowByIMDB } from "@/lib/tvmaze";
import { getBackdropForShow } from "@/lib/fanart";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imdb = searchParams.get("imdb");
    const type = searchParams.get("type") as "movie" | "show" | null;

    if (!imdb || !type) {
      return NextResponse.json({ error: "Missing imdb or type parameter" }, { status: 400 });
    }

    let details = await getOnlineDetails(imdb, type);
    if (!details) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (type === "show") {
      const tvmazeData = await fetchTVMazeShowByIMDB(imdb);
      if (tvmazeData) {
        let fanartBg = null;
        if (tvmazeData.omdb_id) {
          fanartBg = await getBackdropForShow(tvmazeData.omdb_id);
        }

        details = {
          ...details,
          overview: tvmazeData.overview || details.overview,
          genres: tvmazeData.genres || details.genres,
          rating: tvmazeData.rating || details.rating,
          runtime: tvmazeData.runtime || details.runtime,
          poster: tvmazeData.poster || details.poster,
          backdrop: fanartBg?.backdropPath || tvmazeData.backdrop || details.backdrop,
          backdrop_url: fanartBg?.backdropUrl || tvmazeData.backdrop_url || details.backdrop_url,
          // Attach tvmaze_id so the frontend can use it to fetch episodes
          tvmaze_id: tvmazeData.tvmaze_id,
        } as any;
      }
    }

    return NextResponse.json(details);
  } catch (err) {
    console.error("[Online Details API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
