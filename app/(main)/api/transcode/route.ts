import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import { getMediaById } from "@/lib/db";
import { getDetectedGPU, type GPUCapability } from "@/lib/gpu-detect";
import { FFMPEG } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

const MAX_CONCURRENT = 2; // Max 2 FFmpeg processes (host + guest)

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

// ─── Dynamic FFmpeg Arg Builders ─────────────────────────────────

function buildGpuArgs(filepath: string, start: number, audioTrack: number, gpu: GPUCapability): string[] {
  // Two-pass seek for reliability on large offsets:
  //   -ss [start-10] before -i (fast rough seek in demuxer)
  //   -ss 10 after -i (accurate fine seek in decoder)
  const roughSeek = Math.max(0, start - 10);
  const fineSeek = start > 10 ? 10 : start;

  const args: string[] = ["-hide_banner"];

  // Hardware acceleration flags
  if (gpu.type === "vaapi" && gpu.device) {
    args.push("-hwaccel", "vaapi", "-hwaccel_device", gpu.device, "-hwaccel_output_format", "vaapi");
  } else if (gpu.type === "nvenc") {
    args.push("-hwaccel", "cuda", "-hwaccel_output_format", "cuda");
  } else if (gpu.type === "qsv") {
    args.push("-hwaccel", "qsv", "-hwaccel_output_format", "qsv");
  }

  // Seeking
  if (roughSeek > 0) args.push("-ss", roughSeek.toString());
  args.push("-i", filepath);
  if (fineSeek > 0) args.push("-ss", fineSeek.toString());

  // Stream selection
  args.push("-map", "0:V:0", "-map", `0:a:${audioTrack}`);

  // Video filter (hardware-specific)
  if (gpu.type === "vaapi") {
    args.push("-vf", "scale_vaapi=w=-2:h=-2:format=nv12");
  }

  // Encoder + quality settings
  args.push("-c:v", gpu.encoder);
  if (gpu.type === "nvenc") {
    args.push("-preset", "p4", "-rc", "vbr", "-cq", "28");
  } else if (gpu.type === "vaapi") {
    args.push("-qp", "28");
  } else if (gpu.type === "qsv") {
    args.push("-preset", "medium", "-global_quality", "28");
  } else if (gpu.type === "amf") {
    args.push("-rc", "cqp", "-qp_i", "28", "-qp_p", "28");
  } else {
    args.push("-preset", "ultrafast", "-crf", "28");
  }

  // Audio + output
  args.push(
    "-c:a", "aac", "-b:a", "128k",
    "-sn",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov+faststart",
    "pipe:1",
  );

  return args;
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

    // Determine encoding strategy from cached startup detection
    const gpu = getDetectedGPU();
    const args = buildGpuArgs(filepath, start, audioTrack, gpu);

    console.log(`[Transcode] Using ${gpu.label} for media ${id} @ ${start}s [${processKey}] | Active: ${activeProcesses.size + 1}`);

    const ffmpeg = spawn(FFMPEG, args, { stdio: ["pipe", "pipe", "pipe"] });

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
        console.error(`[Transcode/${gpu.label}] ${line}`);
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
