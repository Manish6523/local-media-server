import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getMediaById } from "@/lib/db";
import { FFPROBE } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
}

// Common language codes from filename suffixes
const LANG_MAP: Record<string, string> = {
  en: "English", eng: "English", hi: "Hindi", hin: "Hindi",
  es: "Spanish", spa: "Spanish", fr: "French", fre: "French",
  de: "German", ger: "German", it: "Italian", ita: "Italian",
  ja: "Japanese", jpn: "Japanese", ko: "Korean", kor: "Korean",
  pt: "Portuguese", por: "Portuguese", ru: "Russian", rus: "Russian",
  ar: "Arabic", ara: "Arabic", zh: "Chinese", chi: "Chinese",
};

function getLanguageLabel(langCode: string | undefined): string {
  if (!langCode || langCode === "und") return "Unknown";
  return LANG_MAP[langCode.toLowerCase()] || langCode.charAt(0).toUpperCase() + langCode.slice(1);
}

/**
 * Detect language from subtitle filename.
 * e.g. "Movie.en.srt" → { language: "en", label: "English" }
 */
function detectLanguage(filename: string): { language: string; label: string } {
  const noExt = filename.replace(/\.(srt|vtt|ass|ssa|sub)$/i, "");
  const parts = noExt.split(".");
  const lastPart = parts[parts.length - 1]?.toLowerCase();

  if (lastPart && LANG_MAP[lastPart]) {
    return { language: lastPart.length === 3 ? lastPart.substring(0, 2) : lastPart, label: LANG_MAP[lastPart] };
  }

  const hyphenParts = noExt.split("-");
  const lastHyphen = hyphenParts[hyphenParts.length - 1]?.toLowerCase();
  if (lastHyphen && LANG_MAP[lastHyphen]) {
    return { language: lastHyphen.length === 3 ? lastHyphen.substring(0, 2) : lastHyphen, label: LANG_MAP[lastHyphen] };
  }

  return { language: "und", label: "Default" };
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

    const subtitles: SubtitleTrack[] = [];

    // 1. Extract embedded subtitles via ffprobe
    if (fs.existsSync(media.filepath)) {
      try {
        const output = execSync(
          `"${FFPROBE}" -v quiet -print_format json -show_streams -select_streams s "${media.filepath}"`,
          { encoding: "utf-8", timeout: 15000 }
        );
        const result = JSON.parse(output);
        const streams = result.streams || [];

        streams.forEach((stream: any) => {
          const lang = stream.tags?.language || "und";
          const title = stream.tags?.title;
          const langLabel = getLanguageLabel(lang);
          const label = title ? `${langLabel} (${title})` : langLabel;
          
          subtitles.push({
            label: `[Embedded] ${label}`,
            language: lang === "und" ? "und" : lang.substring(0, 2),
            url: `/api/subtitle-stream?id=${media.id}&track=${stream.index}`,
          });
        });
      } catch (err) {
        console.error("[Subtitles] ffprobe error:", err);
      }
    }

    const videoDir = path.dirname(media.filepath);
    const videoBasename = path.basename(media.filepath, path.extname(media.filepath));

    if (!fs.existsSync(videoDir)) {
      return NextResponse.json(subtitles);
    }

    try {
      const files = fs.readdirSync(videoDir);
      const subtitleExts = [".srt", ".vtt", ".ass", ".ssa", ".sub"];

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!subtitleExts.includes(ext)) continue;

        const fileBase = path.basename(file, ext);

        // Match: exact name, or name starts with video basename
        // e.g. "Movie.srt", "Movie.en.srt", "Movie.hi.srt"
        if (
          fileBase === videoBasename ||
          fileBase.startsWith(videoBasename + ".") ||
          fileBase.startsWith(videoBasename + "-")
        ) {
          const { language, label } = detectLanguage(file);
          const fullPath = path.join(videoDir, file);
          subtitles.push({
            label: `${label} (${file})`,
            language,
            url: `/api/subtitle-file?path=${encodeURIComponent(fullPath)}`,
          });
        }
      }

      // If no name-matched subtitles found, include ALL subtitle files in the directory
      if (subtitles.length === 0) {
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (!subtitleExts.includes(ext)) continue;

          const { language, label } = detectLanguage(file);
          const fullPath = path.join(videoDir, file);
          subtitles.push({
            label: `${label} (${file})`,
            language,
            url: `/api/subtitle-file?path=${encodeURIComponent(fullPath)}`,
          });
        }
      }
    } catch (err) {
      console.error("[Subtitles] Error reading directory:", err);
    }

    return NextResponse.json(subtitles);
  } catch (err) {
    console.error("[Subtitles] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
