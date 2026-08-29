import { NextRequest } from "next/server";
import { scanAllSources } from "@/lib/scanner";
import { parseFilename } from "@/lib/parser";
import { fetchOMDB } from "@/lib/omdb";
import { fetchTVMazeShow } from "@/lib/tvmaze";
import { getBackdropForMovie, getBackdropForShow } from "@/lib/fanart";
import { getDb, getMediaByFilepath, upsertMedia, setConfig, updateAvailability, getMediaPaths, deleteMissingMedia, getShowMetadataByTitle, getAllMedia } from "@/lib/db";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const mediaPaths = getMediaPaths();
        send({ message: "Starting scan...", progress: 0 });

        // Yield to event loop to flush SSE
        await new Promise(r => setTimeout(r, 10));

        const { files, connectedPaths } = scanAllSources(mediaPaths);

        let deletedCount = 0;
        send({ message: "Cleaning up missing files...", progress: 10 });
        await new Promise(r => setTimeout(r, 10));

        // Delete files from disconnected paths or missing from connected paths
        // Wait, for multiple paths we need to check if the file's parent path is connected
        const allMedia = getAllMedia();
        for (const m of allMedia) {
          // If a file starts with one of the connected paths, check if it exists.
          // If it starts with a disconnected path, mark it unavailable.
          const parentPath = mediaPaths.find(p => m.filepath.startsWith(p));
          if (parentPath && !connectedPaths.includes(parentPath)) {
            // Path disconnected
            const { db } = getDb();
            const schema = require("@/db/schema");
            const { eq } = require("drizzle-orm");
            db.update(schema.mediaAssets).set({ available: 0 }).where(eq(schema.mediaAssets.id, m.id)).run();
          } else if (!fs.existsSync(m.filepath)) {
            // File is missing from a connected path -> delete
            const { db } = getDb();
            const schema = require("@/db/schema");
            const { eq } = require("drizzle-orm");
            db.delete(schema.episodes).where(eq(schema.episodes.mediaAssetId, m.id)).run();
            db.delete(schema.movies).where(eq(schema.movies.mediaAssetId, m.id)).run();
            db.delete(schema.playbackProgress).where(eq(schema.playbackProgress.mediaAssetId, m.id)).run();
            db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, m.id)).run();
            deletedCount++;
          } else {
            // Available
            const { db } = getDb();
            const schema = require("@/db/schema");
            const { eq } = require("drizzle-orm");
            db.update(schema.mediaAssets).set({ available: 1 }).where(eq(schema.mediaAssets.id, m.id)).run();
          }
        }

        let newCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        const parsedFiles = files.map(file => ({
          file,
          parsed: parseFilename(file.filename)
        }));

        const movieFiles = parsedFiles.filter(f => f.parsed.type === "movie" || f.parsed.episode_start === null);
        const showFiles = parsedFiles.filter(f => f.parsed.type === "show" || f.parsed.episode_start !== null);

        const showGroups = new Map<string, typeof showFiles>();
        for (const item of showFiles) {
          const key = item.parsed.title.toLowerCase().trim();
          if (!showGroups.has(key)) showGroups.set(key, []);
          showGroups.get(key)!.push(item);
        }

        let omdbCallsForShows = 0;
        let processedItems = 0;
        const totalItems = showGroups.size + movieFiles.length;

        // Process shows
        for (const [showTitle, episodeFiles] of showGroups) {
          processedItems++;
          const percent = 10 + Math.floor((processedItems / totalItems) * 80);
          send({ message: `Processing show: ${showTitle}`, progress: percent });
          await new Promise(r => setTimeout(r, 10));

          try {
            const existing = getShowMetadataByTitle(showTitle);
            let showMetadata: any = null;
            let backdropResult: any = null;
            let omdbConfirmed = 1;

            if (existing) {
              showMetadata = existing;
              backdropResult = { backdropPath: existing.backdrop, backdropUrl: existing.backdrop_url };
            } else {
              omdbCallsForShows++;
              const representative = episodeFiles[0].parsed;
              const tvmazeData = await fetchTVMazeShow(representative.title, representative.year);
              
              if (tvmazeData) {
                showMetadata = tvmazeData;
                if (tvmazeData.omdb_id) {
                  backdropResult = await getBackdropForShow(tvmazeData.omdb_id);
                }
                if (!backdropResult && tvmazeData.poster) {
                  backdropResult = { backdropPath: tvmazeData.poster, backdropUrl: tvmazeData.backdrop_url };
                }

                if (tvmazeData.confirmed_title) {
                  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
                  const parsedNorm = normalize(representative.title);
                  const tvmazeNorm = normalize(tvmazeData.confirmed_title);
                  if (!parsedNorm.includes(tvmazeNorm) && !tvmazeNorm.includes(parsedNorm)) {
                    omdbConfirmed = 0;
                  }
                }
              }
            }

            for (const episode of episodeFiles) {
              try {
                const fileExisting = getMediaByFilepath(episode.file.filepath);
                
                upsertMedia({
                  filepath: episode.file.filepath,
                  filename: episode.file.filename,
                  source: "local",
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
                  if (fileExisting.omdb_id && existing) skippedCount++;
                  else updatedCount++;
                } else {
                  newCount++;
                }
              } catch (err) {
                 errorCount++;
              }
            }
          } catch (err) {
            errorCount += episodeFiles.length;
          }
        }

        // Process movies
        for (const movie of movieFiles) {
          processedItems++;
          const percent = 10 + Math.floor((processedItems / totalItems) * 80);
          send({ message: `Processing movie: ${movie.parsed.title}`, progress: percent });
          await new Promise(r => setTimeout(r, 10));

          try {
            const fileExisting = getMediaByFilepath(movie.file.filepath);

            if (fileExisting && fileExisting.omdb_id) {
              upsertMedia({
                ...fileExisting,
                available: 1,
                fetched_at: fileExisting.fetched_at,
              });
              skippedCount++;
              continue;
            }

            const omdbData = await fetchOMDB(movie.parsed.title, "movie", movie.parsed.year);

            let omdbConfirmed = 1;
            if (omdbData && omdbData.confirmed_title) {
              const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
              const parsedNorm = normalize(movie.parsed.title);
              const omdbNorm = normalize(omdbData.confirmed_title);
              if (!parsedNorm.includes(omdbNorm) && !omdbNorm.includes(parsedNorm)) {
                omdbConfirmed = 0;
              }
            }

            let backdropResult = null;
            if (omdbData?.omdb_id) {
              backdropResult = await getBackdropForMovie(omdbData.omdb_id);
            }

            upsertMedia({
              filepath: movie.file.filepath,
              filename: movie.file.filename,
              source: "local",
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
            errorCount++;
          }
        }

        setConfig("last_scan", new Date().toISOString());

        const summary = {
          totalFiles: files.length,
          uniqueShows: showGroups.size,
          omdbCallsForShows,
          new: newCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errorCount,
          deleted: deletedCount,
        };

        send({ done: true, summary });
        controller.close();
      } catch (err) {
        console.error("[Scan] Fatal error:", err);
        send({ error: String(err) });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
