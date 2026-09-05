import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, like, desc, asc, and } from "drizzle-orm";
import path from "path";
import { PATHS } from "./paths";
import fs from "fs";
import crypto from "crypto";
import * as schema from "../db/schema";

export interface MediaEntry {
  id: number;
  filepath: string;
  filename: string;
  source: "local" | "hdd" | "online";
  type: "movie" | "show";
  title: string;
  year: number | null;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
  omdb_id: string | null;
  poster: string | null;
  backdrop: string | null;
  backdrop_url: string | null;
  overview: string | null;
  rating: string | null;
  genres: string | null;
  runtime: number | null;
  available: number;
  fetched_at: string | null;
  created_at: string;
  last_watched_at: string | null;
  watch_progress: number;
  is_watched: number;
  is_favorite: number;
  omdb_confirmed: number;
  exactDuration?: number;
}

export interface ConfigEntry {
  key: string;
  value: string | null;
}

let sqliteDb: Database.Database | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (db) return { sqliteDb: sqliteDb!, db };

  const dbPath = PATHS.db;
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");

  // Ensure all tables exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filepath TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      fetched_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      omdb_confirmed INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_asset_id INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      year INTEGER,
      runtime INTEGER,
      poster TEXT,
      backdrop TEXT,
      backdrop_url TEXT,
      overview TEXT,
      rating TEXT,
      genres TEXT,
      omdb_id TEXT
    );
    CREATE TABLE IF NOT EXISTS tv_shows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      overview TEXT,
      poster TEXT,
      backdrop TEXT,
      backdrop_url TEXT,
      omdb_id TEXT,
      rating TEXT,
      genres TEXT
    );
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_asset_id INTEGER NOT NULL UNIQUE,
      show_id INTEGER NOT NULL,
      season_number INTEGER,
      episode_start INTEGER,
      episode_end INTEGER,
      runtime INTEGER,
      episode_thumbnail TEXT
    );
    CREATE TABLE IF NOT EXISTS playback_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_asset_id INTEGER NOT NULL UNIQUE,
      watch_progress INTEGER NOT NULL DEFAULT 0,
      is_watched INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      last_watched_at TEXT
    );
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  db = drizzle(sqliteDb, { schema });

  // Seed default config if empty
  const configCount = db.select().from(schema.config).all().length;
  if (configCount === 0) {
    // Generate OS-aware default path suggestions
    const isWindows = process.platform === "win32";
    const defaultLocalPath = process.env.LOCAL_MEDIA_PATH ||
      (isWindows ? path.join(require("os").homedir(), "Videos") : "");

    const initialPaths = defaultLocalPath ? [defaultLocalPath] : [];
    if (process.env.HDD_PATH) {
      initialPaths.push(process.env.HDD_PATH);
    }

    db.insert(schema.config).values([
      { key: "media_paths", value: JSON.stringify(initialPaths) },
      { key: "last_scan", value: null },
    ]).onConflictDoNothing().run();
  }

  return { sqliteDb, db };
}

// ---- Query Builders for Flat Interface ----

function mapToFlatEntry(asset: any, movie: any, show: any, episode: any, progress: any): MediaEntry {
  const isMovie = asset.type === "movie";
  return {
    id: asset.id,
    filepath: asset.filepath,
    filename: asset.filename,
    source: asset.source as "local" | "hdd" | "online",
    type: asset.type as "movie" | "show",
    title: isMovie ? movie?.title : show?.title,
    year: isMovie ? movie?.year : null,
    season: isMovie ? null : episode?.seasonNumber,
    episode_start: isMovie ? null : episode?.episodeStart,
    episode_end: isMovie ? null : episode?.episodeEnd,
    omdb_id: isMovie ? movie?.omdbId : show?.omdbId,
    poster: isMovie ? movie?.poster : show?.poster,
    backdrop: isMovie ? movie?.backdrop : show?.backdrop,
    backdrop_url: isMovie ? movie?.backdropUrl : show?.backdropUrl,
    overview: isMovie ? movie?.overview : show?.overview,
    rating: isMovie ? movie?.rating : show?.rating,
    genres: isMovie ? movie?.genres : show?.genres,
    runtime: isMovie ? movie?.runtime : episode?.runtime,
    available: asset.available ?? 1,
    fetched_at: asset.fetchedAt,
    created_at: asset.createdAt,
    last_watched_at: progress?.lastWatchedAt || null,
    watch_progress: progress?.watchProgress || 0,
    is_watched: progress?.isWatched || 0,
    is_favorite: progress?.isFavorite || 0,
    omdb_confirmed: asset.omdbConfirmed ?? 1,
  };
}

