import fs from "fs";
import path from "path";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".avi", ".mov", ".m4v", ".wmv"]);

export interface FileEntry {
  filepath: string;
  filename: string;
  source: "local" | "hdd";
}

/**
 * Recursively walk a directory and collect all video files.
 * Catches errors per-file/per-directory to never crash the full scan.
 */
function walkDirectory(dirPath: string, source: "local" | "hdd"): FileEntry[] {
  const results: FileEntry[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          // Recurse into subdirectory
          results.push(...walkDirectory(fullPath, source));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            results.push({
              filepath: fullPath,
              filename: entry.name,
              source,
            });
          }
        }
      } catch (fileErr) {
        // Log but don't crash on individual file errors
        console.error(`[Scanner] Error processing ${fullPath}:`, fileErr);
        continue;
      }
    }
  } catch (dirErr) {
    // Log but don't crash on directory read errors
    console.error(`[Scanner] Error reading directory ${dirPath}:`, dirErr);
  }

  return results;
}

/**
 * Scan all provided media paths for video files.
 * Checks if paths exist before scanning. Missing paths are skipped silently.
 */
export function scanAllSources(
  mediaPaths: string[]
): { files: FileEntry[]; connectedPaths: string[] } {
  const files: FileEntry[] = [];
  const connectedPaths: string[] = [];

  for (const mediaPath of mediaPaths) {
    if (fs.existsSync(mediaPath)) {
      connectedPaths.push(mediaPath);
      console.log(`[Scanner] Scanning path: ${mediaPath}`);
      const dirFiles = walkDirectory(mediaPath, "local");
      files.push(...dirFiles);
      console.log(`[Scanner] Found ${dirFiles.length} video files in ${mediaPath}`);
    } else {
      console.log(`[Scanner] Path not found or disconnected, skipping: ${mediaPath}`);
    }
  }

  return { files, connectedPaths };
}
