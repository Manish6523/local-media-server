import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import { getMediaById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const track = parseInt(searchParams.get("track") || "0", 10);
    const start = parseFloat(searchParams.get("start") || "0");

    if (!id) {
      return new NextResponse("Missing id parameter", { status: 400 });
    }

    const media = getMediaById(parseInt(id, 10));
    if (!media) {
      return new NextResponse("Media not found", { status: 404 });
    }

    if (!fs.existsSync(media.filepath)) {
      return new NextResponse("File not found on disk", { status: 404 });
    }

    // Use FFmpeg to extract subtitle track and output as WebVTT, shifting timestamps if start > 0
    const ffmpegArgs = [
      "-v", "quiet",
      ...(start > 0 ? ["-ss", start.toString()] : []),
      "-i", media.filepath,
      "-map", `0:${track}`,
      "-f", "webvtt",
      "pipe:1"
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const webStream = new ReadableStream({
      start(controller) {
        ffmpeg.stdout.on("data", (chunk: Buffer) => {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            // Controller might be closed
          }
        });
        ffmpeg.stdout.on("end", () => {
          try { controller.close(); } catch {}
        });
        ffmpeg.on("error", (err) => {
          console.error("[SubtitleStream] FFmpeg error:", err);
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
  } catch (err) {
    console.error("[SubtitleStream] Error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
