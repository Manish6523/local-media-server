import { NextRequest, NextResponse } from "next/server";
import { getOnlineDetails } from "@/lib/2embed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imdb = searchParams.get("imdb");
    const type = searchParams.get("type") as "movie" | "show" | null;

    if (!imdb || !type) {
      return NextResponse.json({ error: "Missing imdb or type parameter" }, { status: 400 });
    }

    const details = await getOnlineDetails(imdb, type);
    if (!details) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (err) {
    console.error("[Online Details API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
