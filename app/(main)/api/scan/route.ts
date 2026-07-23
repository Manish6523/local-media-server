import { NextResponse } from "next/server";
import { scanAllSources } from "@/lib/scanner";
import { parseFilename } from "@/lib/parser";
import { fetchOMDB } from "@/lib/omdb";
import { getBackdropForMovie, getBackdropForShow } from "@/lib/fanart";
import { getDb, getMediaByFilepath, upsertMedia, setConfig, updateAvailability, getConfig, deleteMissingMedia, getShowMetadataByTitle } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const localPath = getConfig("local_path") || process.env.LOCAL_MEDIA_PATH || "";
    const hddPath = getConfig("hdd_path") || process.env.HDD_PATH || "";

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

    // PASS 1 — Parse all files first, don't fetch metadata yet
    const parsedFiles = files.map(file => ({
      file,
      parsed: parseFilename(file.filename)
    }));

    // PASS 2 — Separate movies from shows
    const movieFiles = parsedFiles.filter(f => f.parsed.type === "movie" || f.parsed.episode_start === null);
    const showFiles = parsedFiles.filter(f => f.parsed.type === "show" || f.parsed.episode_start !== null);

    // Group show files by normalized title
    const showGroups = new Map<string, typeof showFiles>();
    for (const item of showFiles) {
      const key = item.parsed.title.toLowerCase().trim();
      if (!showGroups.has(key)) showGroups.set(key, []);
      showGroups.get(key)!.push(item);
    }

    console.log(`[Scanner] Grouped ${showFiles.length} episode files into ${showGroups.size} unique shows`);
    
    const { sqliteDb } = getDb();
    let omdbCallsForShows = 0;

    // Process each show group
    for (const [showTitle, episodeFiles] of showGroups) {
      console.log(`[Scanner] Processing show: "${showTitle}" (${episodeFiles.length} episodes)`);
      try {
        // Check if this show already has confirmed metadata in DB
        const existing = getShowMetadataByTitle(showTitle);

        let showMetadata: any = null;
        let backdropResult: any = null;
        let omdbConfirmed = 1;

        if (existing) {
          console.log(`[Scanner] Show "${showTitle}" already has cached metadata (omdb_id: ${existing.omdb_id}) — reusing for all ${episodeFiles.length} episodes`);
          showMetadata = existing;
          backdropResult = { backdropPath: existing.backdrop, backdropUrl: existing.backdrop_url };
        } else {
          console.log(`[Scanner] Show "${showTitle}" not in DB yet — fetching metadata ONCE`);
          omdbCallsForShows++;
          const representative = episodeFiles[0].parsed;
          const omdbData = await fetchOMDB(representative.title, "show", representative.year);
          
          if (omdbData) {
            showMetadata = omdbData;
            if (omdbData.omdb_id) {
              backdropResult = await getBackdropForShow(omdbData.omdb_id);
            }

            // Compare titles to detect OMDB mismatches
            if (omdbData.confirmed_title) {
              const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
              const parsedNorm = normalize(representative.title);
              const omdbNorm = normalize(omdbData.confirmed_title);
              
              if (!parsedNorm.includes(omdbNorm) && !omdbNorm.includes(parsedNorm)) {
                omdbConfirmed = 0;
                console.log(`[Scan] Title mismatch! Parsed: "${representative.title}", OMDB: "${omdbData.confirmed_title}"`);
              }
            }
          }
        }

        // Now apply this SAME metadata object to every episode in this group
        for (const episode of episodeFiles) {
          try {
            const fileExisting = getMediaByFilepath(episode.file.filepath);
            
            upsertMedia({
              filepath: episode.file.filepath,
              filename: episode.file.filename,
              source: episode.file.source,
              type: "show",
              title: showMetadata?.confirmed_title || episode.parsed.title,
              year: showMetadata?.year ?? episode.parsed.year,
              season: episode.parsed.season,
              episode_start: episode.parsed.episode_start,
              episode_end: episode.parsed.episode_end,
              omdb_id: showMetadata?.omdb_id || null,
              poster: showMetadata?.poster || null,
              backdrop: backdropResult?.backdropPath || showMetadata?.backdrop || null,
              backdrop_url: backdropResult?.backdropUrl || showMetadata?.backdrop_url || null,
              overview: showMetadata?.overview || null,
              rating: showMetadata?.rating || null,
              genres: showMetadata?.genres || null,
              runtime: showMetadata?.runtime || null,
              available: 1,
              fetched_at: showMetadata ? new Date().toISOString() : null,
              omdb_confirmed: existing ? (fileExisting?.omdb_confirmed ?? 1) : omdbConfirmed,
            });

            if (fileExisting) {
              if (fileExisting.omdb_id && existing) {
                skippedCount++;
              } else {
                updatedCount++;
              }
            } else {
              newCount++;
            }
          } catch (err) {
             console.error(`[Scan] Error processing episode ${episode.file.filepath}:`, err);
             errorCount++;
          }
        }
        console.log(`[Scanner] Saved ${episodeFiles.length} episodes of "${showTitle}" using 1 metadata fetch`);
      } catch (err) {
        console.error(`[Scan] Error processing show group ${showTitle}:`, err);
        errorCount += episodeFiles.length;
      }
    }

    // Step 3: Keep movies processing individually
    for (const movie of movieFiles) {
      try {
        const fileExisting = getMediaByFilepath(movie.file.filepath);

        if (fileExisting && fileExisting.omdb_id) {
          // Already indexed with metadata — just update availability
          upsertMedia({
            ...fileExisting,
            available: 1,
            fetched_at: fileExisting.fetched_at,
          });
          skippedCount++;
          continue;
        }

        // Fetch OMDB metadata
        const omdbData = await fetchOMDB(movie.parsed.title, "movie", movie.parsed.year);

        // Compare titles to detect OMDB mismatches
        let omdbConfirmed = 1;
        if (omdbData && omdbData.confirmed_title) {
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const parsedNorm = normalize(movie.parsed.title);
          const omdbNorm = normalize(omdbData.confirmed_title);
          
          if (!parsedNorm.includes(omdbNorm) && !omdbNorm.includes(parsedNorm)) {
            omdbConfirmed = 0;
            console.log(`[Scan] Title mismatch! Parsed: "${movie.parsed.title}", OMDB: "${omdbData.confirmed_title}"`);
          }
        }

        // Fetch Fanart.tv backdrop
        let backdropResult = null;
        if (omdbData?.omdb_id) {
          backdropResult = await getBackdropForMovie(omdbData.omdb_id);
        }

        upsertMedia({
          filepath: movie.file.filepath,
          filename: movie.file.filename,
          source: movie.file.source,
          type: "movie",
          title: omdbData?.confirmed_title || movie.parsed.title,
          year: omdbData?.year ?? movie.parsed.year,
          season: null,
          episode_start: null,
          episode_end: null,
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

        if (fileExisting) {
          updatedCount++;
        } else {
          newCount++;
        }
      } catch (err) {
        console.error(`[Scan] Error processing movie ${movie.file.filepath}:`, err);
        errorCount++;
      }
    }

    // Step 4: Update scan summary logging
    console.log(`[Scan] Shows: ${showFiles.length} episodes across ${showGroups.size} unique titles (saved ${showFiles.length - showGroups.size} redundant API calls)`);

    // Update last scan time
    setConfig("last_scan", new Date().toISOString());

    const result = {
      success: true,
      summary: {
        totalFiles: files.length,
        uniqueShows: showGroups.size,
        omdbCallsForShows: omdbCallsForShows,
        omdbCallsSaved: showFiles.length - showGroups.size,
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
