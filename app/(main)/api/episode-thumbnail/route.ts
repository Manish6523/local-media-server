import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// In-flight requests — prevents multiple FFmpeg processes for the same episode
const inFlight = new Map<number, Promise<string | null>>();

/**
 * GET /api/episode-thumbnail?id=<mediaAssetId>
 *
 * Lazy episode thumbnail generator:
 *  1. Check if thumbnail already cached on disk → return path
 *  2. If not, extract a frame with FFmpeg at ~10% into the video
 *  3. Save to public/episode-thumbs/<id>.jpg, update DB, return path
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const mediaAssetId = parseInt(idParam, 10);
  if (isNaN(mediaAssetId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { db } = getDb();

  // Find the episode + its media asset filepath
  const episode = db
    .select({
      episodeId: schema.episodes.id,
      mediaAssetId: schema.episodes.mediaAssetId,
      episodeThumbnail: schema.episodes.episodeThumbnail,
      filepath: schema.mediaAssets.filepath,
      available: schema.mediaAssets.available,
      runtime: schema.episodes.runtime,
    })
    .from(schema.episodes)
    .leftJoin(schema.mediaAssets, eq(schema.episodes.mediaAssetId, schema.mediaAssets.id))
    .where(eq(schema.episodes.mediaAssetId, mediaAssetId))
    .get();

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  // 1. Check if thumbnail is already cached in DB and file exists on disk
  if (episode.episodeThumbnail) {
    const fullPath = path.join(process.cwd(), "public", episode.episodeThumbnail);
    if (fs.existsSync(fullPath)) {
      return NextResponse.json({ thumbnail: episode.episodeThumbnail });
    }
  }

  // Also check if file exists on disk but DB wasn't updated (edge case)
  const thumbDir = path.join(process.cwd(), "public", "episode-thumbs");
  const thumbFilename = `${mediaAssetId}.jpg`;
  const thumbPath = path.join(thumbDir, thumbFilename);
  const publicPath = `/episode-thumbs/${thumbFilename}`;

  if (fs.existsSync(thumbPath)) {
    // Update DB and return
    db.update(schema.episodes)
      .set({ episodeThumbnail: publicPath })
      .where(eq(schema.episodes.mediaAssetId, mediaAssetId))
      .run();
    return NextResponse.json({ thumbnail: publicPath });
  }

  // 2. Check if file is available
  if (!episode.filepath || !episode.available) {
    return NextResponse.json({ error: "File not available", thumbnail: null }, { status: 200 });
  }

  if (!fs.existsSync(episode.filepath)) {
    return NextResponse.json({ error: "File not found on disk", thumbnail: null }, { status: 200 });
  }

  // 3. Deduplicate: if already generating for this ID, wait for it
  if (inFlight.has(mediaAssetId)) {
    const result = await inFlight.get(mediaAssetId);
    return NextResponse.json({ thumbnail: result });
  }

  // 4. Generate thumbnail with FFmpeg
  const generatePromise = generateThumbnail(episode.filepath, thumbPath, mediaAssetId, episode.runtime, db);
  inFlight.set(mediaAssetId, generatePromise);

  try {
    const result = await generatePromise;
    return NextResponse.json({ thumbnail: result });
  } finally {
    inFlight.delete(mediaAssetId);
  }
}

/**
 * POST /api/episode-thumbnail
 * Body: { id: number, timestamp: number }
 *
 * Regenerate thumbnail at a user-chosen timestamp.
 * Deletes existing cached thumbnail and creates a new one.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, timestamp } = body;

    if (!id || timestamp === undefined || timestamp === null) {
      return NextResponse.json({ error: "Missing id or timestamp" }, { status: 400 });
    }

    const mediaAssetId = parseInt(id, 10);
    if (isNaN(mediaAssetId) || isNaN(timestamp) || timestamp < 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { db } = getDb();

    const episode = db
      .select({
        filepath: schema.mediaAssets.filepath,
        available: schema.mediaAssets.available,
      })
      .from(schema.episodes)
      .leftJoin(schema.mediaAssets, eq(schema.episodes.mediaAssetId, schema.mediaAssets.id))
      .where(eq(schema.episodes.mediaAssetId, mediaAssetId))
      .get();

    if (!episode || !episode.filepath) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    if (!fs.existsSync(episode.filepath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const thumbDir = path.join(process.cwd(), "public", "episode-thumbs");
    const thumbFilename = `${mediaAssetId}.jpg`;
    const thumbPath = path.join(thumbDir, thumbFilename);
    const publicPath = `/episode-thumbs/${thumbFilename}`;

    // Delete existing thumbnail to force regeneration
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }

    // Generate at the exact timestamp
    const result = await generateThumbnailAtTimestamp(
      episode.filepath,
      thumbPath,
      mediaAssetId,
      timestamp,
      db
    );

    return NextResponse.json({ thumbnail: result, timestamp });
  } catch (err: any) {
    console.error("[Thumbnail] POST error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

async function generateThumbnailAtTimestamp(
  filepath: string,
  outputPath: string,
  mediaAssetId: number,
  timestamp: number,
  db: any
): Promise<string | null> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const publicPath = `/episode-thumbs/${mediaAssetId}.jpg`;

  try {
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-hide_banner",
        "-ss", timestamp.toString(),
        "-i", filepath,
        "-vframes", "1",
        "-q:v", "3",
        "-vf", "scale=640:-2",
        "-y",
        outputPath,
      ];

      const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });

      ffmpeg.on("close", (code) => {
        if (code === 0 && fs.existsSync(outputPath)) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
      ffmpeg.on("error", reject);

      setTimeout(() => {
        try { ffmpeg.kill("SIGTERM"); } catch { /* */ }
        reject(new Error("Timed out"));
      }, 15000);
    });

    db.update(schema.episodes)
      .set({ episodeThumbnail: publicPath })
      .where(eq(schema.episodes.mediaAssetId, mediaAssetId))
      .run();

    console.log(`[Thumbnail] Custom capture at ${timestamp}s: ${publicPath}`);
    return publicPath;
  } catch (err) {
    console.error(`[Thumbnail] Custom capture failed for ${mediaAssetId}:`, err);
    return null;
  }
}

