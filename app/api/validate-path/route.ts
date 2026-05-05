import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".avi", ".mov", ".m4v", ".wmv"]);

export const dynamic = "force-dynamic";

function countVideoFiles(dirPath: string): number {
  let count = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countVideoFiles(path.join(dirPath, entry.name));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          count++;
        }
      }
    }
  } catch (err) {
    // Ignore permissions errors or unreadable dirs
  }
  return count;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get("path");

    if (!rawPath) {
      return NextResponse.json({ valid: false, fileCount: 0, error: "Missing path parameter" }, { status: 400 });
    }

    const normalizedPath = path.normalize(rawPath);

    if (fs.existsSync(normalizedPath)) {
      const fileCount = countVideoFiles(normalizedPath);
      return NextResponse.json({
        valid: true,
        fileCount,
        normalizedPath
      });
    } else {
      return NextResponse.json({
        valid: false,
        fileCount: 0,
        normalizedPath
      });
    }
  } catch (err) {
    return NextResponse.json({ valid: false, fileCount: 0, error: String(err) }, { status: 500 });
  }
}
