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
 * Scan both local and HDD sources for video files.
 * Checks if paths exist before scanning. Missing paths are skipped silently.
 */
export function scanAllSources(
  localPath: string,
  hddPath: string
): { files: FileEntry[]; hddConnected: boolean } {
  const files: FileEntry[] = [];
  let hddConnected = false;

  // Scan local path
  if (fs.existsSync(localPath)) {
    console.log(`[Scanner] Scanning local path: ${localPath}`);
    const localFiles = walkDirectory(localPath, "local");
    files.push(...localFiles);
    console.log(`[Scanner] Found ${localFiles.length} video files in local path`);
  } else {
    console.log(`[Scanner] Local path not found, skipping: ${localPath}`);
  }

  // Scan HDD path
  if (fs.existsSync(hddPath)) {
    hddConnected = true;
    console.log(`[Scanner] Scanning HDD path: ${hddPath}`);
    const hddFiles = walkDirectory(hddPath, "hdd");
    files.push(...hddFiles);
    console.log(`[Scanner] Found ${hddFiles.length} video files on HDD`);
  } else {
    console.log(`[Scanner] HDD not connected, skipping: ${hddPath}`);
  }

  return { files, hddConnected };
}
