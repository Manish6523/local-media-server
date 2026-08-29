"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.getAllMedia = getAllMedia;
exports.getMediaById = getMediaById;
exports.getMediaByFilepath = getMediaByFilepath;
exports.getMediaByType = getMediaByType;
exports.searchMedia = searchMedia;
exports.upsertMedia = upsertMedia;
exports.updateAvailability = updateAvailability;
exports.deleteMissingMedia = deleteMissingMedia;
exports.clearMediaLibrary = clearMediaLibrary;
exports.getMediaStats = getMediaStats;
exports.getConfig = getConfig;
exports.setConfig = setConfig;
exports.getMediaPaths = getMediaPaths;
exports.setMediaPaths = setMediaPaths;
exports.getShowOfflineMedia = getShowOfflineMedia;
exports.setShowOfflineMedia = setShowOfflineMedia;
exports.getShowMetadataByTitle = getShowMetadataByTitle;
exports.getPinEnabled = getPinEnabled;
exports.setPin = setPin;
exports.disablePin = disablePin;
exports.verifyPin = verifyPin;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const better_sqlite3_2 = require("drizzle-orm/better-sqlite3");
const drizzle_orm_1 = require("drizzle-orm");
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
const crypto_1 = __importDefault(require("crypto"));
const schema = __importStar(require("../db/schema"));
let sqliteDb = null;
let db = null;
function getDb() {
    if (db)
        return { sqliteDb: sqliteDb, db };
    const dbPath = paths_1.PATHS.db;
    sqliteDb = new better_sqlite3_1.default(dbPath);
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
    db = (0, better_sqlite3_2.drizzle)(sqliteDb, { schema });
    // Seed default config if empty
    const configCount = db.select().from(schema.config).all().length;
    if (configCount === 0) {
        // Generate OS-aware default path suggestions
        const isWindows = process.platform === "win32";
        const defaultLocalPath = process.env.LOCAL_MEDIA_PATH ||
            (isWindows ? path_1.default.join(require("os").homedir(), "Videos") : "");
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
function mapToFlatEntry(asset, movie, show, episode, progress) {
    const isMovie = asset.type === "movie";
    return {
        id: asset.id,
        filepath: asset.filepath,
        filename: asset.filename,
        source: asset.source,
        type: asset.type,
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
        .leftJoin(schema.movies, (0, drizzle_orm_1.eq)(schema.mediaAssets.id, schema.movies.mediaAssetId))
        .leftJoin(schema.episodes, (0, drizzle_orm_1.eq)(schema.mediaAssets.id, schema.episodes.mediaAssetId))
        .leftJoin(schema.tvShows, (0, drizzle_orm_1.eq)(schema.episodes.showId, schema.tvShows.id))
        .leftJoin(schema.playbackProgress, (0, drizzle_orm_1.eq)(schema.mediaAssets.id, schema.playbackProgress.mediaAssetId))
        .all();
    return results.map(r => mapToFlatEntry(r.asset, r.movie, r.show, r.episode, r.progress));
}
function getAllMedia() {
    const all = fetchAllWithRelations();
    return all.sort((a, b) => {
        if (a.title !== b.title)
            return a.title.localeCompare(b.title);
        if (a.season !== b.season)
            return (a.season || 0) - (b.season || 0);
        return (a.episode_start || 0) - (b.episode_start || 0);
    });
}
function getMediaById(id) {
    const all = fetchAllWithRelations();
    return all.find(m => m.id === id);
}
function getMediaByFilepath(filepath) {
    const all = fetchAllWithRelations();
    return all.find(m => m.filepath === filepath);
}
function getMediaByType(type) {
    const all = fetchAllWithRelations();
    return all.filter(m => m.type === type).sort((a, b) => {
        if (a.title !== b.title)
            return a.title.localeCompare(b.title);
        if (a.season !== b.season)
            return (a.season || 0) - (b.season || 0);
        return (a.episode_start || 0) - (b.episode_start || 0);
    });
}
function searchMedia(query) {
    const all = fetchAllWithRelations();
    const lower = query.toLowerCase();
    return all.filter(m => m.title.toLowerCase().includes(lower)).sort((a, b) => a.title.localeCompare(b.title));
}
function upsertMedia(entry) {
    const { db } = getDb();
    const existingAsset = db.select().from(schema.mediaAssets).where((0, drizzle_orm_1.eq)(schema.mediaAssets.filepath, entry.filepath)).get();
    let assetId;
    if (existingAsset) {
        db.update(schema.mediaAssets).set({
            filename: entry.filename,
            source: entry.source,
            type: entry.type,
            available: entry.available,
            fetchedAt: entry.fetched_at,
            omdbConfirmed: entry.omdb_confirmed,
        }).where((0, drizzle_orm_1.eq)(schema.mediaAssets.id, existingAsset.id)).run();
        assetId = existingAsset.id;
    }
    else {
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
        const existingMovie = db.select().from(schema.movies).where((0, drizzle_orm_1.eq)(schema.movies.mediaAssetId, assetId)).get();
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
            }).where((0, drizzle_orm_1.eq)(schema.movies.mediaAssetId, assetId)).run();
        }
        else {
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
    }
    else if (entry.type === "show") {
        // Upsert tvShow
        let tvShow = db.select().from(schema.tvShows).where((0, drizzle_orm_1.eq)(schema.tvShows.title, entry.title)).get();
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
        }
        else {
            // Update show data if provided
            db.update(schema.tvShows).set({
                overview: entry.overview || tvShow.overview,
                poster: entry.poster || tvShow.poster,
                backdrop: entry.backdrop || tvShow.backdrop,
                backdropUrl: entry.backdrop_url || tvShow.backdropUrl,
            }).where((0, drizzle_orm_1.eq)(schema.tvShows.id, tvShow.id)).run();
        }
        // Upsert episode
        const existingEpisode = db.select().from(schema.episodes).where((0, drizzle_orm_1.eq)(schema.episodes.mediaAssetId, assetId)).get();
        if (existingEpisode) {
            db.update(schema.episodes).set({
                showId: tvShow.id,
                seasonNumber: entry.season,
                episodeStart: entry.episode_start,
                episodeEnd: entry.episode_end,
                runtime: entry.runtime,
            }).where((0, drizzle_orm_1.eq)(schema.episodes.mediaAssetId, assetId)).run();
        }
        else {
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
function updateAvailability(source, available) {
    const { db } = getDb();
    db.update(schema.mediaAssets).set({ available }).where((0, drizzle_orm_1.eq)(schema.mediaAssets.source, source)).run();
}
function deleteMissingMedia(source, validPaths) {
    const { db } = getDb();
    const rows = db.select({ id: schema.mediaAssets.id, filepath: schema.mediaAssets.filepath }).from(schema.mediaAssets).where((0, drizzle_orm_1.eq)(schema.mediaAssets.source, source)).all();
    const validSet = new Set(validPaths);
    let deletedCount = 0;
    for (const row of rows) {
        if (!validSet.has(row.filepath)) {
            // Delete child rows first to satisfy foreign key constraints
            db.delete(schema.episodes).where((0, drizzle_orm_1.eq)(schema.episodes.mediaAssetId, row.id)).run();
            db.delete(schema.movies).where((0, drizzle_orm_1.eq)(schema.movies.mediaAssetId, row.id)).run();
            db.delete(schema.playbackProgress).where((0, drizzle_orm_1.eq)(schema.playbackProgress.mediaAssetId, row.id)).run();
            // Now safe to delete parent
            db.delete(schema.mediaAssets).where((0, drizzle_orm_1.eq)(schema.mediaAssets.id, row.id)).run();
            deletedCount++;
        }
    }
    return deletedCount;
}
function clearMediaLibrary() {
    const { db } = getDb();
    // Delete child tables first
    db.delete(schema.playbackProgress).run();
    db.delete(schema.movies).run();
    db.delete(schema.episodes).run();
    // Delete parent tables
    db.delete(schema.mediaAssets).run();
    db.delete(schema.tvShows).run();
}
function getMediaStats() {
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
function getConfig(key) {
    const { db } = getDb();
    const row = db.select().from(schema.config).where((0, drizzle_orm_1.eq)(schema.config.key, key)).get();
    return row?.value ?? null;
}
function setConfig(key, value) {
    const { db } = getDb();
    db.insert(schema.config).values({ key, value }).onConflictDoUpdate({ target: schema.config.key, set: { value } }).run();
}
function getMediaPaths() {
    const val = getConfig("media_paths");
    if (!val)
        return [];
    try {
        return JSON.parse(val);
    }
    catch {
        return [];
    }
}
function setMediaPaths(paths) {
    setConfig("media_paths", JSON.stringify(paths));
}
// ---- Show offline media setting ----
function getShowOfflineMedia() {
    const val = getConfig("show_offline_media");
    return val === null ? true : val === "true"; // default: show offline media
}
function setShowOfflineMedia(show) {
    setConfig("show_offline_media", show.toString());
}
function getShowMetadataByTitle(title) {
    const { sqliteDb } = getDb();
    const row = sqliteDb.prepare(`SELECT omdb_id, title as confirmed_title, poster, backdrop, 
            backdrop_url, overview, rating, genres
     FROM tv_shows 
     WHERE LOWER(title) = ? AND omdb_id IS NOT NULL 
     LIMIT 1`).get(title.toLowerCase());
    return row;
}
// ---- PIN Protection ----
function hashPin(pin) {
    return crypto_1.default.createHash("sha256").update(pin).digest("hex");
}
function getPinEnabled() {
    const { sqliteDb } = getDb();
    const row = sqliteDb.prepare(`SELECT value FROM config WHERE key = 'admin_pin_enabled'`).get();
    return row?.value === "true";
}
function setPin(pin) {
    const { sqliteDb } = getDb();
    const hash = hashPin(pin);
    sqliteDb.prepare(`INSERT INTO config (key, value) VALUES ('admin_pin_hash', ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`).run(hash, hash);
    sqliteDb.prepare(`INSERT INTO config (key, value) VALUES ('admin_pin_enabled', 'true')
     ON CONFLICT(key) DO UPDATE SET value = 'true'`).run();
}
function disablePin() {
    const { sqliteDb } = getDb();
    sqliteDb.prepare(`INSERT INTO config (key, value) VALUES ('admin_pin_enabled', 'false')
     ON CONFLICT(key) DO UPDATE SET value = 'false'`).run();
}
function verifyPin(pin) {
    const { sqliteDb } = getDb();
    const row = sqliteDb.prepare(`SELECT value FROM config WHERE key = 'admin_pin_hash'`).get();
    if (!row)
        return false;
    return row.value === hashPin(pin);
}
