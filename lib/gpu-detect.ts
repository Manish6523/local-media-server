import { spawn } from "child_process";
import fs from "fs";

// ─── GPU Capability Types ────────────────────────────────────────

export interface GPUCapability {
  type: "nvenc" | "vaapi" | "qsv" | "cpu";
  encoder: string;        // ffmpeg encoder name
  hwaccel: string | null;  // ffmpeg -hwaccel flag, null for CPU
  device: string | null;   // device path if applicable
  label: string;           // human-readable for logs
}

// ─── Global Cache (shared between server.ts + API routes) ────────

declare global {
  // eslint-disable-next-line no-var
  var __gpuCapability: GPUCapability | null;
}

// Only initialize if not already set — prevents API route re-imports
// from overwriting the value that server.ts set at startup.
if (globalThis.__gpuCapability === undefined) {
  globalThis.__gpuCapability = null;
}

/** Read the cached detection result. Safe to call from API routes. */
export function getDetectedGPU(): GPUCapability {
  return globalThis.__gpuCapability || {
    type: "cpu",
    encoder: "libx264",
    hwaccel: null,
    device: null,
    label: "CPU (libx264)",
  };
}

// ─── Encoder Test Helpers ────────────────────────────────────────

/**
 * Generic encoder test — runs ffmpeg with given args, returns pass/fail.
 * Logs full stderr on failure for debugging.
 */
function testEncoder(label: string, ffmpegArgs: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    let stderr = "";

    console.log(`[GPU] ${label} test command: ffmpeg ${ffmpegArgs.join(" ")}`);

    const proc = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill("SIGKILL");
        console.log(`[GPU] ${label} test timed out after 10s`);
        resolve(false);
      }
    }, 10000); // 10s — VAAPI/GPU init can be slow on iGPUs

    proc.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (code !== 0) {
          console.log(`[GPU] ${label} test failed (code ${code}), stderr: ${stderr.slice(-400)}`);
        }
        resolve(code === 0);
      }
    });

    proc.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`[GPU] ${label} test error: ${err.message}`);
        resolve(false);
      }
    });
  });
}

/**
 * VAAPI-specific test — uses the exact command structure proven to work
 * on AMD Vega 10 / Intel iGPU systems.
 */
function testVaapi(device: string): Promise<boolean> {
  return testEncoder("VAAPI", [
    "-hide_banner", "-loglevel", "error",
    "-vaapi_device", device,
    "-f", "lavfi",
    "-i", "color=black:s=256x256:d=0.5",
    "-vf", "format=nv12,hwupload",
    "-c:v", "h264_vaapi",
    "-f", "null", "-",
  ]);
}

// ─── Main Detection (runs once at boot) ──────────────────────────

export async function detectBestEncoder(): Promise<GPUCapability> {
  console.log("[GPU] Starting hardware encoder detection...");

  // ── Test 1: NVENC (Nvidia) ──────────────────────────────────────
  console.log("[GPU] Testing NVENC (Nvidia)...");
  const nvencWorks = await testEncoder("NVENC", [
    "-v", "error",
    "-hwaccel", "cuda",
    "-f", "lavfi", "-i", "color=black:s=256x256:d=1",
    "-c:v", "h264_nvenc",
    "-f", "null", "-",
  ]);
  if (nvencWorks) {
    const gpu: GPUCapability = {
      type: "nvenc",
      encoder: "h264_nvenc",
      hwaccel: "cuda",
      device: null,
      label: "Nvidia NVENC",
    };
    globalThis.__gpuCapability = gpu;
    console.log(`[GPU] ${gpu.label}: ✓ ready`);
    return gpu;
  }
  console.log("[GPU] NVENC: ✗ not available");

  // ── Test 2: VAAPI (AMD / Intel on Linux) ────────────────────────
  const renderDevices = ["/dev/dri/renderD128", "/dev/dri/renderD129"];
  let vaapiDevice: string | null = null;
  for (const dev of renderDevices) {
    if (fs.existsSync(dev)) {
      vaapiDevice = dev;
      break;
    }
  }

  if (vaapiDevice) {
    console.log(`[GPU] Testing VAAPI on ${vaapiDevice}...`);
    const vaapiWorks = await testVaapi(vaapiDevice);
    if (vaapiWorks) {
      const gpu: GPUCapability = {
        type: "vaapi",
        encoder: "h264_vaapi",
        hwaccel: "vaapi",
        device: vaapiDevice,
        label: "VAAPI (AMD/Intel GPU)",
      };
      globalThis.__gpuCapability = gpu;
      console.log(`[GPU] ${gpu.label}: ✓ ready`);
      return gpu;
    }
    console.log("[GPU] VAAPI: ✗ probe failed");
  } else {
    console.log("[GPU] VAAPI: ✗ no render device found");
  }

  // ── Test 3: QSV (Intel Quick Sync) ──────────────────────────────
  console.log("[GPU] Testing QSV (Intel Quick Sync)...");
  const qsvWorks = await testEncoder("QSV", [
    "-v", "error",
    "-hwaccel", "qsv",
    "-f", "lavfi", "-i", "color=black:s=256x256:d=1",
    "-c:v", "h264_qsv",
    "-f", "null", "-",
  ]);
  if (qsvWorks) {
    const gpu: GPUCapability = {
      type: "qsv",
      encoder: "h264_qsv",
      hwaccel: "qsv",
      device: null,
      label: "Intel Quick Sync",
    };
    globalThis.__gpuCapability = gpu;
    console.log(`[GPU] ${gpu.label}: ✓ ready`);
    return gpu;
  }
  console.log("[GPU] QSV: ✗ not available");

  // ── Fallback: CPU ───────────────────────────────────────────────
  const gpu: GPUCapability = {
    type: "cpu",
    encoder: "libx264",
    hwaccel: null,
    device: null,
    label: "CPU (libx264)",
  };
  globalThis.__gpuCapability = gpu;
  console.log(`[GPU] Falling back to ${gpu.label}`);
  return gpu;
}
