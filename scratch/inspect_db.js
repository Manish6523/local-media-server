const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = 'C:\\Users\\krish\\AppData\\Roaming\\VidLock\\vidlock.db';
if (!fs.existsSync(dbPath)) {
  console.log("DB not found at:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
const rows = db.prepare('SELECT * FROM config').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
