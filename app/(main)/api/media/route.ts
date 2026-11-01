import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import { getAllMedia, getMediaById, getMediaByType, searchMedia, getMediaStats, getConfig, getShowOfflineMedia, isFileAccessible } from "@/lib/db";
import { FFPROBE } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const stats = searchParams.get("stats");
    const includeOffline = searchParams.get("includeOffline") === "true";

    const showOffline = getShowOfflineMedia();
    const shouldFilterOffline = !showOffline && !includeOffline;

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
      }, { headers: NO_CACHE_HEADERS });
    }

    // Return single media entry
    if (id) {
      const media = getMediaById(parseInt(id, 10));
      if (!media) {
        return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // Dynamically fetch exact duration via ffprobe for accurate seeking
      let exactDuration = media.runtime ? media.runtime * 60 : 0;
      if (media.available && fs.existsSync(media.filepath)) {
        try {
          const output = execSync(
            `"${FFPROBE}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${media.filepath}"`,
            { encoding: "utf-8", timeout: 5000 }
          );
          const parsed = parseFloat(output.trim());
          if (!isNaN(parsed) && parsed > 0) exactDuration = parsed;
        } catch (err) {
          console.error("[Media] ffprobe duration error:", err);
        }
      }

      return NextResponse.json({ ...media, exactDuration }, { headers: NO_CACHE_HEADERS });
    }

    // Search
    if (search) {
      let results = searchMedia(search);
      if (shouldFilterOffline) results = results.filter(m => m.available === 1);
      return NextResponse.json(results, { headers: NO_CACHE_HEADERS });
    }

    // Filter by type
    if (type === "movie" || type === "show") {
      let results = getMediaByType(type);
      if (shouldFilterOffline) results = results.filter(m => m.available === 1);
      return NextResponse.json(results, { headers: NO_CACHE_HEADERS });
    }

    // Return all media
    let all = getAllMedia();
    if (shouldFilterOffline) all = all.filter(m => m.available === 1);
    return NextResponse.json(all, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[Media API] Error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
