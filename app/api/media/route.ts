import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import { getAllMedia, getMediaById, getMediaByType, searchMedia, getMediaStats, getConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const stats = searchParams.get("stats");

    // Return stats
    if (stats === "true") {
      const mediaStats = getMediaStats();
      const lastScan = getConfig("last_scan");
      const localPath = getConfig("local_path");
      const hddPath = getConfig("hdd_path");

      return NextResponse.json({
        ...mediaStats,
        lastScan,
        localPath,
        hddPath,
      });
    }

    // Return single media entry
    if (id) {
      const media = getMediaById(parseInt(id, 10));
      if (!media) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Dynamically fetch exact duration via ffprobe for accurate seeking
      let exactDuration = media.runtime ? media.runtime * 60 : 0;
      if (fs.existsSync(media.filepath)) {
        try {
          const output = execSync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${media.filepath}"`,
            { encoding: "utf-8", timeout: 5000 }
          );
          const parsed = parseFloat(output.trim());
          if (!isNaN(parsed) && parsed > 0) exactDuration = parsed;
        } catch (err) {
          console.error("[Media] ffprobe duration error:", err);
        }
      }

      return NextResponse.json({ ...media, exactDuration });
    }

    // Search
    if (search) {
      const results = searchMedia(search);
      return NextResponse.json(results);
    }

    // Filter by type
    if (type === "movie" || type === "show") {
      const results = getMediaByType(type);
      return NextResponse.json(results);
    }

    // Return all media
    const all = getAllMedia();
    return NextResponse.json(all);
  } catch (err) {
    console.error("[Media API] Error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
