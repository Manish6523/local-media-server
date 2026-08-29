"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFPROBE = exports.FFMPEG = void 0;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const platform = os_1.default.platform();
const arch = os_1.default.arch();
// @ts-ignore
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
// @ts-ignore
const ffprobe_static_1 = __importDefault(require("ffprobe-static"));
let resolvedFfmpeg = process.env.FFMPEG_PATH || ffmpeg_static_1.default || "ffmpeg";
let resolvedFfprobe = process.env.FFPROBE_PATH || ffprobe_static_1.default.path || "ffprobe";
// Next.js Turbopack replaces __dirname with \ROOT\ or /ROOT/ in dev mode
if (resolvedFfmpeg.includes("ROOT")) {
    resolvedFfmpeg = path_1.default.join(process.cwd(), resolvedFfmpeg.replace(/^.*ROOT[\\/]/, ""));
}
if (resolvedFfprobe.includes("ROOT")) {
    resolvedFfprobe = path_1.default.join(process.cwd(), resolvedFfprobe.replace(/^.*ROOT[\\/]/, ""));
}
/** Absolute path to the `ffmpeg` binary. */
exports.FFMPEG = resolvedFfmpeg;
/** Absolute path to the `ffprobe` binary. */
exports.FFPROBE = resolvedFfprobe;
