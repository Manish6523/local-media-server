import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mkv", ".avi", ".mov", ".m4v", ".wmv", 
  ".webm", ".flv", ".ts", ".m2ts", ".vob", ".ogv"
]);

export interface FsFolderItem {
  name: string;
  path: string;
  isHidden: boolean;
}

export interface FsFileItem {
  name: string;
  path: string;
  isHidden: boolean;
  isVideo: boolean;
  extension: string;
  sizeBytes: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let targetPath = searchParams.get("path");

    // If no path is provided, default to user's home directory or root
    if (!targetPath) {
      targetPath = os.homedir() || (os.platform() === "win32" ? "C:\\" : "/");
    }

    targetPath = path.normalize(targetPath);

    // Ensure path exists and is a directory
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "Directory does not exist", path: targetPath }, { status: 404 });
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory", path: targetPath }, { status: 400 });
    }

    // Determine parent directory
    const parentPath = path.dirname(targetPath);
    const hasParent = parentPath !== targetPath;

    // Read directory contents
    const items: FsFolderItem[] = [];
    const files: FsFileItem[] = [];

    try {
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullItemPath = path.join(targetPath, entry.name);
        const isHidden = entry.name.startsWith(".");

        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: fullItemPath,
            isHidden,
          });
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isVideo = VIDEO_EXTENSIONS.has(ext);
          let sizeBytes = 0;
          try {
            const fileStat = fs.statSync(fullItemPath);
            sizeBytes = fileStat.size;
          } catch {
            sizeBytes = 0;
          }

          files.push({
            name: entry.name,
            path: fullItemPath,
            isHidden,
            isVideo,
            extension: ext,
            sizeBytes,
          });
        }
      }

      // Sort folders: visible first, then alphabetical
      items.sort((a, b) => {
        if (a.isHidden === b.isHidden) {
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        }
        return a.isHidden ? 1 : -1;
      });

      // Sort files: video files first, then visible, then alphabetical
      files.sort((a, b) => {
        if (a.isVideo !== b.isVideo) {
          return a.isVideo ? -1 : 1;
        }
        if (a.isHidden === b.isHidden) {
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        }
        return a.isHidden ? 1 : -1;
      });

    } catch (err) {
      return NextResponse.json({ error: "Permission denied reading directory", path: targetPath }, { status: 403 });
    }

    const videoCount = files.filter(f => f.isVideo).length;

    return NextResponse.json({
      path: targetPath,
      parentPath: hasParent ? parentPath : null,
      items, // Folders list for backwards compatibility
      files, // Files list so user can see what files are inside
      videoCount,
      totalFiles: files.length,
      folderCount: items.length,
      platform: os.platform()
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
