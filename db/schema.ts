import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const mediaAssets = sqliteTable("media_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filepath: text("filepath").notNull().unique(),
  filename: text("filename").notNull(),
  source: text("source").notNull(), // 'local' | 'hdd'
  type: text("type").notNull(), // 'movie' | 'show'
  available: integer("available").notNull().default(1),
  fetchedAt: text("fetched_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  omdbConfirmed: integer("omdb_confirmed").notNull().default(1),
});

export const movies = sqliteTable("movies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaAssetId: integer("media_asset_id").notNull().unique(),
  title: text("title").notNull(),
  year: integer("year"),
  runtime: integer("runtime"),
  poster: text("poster"),
  backdrop: text("backdrop"),
  backdropUrl: text("backdrop_url"),
  overview: text("overview"),
  rating: text("rating"),
  genres: text("genres"),
  omdbId: text("omdb_id"),
});

export const tvShows = sqliteTable("tv_shows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  overview: text("overview"),
  poster: text("poster"),
  backdrop: text("backdrop"),
  backdropUrl: text("backdrop_url"),
  omdbId: text("omdb_id"),
  rating: text("rating"),
  genres: text("genres"),
});

export const episodes = sqliteTable("episodes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaAssetId: integer("media_asset_id").notNull().unique(),
  showId: integer("show_id").notNull(),
  seasonNumber: integer("season_number"),
  episodeStart: integer("episode_start"),
  episodeEnd: integer("episode_end"),
  runtime: integer("runtime"),
  episodeThumbnail: text("episode_thumbnail"),
});

export const playbackProgress = sqliteTable("playback_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaAssetId: integer("media_asset_id").notNull().unique(),
  watchProgress: integer("watch_progress").notNull().default(0),
  isWatched: integer("is_watched").notNull().default(0),
  isFavorite: integer("is_favorite").notNull().default(0),
  lastWatchedAt: text("last_watched_at"),
});

export const config = sqliteTable("config", {
  key: text("key").primaryKey(),
  value: text("value"),
});
