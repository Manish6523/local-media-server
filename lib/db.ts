import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface MediaEntry {
  id: number;
  filepath: string;
  filename: string;
  source: "local" | "hdd";
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
}

export interface ConfigEntry {
  key: string;
  value: string | null;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = path.join(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "media.db");
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma("journal_mode = WAL");

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS media (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      filepath       TEXT UNIQUE NOT NULL,
      filename       TEXT NOT NULL,
      source         TEXT NOT NULL,
      type           TEXT NOT NULL,
      title          TEXT NOT NULL,
      year           INTEGER,
      season         INTEGER,
      episode_start  INTEGER,
      episode_end    INTEGER,
      omdb_id        TEXT,
      poster         TEXT,
      backdrop       TEXT,
      backdrop_url   TEXT,
      overview       TEXT,
      rating         TEXT,
      genres         TEXT,
      runtime        INTEGER,
      available      INTEGER DEFAULT 1,
      fetched_at     DATETIME,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_watched_at DATETIME,
      watch_progress INTEGER DEFAULT 0,
      is_watched     INTEGER DEFAULT 0,
      is_favorite    INTEGER DEFAULT 0,
      omdb_confirmed INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Automatic Migrations for new columns
  const tableInfo = db.prepare("PRAGMA table_info(media)").all() as { name: string }[];
  const existingColumns = new Set(tableInfo.map((c) => c.name));

  if (!existingColumns.has("last_watched_at")) {
    db.exec("ALTER TABLE media ADD COLUMN last_watched_at DATETIME;");
  }
  if (!existingColumns.has("watch_progress")) {
    db.exec("ALTER TABLE media ADD COLUMN watch_progress INTEGER DEFAULT 0;");
  }
  if (!existingColumns.has("is_watched")) {
    db.exec("ALTER TABLE media ADD COLUMN is_watched INTEGER DEFAULT 0;");
  }
  if (!existingColumns.has("is_favorite")) {
    db.exec("ALTER TABLE media ADD COLUMN is_favorite INTEGER DEFAULT 0;");
  }
  if (!existingColumns.has("omdb_confirmed")) {
    db.exec("ALTER TABLE media ADD COLUMN omdb_confirmed INTEGER DEFAULT 1;");
  }
  if (!existingColumns.has("backdrop")) {
    db.exec("ALTER TABLE media ADD COLUMN backdrop TEXT;");
  }
  if (!existingColumns.has("backdrop_url")) {
    db.exec("ALTER TABLE media ADD COLUMN backdrop_url TEXT;");
  }

  // Seed default config if empty
  const configCount = db.prepare("SELECT COUNT(*) as count FROM config").get() as { count: number };
  if (configCount.count === 0) {
    const insert = db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)");
    insert.run("local_path", process.env.LOCAL_MEDIA_PATH || "/home/manish-arch/EveryThing/series/media/");
    insert.run("hdd_path", process.env.HDD_PATH || "/run/media/manish-arch/HDD/");
    insert.run("last_scan", null);
  }

  return db;
}

// ---- Media helpers ----

export function getAllMedia(): MediaEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media ORDER BY title ASC, season ASC, episode_start ASC").all() as MediaEntry[];
}

export function getMediaById(id: number): MediaEntry | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM media WHERE id = ?").get(id) as MediaEntry | undefined;
}

export function getMediaByFilepath(filepath: string): MediaEntry | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM media WHERE filepath = ?").get(filepath) as MediaEntry | undefined;
}

export function getMediaByType(type: "movie" | "show"): MediaEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media WHERE type = ? ORDER BY title ASC, season ASC, episode_start ASC").all(type) as MediaEntry[];
}

export function searchMedia(query: string): MediaEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media WHERE title LIKE ? ORDER BY title ASC").all(`%${query}%`) as MediaEntry[];
}

export function upsertMedia(entry: Omit<MediaEntry, "id" | "created_at" | "last_watched_at" | "watch_progress" | "is_watched" | "is_favorite">): number {
  const db = getDb();

  const existing = getMediaByFilepath(entry.filepath);
  if (existing) {
    // Update existing entry
    db.prepare(`
      UPDATE media SET
        filename = ?, source = ?, type = ?, title = ?, year = ?,
        season = ?, episode_start = ?, episode_end = ?,
        omdb_id = COALESCE(?, omdb_id),
        poster = COALESCE(?, poster),
        backdrop = COALESCE(?, backdrop),
        backdrop_url = COALESCE(?, backdrop_url),
        overview = COALESCE(?, overview),
        rating = COALESCE(?, rating),
        genres = COALESCE(?, genres),
        runtime = COALESCE(?, runtime),
        available = ?,
        fetched_at = COALESCE(?, fetched_at),
        omdb_confirmed = ?
      WHERE filepath = ?
    `).run(
      entry.filename, entry.source, entry.type, entry.title, entry.year,
      entry.season, entry.episode_start, entry.episode_end,
      entry.omdb_id, entry.poster, entry.backdrop, entry.backdrop_url,
      entry.overview, entry.rating, entry.genres, entry.runtime,
      entry.available, entry.fetched_at, entry.omdb_confirmed ?? 1,
      entry.filepath
    );
    return existing.id;
  } else {
    // Insert new entry
    const result = db.prepare(`
      INSERT INTO media (
        filepath, filename, source, type, title, year,
        season, episode_start, episode_end,
        omdb_id, poster, backdrop, backdrop_url, overview, rating, genres, runtime,
        available, fetched_at, omdb_confirmed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.filepath, entry.filename, entry.source, entry.type, entry.title, entry.year,
      entry.season, entry.episode_start, entry.episode_end,
      entry.omdb_id, entry.poster, entry.backdrop, entry.backdrop_url,
      entry.overview, entry.rating, entry.genres, entry.runtime,
      entry.available, entry.fetched_at, entry.omdb_confirmed ?? 1
    );
    return Number(result.lastInsertRowid);
  }
}

export function updateAvailability(source: string, available: number): void {
  const db = getDb();
  db.prepare("UPDATE media SET available = ? WHERE source = ?").run(available, source);
}

export function deleteMissingMedia(source: "local" | "hdd", validPaths: string[]): number {
  const db = getDb();
  const rows = db.prepare("SELECT id, filepath FROM media WHERE source = ?").all(source) as {id: number, filepath: string}[];
  const validSet = new Set(validPaths);
  let deletedCount = 0;
  
  const deleteStmt = db.prepare("DELETE FROM media WHERE id = ?");
  db.transaction(() => {
    for (const row of rows) {
      if (!validSet.has(row.filepath)) {
        deleteStmt.run(row.id);
        deletedCount++;
      }
    }
  })();
  
  return deletedCount;
}

export function clearMediaLibrary(): void {
  const db = getDb();
  db.prepare("DELETE FROM media").run();
}

export function getMediaStats(): { totalMovies: number; totalShows: number; totalFiles: number } {
  const db = getDb();
  const movies = db.prepare("SELECT COUNT(*) as count FROM media WHERE type = 'movie'").get() as { count: number };
  const shows = db.prepare("SELECT COUNT(DISTINCT title) as count FROM media WHERE type = 'show'").get() as { count: number };
  const totalFiles = db.prepare("SELECT COUNT(*) as count FROM media").get() as { count: number };
  return {
    totalMovies: movies.count,
    totalShows: shows.count,
    totalFiles: totalFiles.count,
  };
}

// ---- Config helpers ----

export function getConfig(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM config WHERE key = ?").get(key) as ConfigEntry | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string | null): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
}