function fetchAllWithRelations() {
  const { db } = getDb();
  
  const results = db.select({
    asset: schema.mediaAssets,
    movie: schema.movies,
    episode: schema.episodes,
    show: schema.tvShows,
    progress: schema.playbackProgress,
  })
  .from(schema.mediaAssets)
  .leftJoin(schema.movies, eq(schema.mediaAssets.id, schema.movies.mediaAssetId))
  .leftJoin(schema.episodes, eq(schema.mediaAssets.id, schema.episodes.mediaAssetId))
  .leftJoin(schema.tvShows, eq(schema.episodes.showId, schema.tvShows.id))
  .leftJoin(schema.playbackProgress, eq(schema.mediaAssets.id, schema.playbackProgress.mediaAssetId))
  .all();

  return results.map(r => mapToFlatEntry(r.asset, r.movie, r.show, r.episode, r.progress));
}

export function getAllMedia(): MediaEntry[] {
  const all = fetchAllWithRelations();
  return all.sort((a, b) => {
    if (a.title !== b.title) return (a.title || "").localeCompare(b.title || "");
    if (a.season !== b.season) return (a.season || 0) - (b.season || 0);
    return (a.episode_start || 0) - (b.episode_start || 0);
  });
}

export function getMediaById(id: number): MediaEntry | undefined {
  const all = fetchAllWithRelations();
  return all.find(m => m.id === id);
}

export function getMediaByFilepath(filepath: string): MediaEntry | undefined {
  const all = fetchAllWithRelations();
  return all.find(m => m.filepath === filepath);
}

export function getMediaByType(type: "movie" | "show"): MediaEntry[] {
  const all = fetchAllWithRelations();
  return all.filter(m => m.type === type).sort((a, b) => {
    if (a.title !== b.title) return (a.title || "").localeCompare(b.title || "");
    if (a.season !== b.season) return (a.season || 0) - (b.season || 0);
    return (a.episode_start || 0) - (b.episode_start || 0);
  });
}

export function searchMedia(query: string): MediaEntry[] {
  const all = fetchAllWithRelations();
  const lower = query.toLowerCase();
  return all.filter(m => (m.title || "").toLowerCase().includes(lower)).sort((a, b) => (a.title || "").localeCompare(b.title || ""));
}

export function upsertMedia(entry: Omit<MediaEntry, "id" | "created_at" | "last_watched_at" | "watch_progress" | "is_watched" | "is_favorite">): number {
  const { db } = getDb();

  const existingAsset = db.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.filepath, entry.filepath)).get();
  
  let assetId: number;

  if (existingAsset) {
    db.update(schema.mediaAssets).set({
      filename: entry.filename,
      source: entry.source,
      type: entry.type,
      available: entry.available,
      fetchedAt: entry.fetched_at,
      omdbConfirmed: entry.omdb_confirmed,
    }).where(eq(schema.mediaAssets.id, existingAsset.id)).run();
    assetId = existingAsset.id;
  } else {
    const inserted = db.insert(schema.mediaAssets).values({
      filepath: entry.filepath,
      filename: entry.filename,
      source: entry.source,
      type: entry.type,
      available: entry.available,
      fetchedAt: entry.fetched_at,
      omdbConfirmed: entry.omdb_confirmed,
    }).returning({ id: schema.mediaAssets.id }).get();
    assetId = inserted.id;
    
    // Initialize playback progress
    db.insert(schema.playbackProgress).values({ mediaAssetId: assetId }).run();
  }

  if (entry.type === "movie") {
    const existingMovie = db.select().from(schema.movies).where(eq(schema.movies.mediaAssetId, assetId)).get();
    if (existingMovie) {
      db.update(schema.movies).set({
        title: entry.title,
        year: entry.year,
        runtime: entry.runtime,
        poster: entry.poster,
        backdrop: entry.backdrop,
        backdropUrl: entry.backdrop_url,
        overview: entry.overview,
        rating: entry.rating,
        genres: entry.genres,
        omdbId: entry.omdb_id,
      }).where(eq(schema.movies.mediaAssetId, assetId)).run();
    } else {
      db.insert(schema.movies).values({
        mediaAssetId: assetId,
        title: entry.title,
        year: entry.year,
        runtime: entry.runtime,
        poster: entry.poster,
        backdrop: entry.backdrop,
        backdropUrl: entry.backdrop_url,
        overview: entry.overview,
        rating: entry.rating,
        genres: entry.genres,
        omdbId: entry.omdb_id,
      }).run();
    }
  } else if (entry.type === "show") {
    // Upsert tvShow
    let tvShow = db.select().from(schema.tvShows).where(eq(schema.tvShows.title, entry.title)).get();
    if (!tvShow) {
      tvShow = db.insert(schema.tvShows).values({
        title: entry.title,
        overview: entry.overview,
        poster: entry.poster,
        backdrop: entry.backdrop,
        backdropUrl: entry.backdrop_url,
        omdbId: entry.omdb_id,
        rating: entry.rating,
        genres: entry.genres,
      }).returning().get();
    } else {
      // Update show data if provided
      db.update(schema.tvShows).set({
        overview: entry.overview || tvShow.overview,
        poster: entry.poster || tvShow.poster,
        backdrop: entry.backdrop || tvShow.backdrop,
        backdropUrl: entry.backdrop_url || tvShow.backdropUrl,
      }).where(eq(schema.tvShows.id, tvShow.id)).run();
    }

    // Upsert episode
    const existingEpisode = db.select().from(schema.episodes).where(eq(schema.episodes.mediaAssetId, assetId)).get();
    if (existingEpisode) {
      db.update(schema.episodes).set({
        showId: tvShow.id,
        seasonNumber: entry.season,
        episodeStart: entry.episode_start,
        episodeEnd: entry.episode_end,
        runtime: entry.runtime,
      }).where(eq(schema.episodes.mediaAssetId, assetId)).run();
    } else {
      db.insert(schema.episodes).values({
        mediaAssetId: assetId,
        showId: tvShow.id,
        seasonNumber: entry.season,
        episodeStart: entry.episode_start,
        episodeEnd: entry.episode_end,
        runtime: entry.runtime,
      }).run();
    }
  }

  return assetId;
}

