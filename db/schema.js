"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.playbackProgress = exports.episodes = exports.tvShows = exports.movies = exports.mediaAssets = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.mediaAssets = (0, sqlite_core_1.sqliteTable)("media_assets", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    filepath: (0, sqlite_core_1.text)("filepath").notNull().unique(),
    filename: (0, sqlite_core_1.text)("filename").notNull(),
    source: (0, sqlite_core_1.text)("source").notNull(), // 'local' | 'hdd'
    type: (0, sqlite_core_1.text)("type").notNull(), // 'movie' | 'show'
    available: (0, sqlite_core_1.integer)("available").notNull().default(1),
    fetchedAt: (0, sqlite_core_1.text)("fetched_at"),
    createdAt: (0, sqlite_core_1.text)("created_at").notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    omdbConfirmed: (0, sqlite_core_1.integer)("omdb_confirmed").notNull().default(1),
});
exports.movies = (0, sqlite_core_1.sqliteTable)("movies", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    mediaAssetId: (0, sqlite_core_1.integer)("media_asset_id").notNull().unique(),
    title: (0, sqlite_core_1.text)("title").notNull(),
    year: (0, sqlite_core_1.integer)("year"),
    runtime: (0, sqlite_core_1.integer)("runtime"),
    poster: (0, sqlite_core_1.text)("poster"),
    backdrop: (0, sqlite_core_1.text)("backdrop"),
    backdropUrl: (0, sqlite_core_1.text)("backdrop_url"),
    overview: (0, sqlite_core_1.text)("overview"),
    rating: (0, sqlite_core_1.text)("rating"),
    genres: (0, sqlite_core_1.text)("genres"),
    omdbId: (0, sqlite_core_1.text)("omdb_id"),
});
exports.tvShows = (0, sqlite_core_1.sqliteTable)("tv_shows", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    title: (0, sqlite_core_1.text)("title").notNull(),
    overview: (0, sqlite_core_1.text)("overview"),
    poster: (0, sqlite_core_1.text)("poster"),
    backdrop: (0, sqlite_core_1.text)("backdrop"),
    backdropUrl: (0, sqlite_core_1.text)("backdrop_url"),
    omdbId: (0, sqlite_core_1.text)("omdb_id"),
    rating: (0, sqlite_core_1.text)("rating"),
    genres: (0, sqlite_core_1.text)("genres"),
});
exports.episodes = (0, sqlite_core_1.sqliteTable)("episodes", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    mediaAssetId: (0, sqlite_core_1.integer)("media_asset_id").notNull().unique(),
    showId: (0, sqlite_core_1.integer)("show_id").notNull(),
    seasonNumber: (0, sqlite_core_1.integer)("season_number"),
    episodeStart: (0, sqlite_core_1.integer)("episode_start"),
    episodeEnd: (0, sqlite_core_1.integer)("episode_end"),
    runtime: (0, sqlite_core_1.integer)("runtime"),
    episodeThumbnail: (0, sqlite_core_1.text)("episode_thumbnail"),
});
exports.playbackProgress = (0, sqlite_core_1.sqliteTable)("playback_progress", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    mediaAssetId: (0, sqlite_core_1.integer)("media_asset_id").notNull().unique(),
    watchProgress: (0, sqlite_core_1.integer)("watch_progress").notNull().default(0),
    isWatched: (0, sqlite_core_1.integer)("is_watched").notNull().default(0),
    isFavorite: (0, sqlite_core_1.integer)("is_favorite").notNull().default(0),
    lastWatchedAt: (0, sqlite_core_1.text)("last_watched_at"),
});
exports.config = (0, sqlite_core_1.sqliteTable)("config", {
    key: (0, sqlite_core_1.text)("key").primaryKey(),
    value: (0, sqlite_core_1.text)("value"),
});
