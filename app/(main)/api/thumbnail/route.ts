import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import { getMediaById } from "@/lib/db";
import { FFMPEG } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const timeStr = searchParams.get("time");

    if (!id || !timeStr) {
      return new NextResponse("Missing id or time parameter", { status: 400 });
    }

    const time = parseFloat(timeStr);
    if (isNaN(time) || time < 0) {
      return new NextResponse("Invalid time", { status: 400 });
    }

    const mediaId = parseInt(id, 10);
    // Ignore online media sources (negative IDs or whatever format)
    if (mediaId < 0) {
      return new NextResponse("Online media unsupported", { status: 400 });
    }

    const media = getMediaById(mediaId);
    if (!media || !media.available || !media.filepath || !fs.existsSync(media.filepath)) {
      return new NextResponse("Media not found or unavailable", { status: 404 });
    }

    // Spawn ffmpeg to extract a single frame at the given time and output to stdout
    const ffmpegProcess = spawn(
      FFMPEG,
      [
        "-ss", time.toString(),
        "-i", media.filepath,
        "-vframes", "1",
        "-f", "image2",
        "-vcodec", "mjpeg",
        "-q:v", "2", // Good quality
        "-vf", "scale=320:-1", // Resize to width 320 to save bandwidth/compute
        "pipe:1" // Output to stdout
      ],
      { stdio: ["ignore", "pipe", "ignore"] } // Ignore stdin/stderr, pipe stdout
    );

    // Convert child_process stdout to a ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        ffmpegProcess.stdout.on("data", (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        ffmpegProcess.stdout.on("end", () => {
          controller.close();
        });
        ffmpegProcess.stdout.on("error", (err) => {
          controller.error(err);
          ffmpegProcess.kill();
        });
      },
      cancel() {
        ffmpegProcess.kill();
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache in browser for 24 hours
      },
    });
  } catch (err) {
    console.error("[Thumbnail API] Error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
