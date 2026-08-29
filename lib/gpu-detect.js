"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDetectedGPU = getDetectedGPU;
exports.detectBestEncoder = detectBestEncoder;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const ffmpeg_1 = require("./ffmpeg");
// Only initialize if not already set — prevents API route re-imports
// from overwriting the value that server.ts set at startup.
if (globalThis.__gpuCapability === undefined) {
    globalThis.__gpuCapability = null;
}
/** Read the cached detection result. Safe to call from API routes. */
function getDetectedGPU() {
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
function testEncoder(label, ffmpegArgs) {
    return new Promise((resolve) => {
        let resolved = false;
        let stderr = "";
        console.log(`[GPU] ${label} test command: ffmpeg ${ffmpegArgs.join(" ")}`);
        const proc = (0, child_process_1.spawn)(ffmpeg_1.FFMPEG, ffmpegArgs, {
            stdio: ["pipe", "pipe", "pipe"],
        });
        proc.stderr?.on("data", (d) => {
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
function testVaapi(device) {
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
async function detectBestEncoder() {
    console.log("[GPU] Starting hardware encoder detection...");
    // ── Test 1: NVENC (Nvidia) ──────────────────────────────────────
    console.log("[GPU] Testing NVENC (Nvidia)...");
    const nvencWorks = await testEncoder("NVENC", [
        "-v", "error",
        "-f", "lavfi", "-i", "color=black:s=256x256:d=1",
        "-c:v", "h264_nvenc",
        "-f", "null", "-",
    ]);
    if (nvencWorks) {
        const gpu = {
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
    // ── Test 2: AMF (AMD Radeon on Windows) ─────────────────────────
    console.log("[GPU] Testing AMF (AMD Radeon)...");
    const amfWorks = await testEncoder("AMF", [
        "-v", "error",
        "-f", "lavfi", "-i", "color=black:s=256x256:d=1",
        "-c:v", "h264_amf",
        "-f", "null", "-",
    ]);
    if (amfWorks) {
        const gpu = {
            type: "amf",
            encoder: "h264_amf",
            hwaccel: null,
            device: null,
            label: "AMD Radeon AMF",
        };
        globalThis.__gpuCapability = gpu;
        console.log(`[GPU] ${gpu.label}: ✓ ready`);
        return gpu;
    }
    console.log("[GPU] AMF: ✗ not available");
    // ── Test 3: VAAPI (AMD / Intel on Linux) ────────────────────────
    const renderDevices = ["/dev/dri/renderD128", "/dev/dri/renderD129"];
    let vaapiDevice = null;
    for (const dev of renderDevices) {
        if (fs_1.default.existsSync(dev)) {
            vaapiDevice = dev;
            break;
        }
    }
    if (vaapiDevice) {
        console.log(`[GPU] Testing VAAPI on ${vaapiDevice}...`);
        const vaapiWorks = await testVaapi(vaapiDevice);
        if (vaapiWorks) {
            const gpu = {
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
    }
    else {
        console.log("[GPU] VAAPI: ✗ no render device found");
    }
    // ── Test 4: QSV (Intel Quick Sync) ──────────────────────────────
    console.log("[GPU] Testing QSV (Intel Quick Sync)...");
    const qsvWorks = await testEncoder("QSV", [
        "-v", "error",
        "-f", "lavfi", "-i", "color=black:s=256x256:d=1",
        "-c:v", "h264_qsv",
        "-f", "null", "-",
    ]);
    if (qsvWorks) {
        const gpu = {
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
    const gpu = {
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
