import { NextRequest, NextResponse } from "next/server";
import { getMediaById } from "@/lib/db";
import { downloadSubtitle } from "@/lib/opensubtitles";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaId, file_id, language } = body;

    if (!mediaId || !file_id || !language) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const media = getMediaById(parseInt(mediaId, 10));
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const videoDir = path.dirname(media.filepath);
    const videoBasename = path.basename(media.filepath, path.extname(media.filepath));
    
    // e.g., Movie.en.srt
    const savePath = path.join(videoDir, `${videoBasename}.${language}.srt`);

    await downloadSubtitle(file_id, savePath);

    return NextResponse.json({ success: true, path: savePath });
  } catch (err: any) {
    console.error("[Subtitle Download]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
