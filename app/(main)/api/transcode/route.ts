import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import { getMediaById } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── VAAPI Config ────────────────────────────────────────────────
const VAAPI_DEVICE = "/dev/dri/renderD128";
const MAX_CONCURRENT = 2; // Max 2 FFmpeg processes (host + guest)

// Read the cached probe result from server.ts startup
function isVaapiAvailable(): boolean {
  return globalThis.__vaapiAvailable === true;
}

// ─── Active Process Tracking ─────────────────────────────────────
// Key: "clientId" (generated per request based on mediaId + client identifier)
// Each viewer gets exactly ONE process. New seek = kill old + spawn new.

interface ActiveProcess {
  ffmpeg: ChildProcessWithoutNullStreams;
  mediaId: string;
  createdAt: number;
}

// Track by a client-scoped key: mediaId:audioTrack:clientId
// For watch party: each viewer (host/guest) has their own clientId
const activeProcesses = new Map<string, ActiveProcess>();

// Queue for requests when MAX_CONCURRENT is reached
const pendingQueue: Array<() => void> = [];

function killProcess(key: string, reason: string) {
  const proc = activeProcesses.get(key);
  if (proc) {
    try { proc.ffmpeg.kill("SIGTERM"); } catch { /* already dead */ }
    activeProcesses.delete(key);
    console.log(`[Transcode] Killed process for ${key} (${reason}) | Active: ${activeProcesses.size}`);
  }
}

function tryDrainQueue() {
  while (pendingQueue.length > 0 && activeProcesses.size < MAX_CONCURRENT) {
    const next = pendingQueue.shift();
    if (next) next();
  }
}

// ─── FFmpeg Arg Builders ─────────────────────────────────────────

function buildVaapiArgs(filepath: string, start: number, audioTrack: number): string[] {
  // Two-pass seek for VAAPI reliability on large offsets:
  //   -ss [start-10] before -i (fast rough seek in demuxer)
  //   -ss 10 after -i (accurate fine seek in decoder)
  // This avoids "Error while opening encoder" on large timestamps
  const roughSeek = Math.max(0, start - 10);
  const fineSeek = start > 10 ? 10 : start;

  return [
    "-hide_banner",
    "-hwaccel", "vaapi",
    "-hwaccel_device", VAAPI_DEVICE,
    "-hwaccel_output_format", "vaapi",
    ...(roughSeek > 0 ? ["-ss", roughSeek.toString()] : []),
    "-i", filepath,
    ...(fineSeek > 0 ? ["-ss", fineSeek.toString()] : []),
    "-map", "0:V:0",
    "-map", `0:a:${audioTrack}`,
    "-vf", "scale_vaapi=w=-2:h=-2:format=nv12",
    "-c:v", "h264_vaapi",
    "-qp", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    "-sn",
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
    "-map", "0:V:0",
    "-map", `0:a:${audioTrack}`,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    "-sn",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov+faststart",
    "pipe:1",
  ];
}

// ─── Debounce Tracking ───────────────────────────────────────────
// When rapid seeks come in, we kill the old process immediately but
// wait 800ms before spawning a new one. If another seek arrives within
// that window, the timer resets. Only the LAST seek spawns a process.
const debounceMap = new Map<string, { timer: ReturnType<typeof setTimeout>; cancel: () => void }>();

// ─── Route Handler ───────────────────────────────────────────────
// Each viewer gets their own independent FFmpeg process.
// If a viewer seeks, their old process is killed and a new one spawns (after debounce).
// Socket.io handles sync — NOT shared FFmpeg streams.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const audioTrack = parseInt(searchParams.get("audioTrack") || "0", 10);
    const start = parseFloat(searchParams.get("start") || "0");
    // clientId differentiates host vs guest for the same media
    const clientId = searchParams.get("clientId") || "solo";

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

    // Process key: unique per viewer per media
    const processKey = `${id}:${audioTrack}:${clientId}`;

    // 1. Kill any existing FFmpeg process for this viewer immediately
    if (activeProcesses.has(processKey)) {
      killProcess(processKey, "new seek");
    }

    // 2. Cancel any pending debounce timer for this viewer
    const pendingDebounce = debounceMap.get(processKey);
    if (pendingDebounce) {
      clearTimeout(pendingDebounce.timer);
      pendingDebounce.cancel(); // Reject the old debounce promise
      debounceMap.delete(processKey);
    }

    // 3. Wait 800ms debounce — if another seek arrives, this gets cancelled
    const debounceResult = await new Promise<"spawn" | "cancelled">((resolve) => {
      const timer = setTimeout(() => {
        debounceMap.delete(processKey);
        resolve("spawn");
      }, 800);

      debounceMap.set(processKey, {
        timer,
        cancel: () => resolve("cancelled"),
      });

      // If client disconnects during debounce, clean up
      request.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        debounceMap.delete(processKey);
        resolve("cancelled");
      });
    });

    // If debounce was cancelled (newer seek arrived or client disconnected), bail out
    if (debounceResult === "cancelled" || request.signal.aborted) {
      return new NextResponse("Debounced", { status: 200 });
    }

    // 4. Wait for a slot if we're at max concurrent
    if (activeProcesses.size >= MAX_CONCURRENT) {
      console.log(`[Transcode] Max concurrent (${MAX_CONCURRENT}) reached, queuing ${processKey}`);
      await new Promise<void>((resolve) => {
        pendingQueue.push(resolve);

        request.signal.addEventListener("abort", () => {
          const idx = pendingQueue.indexOf(resolve);
          if (idx >= 0) pendingQueue.splice(idx, 1);
        });
      });

      if (request.signal.aborted) {
        return new NextResponse("Client disconnected", { status: 499 });
      }
    }

    // Determine encoding strategy from cached startup probe
    const useVaapi = isVaapiAvailable();
    const args = useVaapi
      ? buildVaapiArgs(filepath, start, audioTrack)
      : buildCpuArgs(filepath, start, audioTrack);

    const encoderLabel = useVaapi ? "VAAPI (AMD Vega 10)" : "CPU";
    console.log(`[Transcode] Using ${encoderLabel} for media ${id} @ ${start}s [${processKey}] | Active: ${activeProcesses.size + 1}`);

    const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });

    // Register in active processes
    activeProcesses.set(processKey, {
      ffmpeg,
      mediaId: id,
      createdAt: Date.now(),
    });

    // Log stderr errors (suppress progress noise)
    ffmpeg.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line.includes("Error") || line.includes("error") || line.includes("Invalid")) {
        console.error(`[Transcode/${useVaapi ? "VAAPI" : "CPU"}] ${line}`);
      }
    });

    // Cleanup on process exit
    const cleanup = () => {
      if (activeProcesses.get(processKey)?.ffmpeg === ffmpeg) {
        activeProcesses.delete(processKey);
        tryDrainQueue();
      }
    };

    ffmpeg.on("close", cleanup);
    ffmpeg.on("error", cleanup);

    // Kill FFmpeg when the client disconnects
    request.signal.addEventListener("abort", () => {
      if (activeProcesses.get(processKey)?.ffmpeg === ffmpeg) {
        killProcess(processKey, "client disconnected");
        tryDrainQueue();
      }
    });

    // Create a ReadableStream that pipes FFmpeg stdout to the response
    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        ffmpeg.stdout?.on("data", (chunk: Buffer) => {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
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
        if (activeProcesses.get(processKey)?.ffmpeg === ffmpeg) {
          killProcess(processKey, "stream cancelled");
          tryDrainQueue();
        }
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
