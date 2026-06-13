import { NextResponse } from "next/server";
import { scanAllSources } from "@/lib/scanner";
import { parseFilename } from "@/lib/parser";
import { fetchOMDB } from "@/lib/omdb";
import { getBackdropForMovie, getBackdropForShow } from "@/lib/fanart";
import { getDb, getMediaByFilepath, upsertMedia, setConfig, updateAvailability, getConfig, deleteMissingMedia } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const localPath = getConfig("local_path") || process.env.LOCAL_MEDIA_PATH || "/home/manish-arch/EveryThing/series/media/";
    const hddPath = getConfig("hdd_path") || process.env.HDD_PATH || "/run/media/manish-arch/HDD/";

    console.log("[Scan] Starting scan...");
    console.log(`[Scan] Local path: ${localPath}`);
    console.log(`[Scan] HDD path: ${hddPath}`);

    // Scan both sources
    const { files, hddConnected } = scanAllSources(localPath, hddPath);

    let deletedCount = 0;

    // Delete missing local files
    const localFiles = files.filter(f => f.source === "local").map(f => f.filepath);
    deletedCount += deleteMissingMedia("local", localFiles);

    // Update HDD availability and delete missing HDD files if connected
    if (!hddConnected) {
      // Mark all HDD entries as unavailable (but keep them in DB)
      updateAvailability("hdd", 0);
    } else {
      // Mark all HDD entries as available and delete any that were removed
      const hddFiles = files.filter(f => f.source === "hdd").map(f => f.filepath);
      deletedCount += deleteMissingMedia("hdd", hddFiles);
      updateAvailability("hdd", 1);
    }

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Track which files from this scan exist to handle availability
    const scannedPaths = new Set(files.map(f => f.filepath));

    // In-memory cache for OMDB results during this scan
    // Prevents redundant API calls/poster downloads for identical shows
    const omdbCache = new Map<string, any>();

    for (const file of files) {
      try {
        const existing = getMediaByFilepath(file.filepath);

        if (existing && existing.omdb_id) {
          // Already indexed with metadata — just update availability
          upsertMedia({
            ...existing,
            available: 1,
            fetched_at: existing.fetched_at,
          });
          skippedCount++;
          continue;
        }

        // Parse the filename
        const parsed = parseFilename(file.filename);

        // Fetch OMDB metadata (only if not already fetched)
        let omdbData = null;
        if (!existing || !existing.omdb_id) {
          const cacheKey = `${parsed.title}-${parsed.type}-${parsed.year || ''}`;
          if (omdbCache.has(cacheKey)) {
            omdbData = omdbCache.get(cacheKey);
          } else {
            omdbData = await fetchOMDB(parsed.title, parsed.type, parsed.year);
            omdbCache.set(cacheKey, omdbData);
          }
        }

        // Compare titles to detect OMDB mismatches
        let omdbConfirmed = 1;
        if (omdbData && omdbData.confirmed_title) {
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const parsedNorm = normalize(parsed.title);
          const omdbNorm = normalize(omdbData.confirmed_title);
          
          if (!parsedNorm.includes(omdbNorm) && !omdbNorm.includes(parsedNorm)) {
            omdbConfirmed = 0;
            console.log(`[Scan] Title mismatch! Parsed: "${parsed.title}", OMDB: "${omdbData.confirmed_title}"`);
          }
        }

        // Fetch Fanart.tv backdrop if we have an OMDB ID
        let backdropResult = null;
        if (omdbData?.omdb_id) {
          if (parsed.type === "movie") {
            backdropResult = await getBackdropForMovie(omdbData.omdb_id);
          } else {
            backdropResult = await getBackdropForShow(omdbData.omdb_id);
          }
        }

        // Upsert the media entry
        upsertMedia({
          filepath: file.filepath,
          filename: file.filename,
          source: file.source,
          type: parsed.type,
          title: omdbData?.confirmed_title || parsed.title,
          year: omdbData?.year ?? parsed.year,
          season: parsed.season,
          episode_start: parsed.episode_start,
          episode_end: parsed.episode_end,
          omdb_id: omdbData?.omdb_id || null,
          poster: omdbData?.poster || null,
          backdrop: backdropResult?.backdropPath || null,
          backdrop_url: backdropResult?.backdropUrl || null,
          overview: omdbData?.overview || null,
          rating: omdbData?.rating || null,
          genres: omdbData?.genres || null,
          runtime: omdbData?.runtime || null,
          available: 1,
          fetched_at: omdbData ? new Date().toISOString() : null,
          omdb_confirmed: omdbConfirmed,
        });

        if (existing) {
          updatedCount++;
        } else {
          newCount++;
        }
      } catch (err) {
        console.error(`[Scan] Error processing ${file.filepath}:`, err);
        errorCount++;
        continue;
      }
    }

    // Update last scan time
    setConfig("last_scan", new Date().toISOString());

    const result = {
      success: true,
      summary: {
        totalFiles: files.length,
        new: newCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
        deleted: deletedCount,
        hddConnected,
      },
    };

    console.log("[Scan] Complete:", result.summary);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Scan] Fatal error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
