import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let targetPath = searchParams.get("path");

    // If no path is provided, default to user's home directory or root
    if (!targetPath) {
      targetPath = os.homedir() || (os.platform() === "win32" ? "C:\\" : "/");
    }

    // Normalize path to prevent directory traversal attacks if necessary
    // But since this is a local app, we allow any absolute path.
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
    let items: { name: string; path: string; isHidden: boolean }[] = [];
    try {
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      for (const entry of entries) {
        // Only include directories
        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: path.join(targetPath, entry.name),
            isHidden: entry.name.startsWith("."),
          });
        }
      }

      // Sort: visible folders first, then hidden folders. Alphabetical.
      items.sort((a, b) => {
        if (a.isHidden === b.isHidden) {
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        return a.isHidden ? 1 : -1;
      });

    } catch (err) {
      // Permission denied or other error reading dir contents
      return NextResponse.json({ error: "Permission denied reading directory", path: targetPath }, { status: 403 });
    }

    return NextResponse.json({
      path: targetPath,
      parentPath: hasParent ? parentPath : null,
      items,
      platform: os.platform()
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
