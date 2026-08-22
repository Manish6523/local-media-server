import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getMediaById } from "@/lib/db";
import { FFPROBE } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

interface MediaInfo {
  videoCodec: string;
  audioCodec: string;
  container: string;
  streamingTier: "direct" | "remux" | "transcode";
  needsRemux: boolean;
  needsTranscode: boolean;
}

async function probeFile(filepath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      filepath,
    ];

    const ffprobe = spawn(FFPROBE, args);
    let stdout = "";
    let stderr = "";

    ffprobe.stdout.on("data", (d) => (stdout += d));
    ffprobe.stderr.on("data", (d) => (stderr += d));

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const streams = data.streams || [];
        const videoStream = streams.find((s: any) => s.codec_type === "video");
        const audioStream = streams.find((s: any) => s.codec_type === "audio");

        const videoCodec = (videoStream?.codec_name || "unknown").toLowerCase();
        const audioCodec = (audioStream?.codec_name || "unknown").toLowerCase();
        const ext = path.extname(filepath).toLowerCase().slice(1);

        // ── Classification Logic ─────────────────────────────────
        //
        // Native browser codecs (no CPU needed):
        //   H.264 (avc1) → all browsers
        //   VP8/VP9      → all browsers
        //   AV1          → Chrome 70+
        //   HEVC/H.265   → Chrome 107+ on Linux (hardware)
        //
        // Remuxable (copy codec, ~2% CPU):
        //   H.264 in MKV/AVI → just change container to MP4
        //
        // Must transcode (40%+ CPU):
        //   MPEG4/XviD/DivX, WMV, old AVI codecs

        const nativeCodecs = ["h264", "avc", "vp8", "vp9", "av1"];
        const remuxableCodecs = ["h264", "avc"];
        const hevcCodecs = ["hevc", "h265"];
        const nativeContainers = ["mp4", "m4v", "mov", "webm"];

        const isNativeCodec = nativeCodecs.includes(videoCodec);
        const isHevc = hevcCodecs.includes(videoCodec);
        const isRemuxable = remuxableCodecs.includes(videoCodec);
        const isNativeContainer = nativeContainers.includes(ext);

        let streamingTier: "direct" | "remux" | "transcode";

        if (isNativeCodec && isNativeContainer) {
          // MP4 H.264, WebM VP9 — best case
          streamingTier = "direct";
        } else if (isHevc) {
          // HEVC — try direct first, Chrome supports it on most Linux
          streamingTier = "direct";
        } else if (isNativeCodec && !isNativeContainer) {
          // H.264 in MKV/AVI — just repackage the container
          streamingTier = "remux";
        } else if (isRemuxable) {
          // Fallback remux for anything H.264
          streamingTier = "remux";
        } else {
          // Old codec (MPEG4, XviD, WMV, etc) — must transcode
          streamingTier = "transcode";
        }

        console.log(
          `[MediaInfo] ${path.basename(filepath)}: video=${videoCodec} audio=${audioCodec} container=${ext} → tier=${streamingTier}`
        );

        resolve({
          videoCodec,
          audioCodec,
          container: ext,
          streamingTier,
          needsRemux: streamingTier === "remux",
          needsTranscode: streamingTier !== "direct",
        });
      } catch (err) {
        reject(err);
      }
    });

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      ffprobe.kill();
      reject(new Error("ffprobe timeout"));
    }, 10000);

    ffprobe.on("close", () => clearTimeout(timeout));
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const media = getMediaById(parseInt(id, 10));
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (!media.available) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    const filepath = media.filepath;
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const info = await probeFile(filepath);
    return NextResponse.json(info);
  } catch (err) {
    console.error("[MediaInfo] Error:", err);
    // Safe fallback: default to direct stream
    return NextResponse.json({
      videoCodec: "unknown",
      audioCodec: "unknown",
      container: "unknown",
      streamingTier: "direct",
      needsRemux: false,
      needsTranscode: false,
    });
  }
}