async function generateThumbnail(
  filepath: string,
  outputPath: string,
  mediaAssetId: number,
  runtime: number | null | undefined,
  db: any
): Promise<string | null> {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const publicPath = `/episode-thumbs/${mediaAssetId}.jpg`;

  try {
    // Determine duration to use for the 1/3 mark.
    // If the DB has `runtime`, we MUST use it (runtime * 60) so our calculation 
    // exactly matches the client's HoverPreview which only has access to the DB runtime.
    // If we use ffprobe here, the exact file duration might differ slightly from the DB runtime,
    // causing a mismatch of a few seconds (a different scene).
    const duration = (runtime && runtime > 0) ? (runtime * 60) : await getVideoDuration(filepath);
    
    // Seek to exactly 1/3 of the video so HoverPreview can calculate the exact same timestamp
    const seekTime = Math.max(5, duration / 3);

    await new Promise<void>((resolve, reject) => {
      const args = [
        "-hide_banner",
        "-ss", seekTime.toString(),
        "-i", filepath,
        "-vframes", "1",
        "-q:v", "3",
        "-vf", "scale=640:-2",
        "-y",
        outputPath,
      ];

      const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });

      let stderr = "";
      ffmpeg.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-200)}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(err);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        try { ffmpeg.kill("SIGTERM"); } catch { /* */ }
        reject(new Error("FFmpeg thumbnail extraction timed out"));
      }, 15000);
    });

    // Update DB with the thumbnail path
    db.update(schema.episodes)
      .set({ episodeThumbnail: publicPath })
      .where(eq(schema.episodes.mediaAssetId, mediaAssetId))
      .run();

    console.log(`[Thumbnail] Generated: ${publicPath}`);
    return publicPath;
  } catch (err) {
    console.error(`[Thumbnail] Failed for asset ${mediaAssetId}:`, err);
    // Try a fallback: extract at 0 seconds (start of file)
    try {
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
          "-hide_banner",
          "-i", filepath,
          "-vframes", "1",
          "-q:v", "3",
          "-vf", "scale=640:-2",
          "-y",
          outputPath,
        ], { stdio: ["pipe", "pipe", "pipe"] });

        ffmpeg.on("close", (code) => {
          if (code === 0 && fs.existsSync(outputPath)) resolve();
          else reject(new Error(`Fallback failed with code ${code}`));
        });
        ffmpeg.on("error", reject);

        setTimeout(() => {
          try { ffmpeg.kill("SIGTERM"); } catch { /* */ }
          reject(new Error("Fallback timed out"));
        }, 10000);
      });

      db.update(schema.episodes)
        .set({ episodeThumbnail: publicPath })
        .where(eq(schema.episodes.mediaAssetId, mediaAssetId))
        .run();

      console.log(`[Thumbnail] Generated (fallback): ${publicPath}`);
      return publicPath;
    } catch {
      console.error(`[Thumbnail] Fallback also failed for asset ${mediaAssetId}`);
      return null;
    }
  }
}

/**
 * Get video duration in seconds using ffprobe
 */
function getVideoDuration(filepath: string): Promise<number> {
  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      filepath,
    ]);

    let output = "";
    ffprobe.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on("close", () => {
      const duration = parseFloat(output.trim());
      // Default to 600s (10 min) if ffprobe fails
      resolve(isNaN(duration) ? 600 : duration);
    });

    ffprobe.on("error", () => {
      resolve(600);
    });

    // Timeout
    setTimeout(() => {
      try { ffprobe.kill("SIGTERM"); } catch { /* */ }
      resolve(600);
    }, 5000);
  });
}
