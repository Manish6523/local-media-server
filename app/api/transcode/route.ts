import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import { getMediaById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const audioTrack = parseInt(searchParams.get("audioTrack") || "0", 10);
    const start = parseFloat(searchParams.get("start") || "0");

    if (!id) {
      return new NextResponse("Missing id parameter", { status: 400 });
    }

    const media = getMediaById(parseInt(id, 10));
    if (!media) {
      return new NextResponse("Media not found", { status: 404 });
    }

    if (!media.available) {
      return new NextResponse("File not available (HDD disconnected)", { status: 404 });
    }

    const filepath = media.filepath;
    if (!fs.existsSync(filepath)) {
      return new NextResponse("File not found on disk", { status: 404 });
    }

    const ffmpegArgs = [
      ...(start > 0 ? ["-ss", start.toString()] : []),
      "-i", filepath,
      "-map", "0:v:0",
      "-map", `0:a:${audioTrack}`,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "frag_keyframe+empty_moov+faststart",
      "-f", "mp4",
      "-threads", "0",
      "pipe:1",
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    ffmpeg.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line.includes("Error") || line.includes("error")) {
        console.error(`[Transcode] FFmpeg error: ${line}`);
      }
    });

    const webStream = new ReadableStream({
      start(controller) {
        ffmpeg.stdout?.on("data", (chunk: Buffer) => {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            // Controller may be closed if client disconnected
          }
        });
        ffmpeg.stdout?.on("end", () => {
          try { controller.close(); } catch { /* already closed */ }
        });
        ffmpeg.stdout?.on("error", (err) => {
          console.error("[Transcode] Stream error:", err);
          try { controller.error(err); } catch { /* already closed */ }
        });
        ffmpeg.on("error", (err) => {
          console.error("[Transcode] FFmpeg process error:", err);
          try { controller.error(err); } catch { /* already closed */ }
        });
      },
      cancel() {
        ffmpeg.kill("SIGTERM");
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("[Transcode] Error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
