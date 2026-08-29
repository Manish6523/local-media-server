import path from "path";
import os from "os";

const platform = os.platform();
const arch = os.arch();

// @ts-ignore
import ffmpeg from "ffmpeg-static";
// @ts-ignore
import ffprobe from "ffprobe-static";

let resolvedFfmpeg = process.env.FFMPEG_PATH || (ffmpeg as string) || "ffmpeg";
let resolvedFfprobe = process.env.FFPROBE_PATH || ffprobe.path || "ffprobe";

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
