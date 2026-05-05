import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import { getMediaById } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AudioStream {
  index: number;
  codec_name?: string;
  tags?: {
    language?: string;
    title?: string;
    handler_name?: string;
  };
}

interface FFProbeResult {
  streams?: AudioStream[];
}

const LANG_LABELS: Record<string, string> = {
  hin: "Hindi",
  eng: "English",
  spa: "Spanish",
  fre: "French",
  ger: "German",
  ita: "Italian",
  jpn: "Japanese",
  kor: "Korean",
  por: "Portuguese",
  rus: "Russian",
  ara: "Arabic",
  chi: "Chinese",
  und: "Unknown",
};

function getLanguageLabel(langCode: string | undefined): string {
  if (!langCode) return "Unknown";
  return LANG_LABELS[langCode] || langCode.charAt(0).toUpperCase() + langCode.slice(1);
}

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

    if (!fs.existsSync(media.filepath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
      // Run ffprobe to get audio streams
      const output = execSync(
        `ffprobe -v quiet -print_format json -show_streams -select_streams a "${media.filepath}"`,
        { encoding: "utf-8", timeout: 15000 }
      );

      const result: FFProbeResult = JSON.parse(output);
      const streams = result.streams || [];

      const audioTracks = streams.map((stream, idx) => {
        const language = stream.tags?.language || "und";
        const title = stream.tags?.title || stream.tags?.handler_name;
        const label = title || getLanguageLabel(language);

        return {
          index: idx,
          label,
          language: language === "und" ? "und" : language.substring(0, 2),
          codec: stream.codec_name || "unknown",
        };
      });

      return NextResponse.json(audioTracks);
    } catch (probeErr) {
      console.error("[AudioTracks] ffprobe error:", probeErr);
      // Return empty array if ffprobe fails
      return NextResponse.json([]);
    }
  } catch (err) {
    console.error("[AudioTracks] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
