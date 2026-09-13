import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

async function main() {
  process.env.VIDLOCK_DATA_PATH = mkdtempSync(path.join(tmpdir(), "vidlock-review-"));
  const { getDb, setConfig, setPin, getMediaByFilepath, upsertMedia } = await import("../lib/db");
  const { mediaFiles } = await import("../db/schema");
  const { GET, POST } = await import("../app/(main)/api/admin/manual-match/route");
  const { processLibraryFile } = await import("../lib/metadata-matcher");
  const { db, sqliteDb } = getDb();
  setConfig("omdb_api_key", "test-key");
  const rows = ["opaque-one.mkv", "opaque-two.mkv"].map(name => db.insert(mediaFiles).values({ filePath: path.join(process.env.VIDLOCK_DATA_PATH!, name), status: "unmatched" }).returning().get());
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ Response: "True", imdbID: "tt0903747", Title: "Breaking Bad", Type: "series", Year: "2008", Poster: "https://example.com/poster.jpg", Plot: "Series plot" });
  };
  const post = (files: unknown[]) => POST(new Request("http://localhost/api/admin/manual-match", { method: "POST", body: JSON.stringify({ imdbId: "tt0903747", type: "episode", files }) }));
  assert.equal((await GET(new Request("http://localhost/api/admin/manual-match"))).status, 200);
  assert.equal((await post([{ id: rows[0].id, season: 1, episode: 0 }])).status, 400);
  assert.equal(calls, 0);
  const response = await post(rows.map((r, i) => ({ id: r.id, season: 2, episode: i + 3 })));
  assert.equal(response.status, 200, await response.text());
  assert.equal(calls, 1, "batch fetches details once");
  for (const [i, row] of rows.entries()) {
    const media = getMediaByFilepath(row.filePath)!;
    assert.equal(media.type, "show");
    assert.equal(media.episode_start, i + 3);
    assert.equal(media.poster, "https://example.com/poster.jpg");
    const cached = await processLibraryFile(row.filePath);
    assert.equal(cached.matchSource, "manual");
    assert.equal(cached.season, 2);
  }
  assert.equal(calls, 1, "rescanning uses manual cache");
  assert.equal((await (await GET(new Request("http://localhost/api/admin/manual-match"))).json()).files.length, 0);
  const existing = getMediaByFilepath(rows[0].filePath)!;
  upsertMedia({ ...existing, type: "movie", season: null, episode_start: null, episode_end: null });
  assert.equal((sqliteDb.prepare("SELECT COUNT(*) as n FROM episodes WHERE media_asset_id = ?").get(existing.id) as { n: number }).n, 0);
  assert.equal(getMediaByFilepath(rows[0].filePath)!.type, "movie");
  setPin("1234");
  assert.equal((await GET(new Request("http://localhost/api/admin/manual-match"))).status, 401);
  sqliteDb.close();
  console.log("Manual matching: batch save, validation, cache, queue removal, conversion and auth passed.");
}
void main();
