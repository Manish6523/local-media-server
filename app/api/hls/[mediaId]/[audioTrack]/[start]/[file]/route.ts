import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { getMediaById } from "@/lib/db";

export const dynamic = "force-dynamic";

const VAAPI_DEVICE = "/dev/dri/renderD128";
const CACHE_BASE = "/tmp/filmaro-cache";

// Ensure base cache dir exists
if (!fs.existsSync(CACHE_BASE)) {
  fs.mkdirSync(CACHE_BASE, { recursive: true });
}

// Global registry of active transcode processes
interface ActiveTranscode {
  ffmpeg: ChildProcess;
  lastAccessed: number;
  dir: string;
}

const activeTranscodes = new Map<string, ActiveTranscode>();

// Cleanup routine: check every minute, kill processes not accessed in 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, transcode] of activeTranscodes.entries()) {
    if (now - transcode.lastAccessed > 10 * 60 * 1000) {
      console.log(`[HLS] Cleaning up inactive transcode: ${key}`);
      try { transcode.ffmpeg.kill("SIGTERM"); } catch { }
      activeTranscodes.delete(key);
      // We keep the files for a while, or we could delete them here.
      // The prompt says "preserve the written segments for 10 minutes before running a filesystem purge."
      // Since it's been 10 mins, let's purge.
      try { fs.rmSync(transcode.dir, { recursive: true, force: true }); } catch { }
    }
  }
}, 60 * 1000);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string; audioTrack: string; start: string; file: string }> }
) {
  try {
    const { mediaId, audioTrack, start, file } = await params;
    const mediaIdNum = parseInt(mediaId, 10);
    const trackNum = parseInt(audioTrack, 10);
    const startSec = parseFloat(start);

    if (isNaN(mediaIdNum) || isNaN(trackNum) || isNaN(startSec) || !file) {
      return new NextResponse("Invalid parameters", { status: 400 });
    }

    const media = getMediaById(mediaIdNum);
    if (!media) {
      return new NextResponse("Media not found", { status: 404 });
    }

    if (!media.available || !fs.existsSync(media.filepath)) {
      return new NextResponse("File not available", { status: 404 });
    }

    const streamKey = `${mediaId}_${audioTrack}_${startSec}`;
    const outDir = path.join(CACHE_BASE, streamKey);
    const requestedFilePath = path.join(outDir, file);

    // Update last accessed time if process is active
    const active = activeTranscodes.get(streamKey);
    if (active) {
      active.lastAccessed = Date.now();
    }

    // If it's a request for the playlist, and it doesn't exist, start FFmpeg
    if (file === "playlist.m3u8") {
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      if (!active && !fs.existsSync(requestedFilePath)) {
        console.log(`[HLS] Spawning VAAPI segmenter for ${streamKey}`);
        
        // Use the exact FFmpeg command order for AMD VAAPI
        const ffmpegArgs = [
          "-hide_banner",
          "-hwaccel", "vaapi",
          "-hwaccel_device", VAAPI_DEVICE,
          "-hwaccel_output_format", "vaapi",
          "-ss", startSec.toString(),
          "-i", media.filepath,
          "-map", "0:V:0",
          "-map", `0:a:${trackNum}`,
          "-vf", "scale_vaapi=w=-2:h=-2:format=nv12",
          "-c:v", "h264_vaapi",
          "-qp", "26",
          "-c:a", "aac",
          "-b:a", "128k",
          "-sn",
          "-f", "hls",
          "-hls_time", "3",
          "-hls_playlist_type", "event",
          "-hls_segment_filename", path.join(outDir, "seg_%03d.ts"),
          requestedFilePath
        ];

        const ffmpeg = spawn("ffmpeg", ffmpegArgs, { stdio: ["ignore", "pipe", "pipe"] });
        
        ffmpeg.stderr.on("data", (data: Buffer) => {
          const line = data.toString().trim();
          if (line.includes("Error") || line.includes("error")) {
            console.error(`[HLS/FFmpeg] ${line}`);
          }
        });

        ffmpeg.on("close", () => {
          console.log(`[HLS] FFmpeg closed for ${streamKey}`);
          activeTranscodes.delete(streamKey);
        });

        activeTranscodes.set(streamKey, {
          ffmpeg,
          lastAccessed: Date.now(),
          dir: outDir
        });

        // Wait up to 10 seconds for the playlist to be created
        let attempts = 0;
        while (!fs.existsSync(requestedFilePath) && attempts < 50) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }

        if (!fs.existsSync(requestedFilePath)) {
          return new NextResponse("Timeout waiting for playlist generation", { status: 504 });
        }
      }
    }

    // Serve the requested file (.m3u8 or .ts)
    if (!fs.existsSync(requestedFilePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = fs.statSync(requestedFilePath);
    const stream = fs.createReadStream(requestedFilePath);
    
    let mimeType = "application/octet-stream";
    if (file.endsWith(".m3u8")) mimeType = "application/vnd.apple.mpegurl";
    if (file.endsWith(".ts")) mimeType = "video/MP2T";

    // nodeStreamToWeb utility function
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": file.endsWith(".m3u8") ? "no-cache, no-store" : "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[HLS] Error serving request:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
