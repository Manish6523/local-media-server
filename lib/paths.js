"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATHS = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
function getDataPath() {
    // In Electron: use VIDLOCK_DATA_PATH set by main process
    // In development: use a 'data' folder in project root
    const dataPath = process.env.VIDLOCK_DATA_PATH
        || path_1.default.join(process.cwd(), 'data');
    // Ensure directory exists
    if (!fs_1.default.existsSync(dataPath)) {
        fs_1.default.mkdirSync(dataPath, { recursive: true });
    }
    return dataPath;
}
exports.PATHS = {
    data: getDataPath(),
    db: path_1.default.join(getDataPath(), 'vidlock.db'),
    posters: path_1.default.join(getDataPath(), 'posters'),
    backdrops: path_1.default.join(getDataPath(), 'backdrops'),
    thumbnails: path_1.default.join(getDataPath(), 'thumbnails'),
    hlsCache: path_1.default.join(os_1.default.tmpdir(), 'vidlock-cache'), // Temp dir for HLS
    // For serving static files, we also need the public URL path
    posterUrl: (id) => `/api/static/posters/${id}`,
    backdropUrl: (id) => `/api/static/backdrops/${id}`,
    thumbnailUrl: (id) => `/api/static/thumbnails/${id}`,
};
// Ensure all directories exist
Object.values(exports.PATHS)
    .filter(v => typeof v === 'string')
    .forEach(dir => {
    // Only attempt to mkdir for directories/files that don't look like URLs or files
    if (typeof dir === 'string' && !dir.startsWith('/') && !dir.endsWith('.db')) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
});