export function updateAvailability(source: "local" | "hdd", available: number): void {
  const { db } = getDb();
  db.update(schema.mediaAssets).set({ available }).where(eq(schema.mediaAssets.source, source)).run();
}

export function deleteMissingMedia(source: "local" | "hdd", validPaths: string[]): number {
  const { db } = getDb();
  const rows = db.select({ id: schema.mediaAssets.id, filepath: schema.mediaAssets.filepath }).from(schema.mediaAssets).where(eq(schema.mediaAssets.source, source)).all();
  const validSet = new Set(validPaths);
  let deletedCount = 0;
  
  for (const row of rows) {
    if (!validSet.has(row.filepath)) {
      // Delete child rows first to satisfy foreign key constraints
      db.delete(schema.episodes).where(eq(schema.episodes.mediaAssetId, row.id)).run();
      db.delete(schema.movies).where(eq(schema.movies.mediaAssetId, row.id)).run();
      db.delete(schema.playbackProgress).where(eq(schema.playbackProgress.mediaAssetId, row.id)).run();
      
      // Now safe to delete parent
      db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, row.id)).run();
      deletedCount++;
    }
  }
  
  return deletedCount;
}

export function clearMediaLibrary(): void {
  const { db } = getDb();
  // Delete child tables first
  db.delete(schema.playbackProgress).run();
  db.delete(schema.movies).run();
  db.delete(schema.episodes).run();
  // Delete parent tables
  db.delete(schema.mediaAssets).run();
  db.delete(schema.tvShows).run();
}

export function getMediaStats(): { totalMovies: number; totalShows: number; totalFiles: number } {
  const { db } = getDb();
  const totalFiles = db.select().from(schema.mediaAssets).all().length;
  const totalMovies = db.select().from(schema.movies).all().length;
  const totalShows = db.select().from(schema.tvShows).all().length;
  return {
    totalMovies,
    totalShows,
    totalFiles,
  };
}

export function getConfig(key: string): string | null {
  const { db } = getDb();
  const row = db.select().from(schema.config).where(eq(schema.config.key, key)).get();
  return row?.value ?? null;
}

export function setConfig(key: string, value: string | null): void {
  const { db } = getDb();
  db.insert(schema.config).values({ key, value }).onConflictDoUpdate({ target: schema.config.key, set: { value } }).run();
}

export function getMediaPaths(): string[] {
  const val = getConfig("media_paths");
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

export function setMediaPaths(paths: string[]): void {
  setConfig("media_paths", JSON.stringify(paths));
}

// ---- Show offline media setting ----

export function getShowOfflineMedia(): boolean {
  const val = getConfig("show_offline_media");
  return val === null ? true : val === "true"; // default: show offline media
}

export function setShowOfflineMedia(show: boolean): void {
  setConfig("show_offline_media", show.toString());
}

export function getShowMetadataByTitle(title: string): any {
  const { sqliteDb } = getDb();
  const row = sqliteDb.prepare(
    `SELECT omdb_id, title as confirmed_title, poster, backdrop, 
            backdrop_url, overview, rating, genres
     FROM tv_shows 
     WHERE LOWER(title) = ? AND omdb_id IS NOT NULL 
     LIMIT 1`
  ).get(title.toLowerCase());
  return row;
}

// ---- PIN Protection ----

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export function getPinEnabled(): boolean {
  const { sqliteDb } = getDb();
  const row = sqliteDb.prepare(
    `SELECT value FROM config WHERE key = 'admin_pin_enabled'`
  ).get() as { value: string } | undefined;
  return row?.value === "true";
}

export function setPin(pin: string) {
  const hash = hashPin(pin);
  setConfig("admin_pin_hash", hash);
  setConfig("admin_pin_enabled", "true");
}

export function disablePin() {
  setConfig("admin_pin_enabled", "false");
}

export function verifyPin(pin: string): boolean {
  const { sqliteDb } = getDb();
  const row = sqliteDb.prepare(
    `SELECT value FROM config WHERE key = 'admin_pin_hash'`
  ).get() as { value: string } | undefined;
  if (!row) return false;
  return row.value === hashPin(pin);
}
