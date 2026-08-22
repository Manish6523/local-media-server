import path from "path";
import os from "os";

const platform = os.platform();
const arch = os.arch();

/** Absolute path to the `ffmpeg` binary. */
export const FFMPEG: string = (() => {
  try {
    const ext = platform === "win32" ? ".exe" : "";
    const p = path.join(process.cwd(), "node_modules", "ffmpeg-static", `ffmpeg${ext}`);
    return p;
  } catch { /* fall through */ }
  return "ffmpeg";
})();

/** Absolute path to the `ffprobe` binary. */
export const FFPROBE: string = (() => {
  try {
    const ext = platform === "win32" ? ".exe" : "";
    const p = path.join(process.cwd(), "node_modules", "ffprobe-static", "bin", platform, arch, `ffprobe${ext}`);
    return p;
  } catch { /* fall through */ }
  return "ffprobe";
})();
