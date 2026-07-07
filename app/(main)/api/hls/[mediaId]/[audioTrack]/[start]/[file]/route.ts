import { NextRequest, NextResponse } from "next/server";
import { spawn, execSync, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { getMediaById } from "@/lib/db";
import { getDetectedGPU, type GPUCapability } from "@/lib/gpu-detect";

export const dynamic = "force-dynamic";
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

// Cache ffprobe pixel format results per filepath to avoid re-probing
const pixelFormatCache = new Map<string, boolean>();
// Cache audio codec results per filepath+track to avoid re-probing
const audioCodecCache = new Map<string, string>();

function detect10bit(filepath: string): boolean {
  const cached = pixelFormatCache.get(filepath);
  if (cached !== undefined) return cached;

  try {
    const probeResult = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${filepath}"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const streams = JSON.parse(probeResult).streams;
    const videoStream = streams?.find((s: any) => s.codec_type === 'video');
    const is10bit = videoStream?.pix_fmt?.includes('10le') ||
                    videoStream?.pix_fmt?.includes('10be') ||
                    videoStream?.profile?.toLowerCase()?.includes('10') || false;
    pixelFormatCache.set(filepath, is10bit);
    return is10bit;
  } catch (err) {
    console.error('[HLS] ffprobe failed, assuming 8-bit:', err);
    pixelFormatCache.set(filepath, false);
    return false;
  }
}

function detectAudioCodec(filepath: string, trackNum: number): string {
  const cacheKey = `${filepath}:${trackNum}`;
  const cached = audioCodecCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const probeResult = execSync(
      `ffprobe -v quiet -print_format json -show_streams -select_streams a "${filepath}"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const audioStreams = JSON.parse(probeResult).streams;
    const track = audioStreams?.[trackNum];
    const codec = (track?.codec_name || 'unknown').toLowerCase();
    audioCodecCache.set(cacheKey, codec);
    return codec;
  } catch (err) {
    console.error('[HLS] ffprobe audio detection failed:', err);
    audioCodecCache.set(cacheKey, 'unknown');
    return 'unknown';
  }
}

// ─── Dynamic HLS FFmpeg Arg Builder ──────────────────────────────

function buildHlsArgs(
  gpu: GPUCapability,
  filepath: string,
  startSec: number,
  trackNum: number,
  is10bit: boolean,
  audioCodec: string,
  outDir: string,
  playlistPath: string,
): string[] {
  const args: string[] = ["-hide_banner"];

  // ── Hardware acceleration (decode) ──────────────────────────────
  // For VAAPI: use full hardware decode for BOTH 8-bit and 10-bit.
  // AMD Vega 10 supports HEVC Main10 hardware decode.
  // The 10→8-bit conversion happens on GPU via scale_vaapi=format=nv12.
  if (gpu.type === "vaapi" && gpu.device) {
    args.push("-hwaccel", "vaapi", "-hwaccel_device", gpu.device, "-hwaccel_output_format", "vaapi");
  } else if (gpu.type === "nvenc") {
    args.push("-hwaccel", "cuda", "-hwaccel_output_format", "cuda");
  } else if (gpu.type === "qsv") {
    args.push("-hwaccel", "qsv", "-hwaccel_output_format", "qsv");
  }

  // ── Input + seek ────────────────────────────────────────────────
  args.push("-ss", startSec.toString(), "-i", filepath);
  args.push("-map", "0:V:0", "-map", `0:a:${trackNum}`);

  // ── Video filter (GPU-side) ─────────────────────────────────────
  if (gpu.type === "vaapi") {
    if (is10bit) {
      // 10-bit→8-bit conversion entirely on GPU: scale_vaapi converts
      // P010/P010LE (10-bit) to NV12 (8-bit) in VAAPI surface memory.
      // w=-2:h=-2 preserves original resolution with even-number alignment.
      args.push("-vf", "scale_vaapi=w=-2:h=-2:format=nv12");
    } else {
      args.push("-vf", "scale_vaapi=w=-2:h=-2:format=nv12");
    }
  } else if (is10bit && gpu.type === "cpu") {
    // CPU fallback: software scale for 10-bit
    args.push("-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2");
  }

  // ── Encoder + quality ───────────────────────────────────────────
  args.push("-c:v", gpu.encoder);
  if (gpu.type === "nvenc") {
    args.push("-preset", "p4", "-rc", "vbr", "-cq", "26");
  } else if (gpu.type === "vaapi") {
    args.push("-qp", "26");
  } else if (gpu.type === "qsv") {
    args.push("-preset", "medium", "-global_quality", "26");
  } else {
    args.push("-preset", "ultrafast", "-crf", "26");
  }

  // ── Audio handling ──────────────────────────────────────────────
  // EAC3 (Dolby Digital Plus), AC3, DTS → need resampling + stereo downmix
  // to avoid AAC encoder failures with these surround formats.
  const needsAudioFix = ['eac3', 'ac3', 'dts', 'dts-hd', 'truehd'].includes(audioCodec);
  if (needsAudioFix) {
    args.push("-af", "aresample=48000", "-ar", "48000", "-ac", "2");
  }

  // ── Audio codec + HLS output ────────────────────────────────────
  args.push(
    "-c:a", "aac", "-b:a", "128k",
  );
  if (needsAudioFix) {
    args.push("-strict", "experimental");
  }
  args.push(
    "-sn",
    "-f", "hls",
    "-hls_time", "3",
    "-hls_playlist_type", "event",
    "-hls_segment_filename", path.join(outDir, "seg_%03d.ts"),
    playlistPath,
  );

  return args;
}

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

      // Kill stale transcode for the same media/track at a different start position
      if (!active) {
        const stalePrefix = `${mediaId}_${audioTrack}_`;
        for (const [key, transcode] of activeTranscodes.entries()) {
          if (key.startsWith(stalePrefix) && key !== streamKey) {
            console.log(`[HLS] Killing stale transcode: ${key} (new seek to ${startSec})`);
            try { transcode.ffmpeg.kill("SIGTERM"); } catch { }
            activeTranscodes.delete(key);
          }
        }
      }

      if (!active && !fs.existsSync(requestedFilePath)) {
        const is10bit = detect10bit(media.filepath);
        const audioCodec = detectAudioCodec(media.filepath, trackNum);
        const gpu = getDetectedGPU();
        console.log(`[HLS] Spawning ${gpu.label}${is10bit ? ' (10-bit)' : ''}${audioCodec !== 'aac' ? ` (audio: ${audioCodec})` : ''} segmenter for ${streamKey} — ${path.basename(media.filepath)}`);
        
        // Build FFmpeg args dynamically based on detected GPU
        const ffmpegArgs = buildHlsArgs(gpu, media.filepath, startSec, trackNum, is10bit, audioCodec, outDir, requestedFilePath);
        console.log(`[HLS] Full command: ffmpeg ${ffmpegArgs.join(" ")}`);

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

    // If playlist was requested but still doesn't exist (race: another request
    // is spawning FFmpeg), poll for it regardless of activeTranscodes state
    if (file === "playlist.m3u8" && !fs.existsSync(requestedFilePath)) {
      console.log(`[HLS] Waiting for playlist from concurrent spawn: ${streamKey}`);
      let pollAttempts = 0;
      while (!fs.existsSync(requestedFilePath) && pollAttempts < 100) {
        await new Promise((r) => setTimeout(r, 200));
        pollAttempts++;
      }
      if (!fs.existsSync(requestedFilePath)) {
        return new NextResponse("Stream not ready", { status: 503, headers: { "Retry-After": "2" } });
      }
    }

    // For .ts segment files: wait for FFmpeg to generate them
    // Poll regardless of activeTranscodes — the transcode may be registered
    // by a concurrent request that hasn't finished yet
    if (file.endsWith(".ts") && !fs.existsSync(requestedFilePath)) {
      const currentActive = activeTranscodes.get(streamKey);
      if (currentActive) {
        currentActive.lastAccessed = Date.now();
      }
      // Only poll if there's an active transcode OR the output dir exists
      // (dir existing means a transcode was recently spawned)
      if (currentActive || fs.existsSync(outDir)) {
        console.log(`[HLS] Waiting for segment: ${file} (${streamKey})`);
        let segAttempts = 0;
        while (!fs.existsSync(requestedFilePath) && segAttempts < 20) {
          await new Promise((r) => setTimeout(r, 500));
          segAttempts++;
        }
        if (!fs.existsSync(requestedFilePath)) {
          console.warn(`[HLS] Segment timeout: ${file} not ready after 10s`);
          return new NextResponse("Segment not ready", { status: 503, headers: { "Retry-After": "2" } });
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
