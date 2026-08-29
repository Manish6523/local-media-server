"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanAllSources = scanAllSources;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".avi", ".mov", ".m4v", ".wmv"]);
/**
 * Recursively walk a directory and collect all video files.
 * Catches errors per-file/per-directory to never crash the full scan.
 */
function walkDirectory(dirPath, source) {
    const results = [];
    try {
        const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dirPath, entry.name);
            try {
                if (entry.isDirectory()) {
                    // Recurse into subdirectory
                    results.push(...walkDirectory(fullPath, source));
                }
                else if (entry.isFile()) {
                    const ext = path_1.default.extname(entry.name).toLowerCase();
                    if (VIDEO_EXTENSIONS.has(ext)) {
                        results.push({
                            filepath: fullPath,
                            filename: entry.name,
                            source,
                        });
                    }
                }
            }
            catch (fileErr) {
                // Log but don't crash on individual file errors
                console.error(`[Scanner] Error processing ${fullPath}:`, fileErr);
                continue;
            }
        }
    }
    catch (dirErr) {
        // Log but don't crash on directory read errors
        console.error(`[Scanner] Error reading directory ${dirPath}:`, dirErr);
    }
    return results;
}
/**
 * Scan all provided media paths for video files.
 * Checks if paths exist before scanning. Missing paths are skipped silently.
 */
function scanAllSources(mediaPaths) {
    const files = [];
    const connectedPaths = [];
    for (const mediaPath of mediaPaths) {
        if (fs_1.default.existsSync(mediaPath)) {
            connectedPaths.push(mediaPath);
            console.log(`[Scanner] Scanning path: ${mediaPath}`);
            const dirFiles = walkDirectory(mediaPath, "local");
            files.push(...dirFiles);
            console.log(`[Scanner] Found ${dirFiles.length} video files in ${mediaPath}`);
        }
        else {
            console.log(`[Scanner] Path not found or disconnected, skipping: ${mediaPath}`);
        }
    }
    return { files, connectedPaths };
}
