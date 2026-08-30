const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = 'C:\\Users\\krish\\AppData\\Roaming\\VidLock\\vidlock.db';
if (!fs.existsSync(dbPath)) {
  console.log("DB not found at:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
const rows = db.prepare(`
  SELECT ma.filename, ma.filepath, m.title, m.poster, m.backdrop, m.omdb_id 
  FROM media_assets ma 
  LEFT JOIN movies m ON ma.id = m.media_asset_id
  WHERE ma.type = 'movie'
`).all();
console.log(JSON.stringify(rows, null, 2));
db.close();
