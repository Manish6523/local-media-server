import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { FFMPEG } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

/**
 * Convert SRT content to WebVTT format on the fly.
 * - Adds "WEBVTT" header
 * - Replaces comma in timestamps with period (00:00:01,000 → 00:00:01.000)
 */
function srtToVtt(srtContent: string): string {
  let vtt = "WEBVTT\n\n";
  // Replace commas in timestamps with periods
  const converted = srtContent
    .replace(/\r\n/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  vtt += converted;
  return vtt;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    const start = parseFloat(searchParams.get("start") || "0");

    if (!filePath) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    // Security: ensure the path doesn't escape media directories
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return new NextResponse("Subtitle file not found", { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();

    // If a start offset is provided, use FFmpeg to shift the subtitle timestamps on the fly
    if (start > 0) {
      const ffmpegArgs = [
        "-v", "quiet",
        "-ss", start.toString(),
        "-i", resolved,
        "-f", "webvtt",
        "pipe:1"
      ];

      const ffmpeg = spawn(FFMPEG, ffmpegArgs, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const webStream = new ReadableStream({
        start(controller) {
          ffmpeg.stdout.on("data", (chunk: Buffer) => {
            try { controller.enqueue(new Uint8Array(chunk)); } catch {}
          });
          ffmpeg.stdout.on("end", () => {
            try { controller.close(); } catch {}
          });
          ffmpeg.on("error", (err) => {
            console.error("[SubtitleFile] FFmpeg error:", err);
            try { controller.error(err); } catch {}
          });
        },
        cancel() {
          ffmpeg.kill("SIGKILL");
        },
      });

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600"
        },
      });
    }

    const content = fs.readFileSync(resolved, "utf-8");

    if (ext === ".vtt") {
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (ext === ".srt") {
      const vttContent = srtToVtt(content);
      return new NextResponse(vttContent, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // For .ass/.ssa/.sub — serve as plain text (limited browser support)
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[SubtitleFile] Error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: "Subtitle file not found" }, { status: 404 });
    }

    // Only allow deleting subtitle extensions
    const ext = path.extname(resolved).toLowerCase();
    if (![".srt", ".vtt", ".ass", ".ssa", ".sub"].includes(ext)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 403 });
    }

    fs.unlinkSync(resolved);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SubtitleFile] Error deleting:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
