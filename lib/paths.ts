import path from 'path';
import fs from 'fs';
import os from 'os';

function getDataPath(): string {
  // In Electron: use VIDLOCK_DATA_PATH set by main process
  // In development: use a 'data' folder in project root
  const dataPath = process.env.VIDLOCK_DATA_PATH
    || path.join(process.cwd(), 'data');

  // Ensure directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}

export const PATHS = {
  data: getDataPath(),
  db: path.join(getDataPath(), 'vidlock.db'),
  posters: path.join(getDataPath(), 'posters'),
  backdrops: path.join(getDataPath(), 'backdrops'),
  thumbnails: path.join(getDataPath(), 'thumbnails'),
  hlsCache: path.join(os.tmpdir(), 'vidlock-cache'), // Temp dir for HLS
  // For serving static files, we also need the public URL path
  posterUrl: (id: string) => `/api/static/posters/${id}`,
  backdropUrl: (id: string) => `/api/static/backdrops/${id}`,
  thumbnailUrl: (id: string) => `/api/static/thumbnails/${id}`,
};

// Ensure all directories exist
Object.values(PATHS)
  .filter(v => typeof v === 'string')
  .forEach(dir => {
    // Only attempt to mkdir for directories/files that don't look like URLs or files
    if (typeof dir === 'string' && !dir.startsWith('/') && !dir.endsWith('.db')) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  });
