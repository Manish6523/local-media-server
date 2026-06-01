import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import { getMediaById } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── VAAPI Config ────────────────────────────────────────────────
const VAAPI_DEVICE = "/dev/dri/renderD128";

// Read the cached probe result from server.ts startup
function isVaapiAvailable(): boolean {
  return globalThis.__vaapiAvailable === true;
}

// ─── FFmpeg Arg Builders ─────────────────────────────────────────
// Critical: argument order matters for VAAPI!
//   -hwaccel → -hwaccel_device → -ss → -i → -map → -c:v → -c:a → -f → pipe:1

function buildVaapiArgs(filepath: string, start: number, audioTrack: number): string[] {
  return [
    "-hide_banner",
    "-hwaccel", "vaapi",
    "-hwaccel_device", VAAPI_DEVICE,
    "-hwaccel_output_format", "vaapi",
    ...(start > 0 ? ["-ss", start.toString()] : []),
    "-i", filepath,
    "-map", "0:v:0",
    "-map", `0:a:${audioTrack}`,
    "-vf", "scale_vaapi=format=nv12",
    "-c:v", "h264_vaapi",
    "-qp", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov+faststart",
    "pipe:1",
  ];
}

function buildCpuArgs(filepath: string, start: number, audioTrack: number): string[] {
  return [
    "-hide_banner",
    ...(start > 0 ? ["-ss", start.toString()] : []),
    "-i", filepath,
    "-map", "0:v:0",
    "-map", `0:a:${audioTrack}`,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov+faststart",
    "-threads", "0",
    "pipe:1",
  ];
}

// ─── Route Handler ───────────────────────────────────────────────
// Every request gets its OWN independent FFmpeg process.
// No session sharing, no session Map, no joining.
// Watch party sync is handled by Socket.io seek events, NOT shared streams.

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

    // Determine encoding strategy from cached startup probe
    const useVaapi = isVaapiAvailable();
    const args = useVaapi
      ? buildVaapiArgs(filepath, start, audioTrack)
      : buildCpuArgs(filepath, start, audioTrack);

    const encoderLabel = useVaapi ? "VAAPI" : "CPU";
    console.log(`[Transcode] Spawning ${encoderLabel} process for media ${id} @ ${start}s`);

    const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });

    // Log stderr errors (but not progress/info noise)
    ffmpeg.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line.includes("Error") || line.includes("error") || line.includes("Invalid")) {
        console.error(`[Transcode/${encoderLabel}] ${line}`);
      }
    });

    // Kill FFmpeg when the client disconnects
    request.signal.addEventListener("abort", () => {
      try {
        ffmpeg.kill("SIGTERM");
      } catch { /* already dead */ }
    });

    // Create a ReadableStream that pipes FFmpeg stdout to the response
    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        ffmpeg.stdout?.on("data", (chunk: Buffer) => {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            // Controller closed (client gone), kill ffmpeg
            try { ffmpeg.kill("SIGTERM"); } catch { /* */ }
          }
        });

        ffmpeg.stdout?.on("end", () => {
          try { controller.close(); } catch { /* already closed */ }
        });

        ffmpeg.on("error", () => {
          try { controller.close(); } catch { /* already closed */ }
        });

        ffmpeg.on("close", () => {
          try { controller.close(); } catch { /* already closed */ }
        });
      },
      cancel() {
        // Client disconnected — kill the FFmpeg process
        try { ffmpeg.kill("SIGTERM"); } catch { /* already dead */ }
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
