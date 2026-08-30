import path from "path";
import os from "os";

const platform = os.platform();
const arch = os.arch();

let resolvedFfmpeg = process.env.FFMPEG_PATH || "";
let resolvedFfprobe = process.env.FFPROBE_PATH || "";

if (!resolvedFfmpeg) {
  const ffmpeg = require("ffmpeg-static");
  resolvedFfmpeg = (ffmpeg as string) || "ffmpeg";
}
if (!resolvedFfprobe) {
  const ffprobe = require("ffprobe-static");
  resolvedFfprobe = ffprobe.path || "ffprobe";
}

// Next.js Turbopack replaces __dirname with \ROOT\ or /ROOT/ in dev mode
if (resolvedFfmpeg.includes("ROOT")) {
  resolvedFfmpeg = path.join(process.cwd(), resolvedFfmpeg.replace(/^.*ROOT[\\/]/, ""));
}
if (resolvedFfprobe.includes("ROOT")) {
  resolvedFfprobe = path.join(process.cwd(), resolvedFfprobe.replace(/^.*ROOT[\\/]/, ""));
}

/** Absolute path to the `ffmpeg` binary. */
export const FFMPEG: string = resolvedFfmpeg;

/** Absolute path to the `ffprobe` binary. */
export const FFPROBE: string = resolvedFfprobe;
