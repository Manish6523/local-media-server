import { NextRequest, NextResponse } from "next/server";
import { getMediaById } from "@/lib/db";
import { searchSubtitles } from "@/lib/opensubtitles";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const media = getMediaById(parseInt(id, 10));
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const filename = path.basename(media.filepath);
    const results = await searchSubtitles(filename);

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("[Subtitle Search]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
