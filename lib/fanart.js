"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackdropForMovie = getBackdropForMovie;
exports.getBackdropForShow = getBackdropForShow;
const paths_1 = require("./paths");
const db_1 = require("./db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const api_1 = __importDefault(require("@fanart-tv/api"));
async function fetchWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Referer": new URL(url).origin + "/",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
        });
        clearTimeout(id);
        return response;
    }
    catch (err) {
        clearTimeout(id);
        throw err;
    }
}
async function downloadBackdrop(url, imdbId) {
    try {
        const dir = paths_1.PATHS.backdrops;
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        // Use the imdbId for the filename so we can rely on it locally
        const filename = `${imdbId}.jpg`;
        const filepath = path_1.default.join(dir, filename);
        if (fs_1.default.existsSync(filepath)) {
            console.log(`[Fanart] Backdrop already exists for ${imdbId}`);
            return paths_1.PATHS.backdropUrl(filename);
        }
        const res = await fetchWithTimeout(url, 5000);
        if (!res.ok)
            throw new Error(`Failed to fetch image: ${res.status}`);
        const buffer = await res.arrayBuffer();
        fs_1.default.writeFileSync(filepath, Buffer.from(buffer));
        console.log(`[Fanart] Downloaded backdrop for ${imdbId}`);
        return paths_1.PATHS.backdropUrl(filename);
    }
    catch (error) {
        console.error(`[Fanart] Download failed for ${url}:`, error);
        return null;
    }
}
async function getBackdropForMovie(imdbId) {
    const dbApiKey = (0, db_1.getConfig)("fanart_api_key");
    const FANART_API_KEY = dbApiKey || process.env.FANART_TV_API_KEY;
    if (!FANART_API_KEY || !imdbId)
        return null;
    try {
        const client = new api_1.default({
            apiKey: FANART_API_KEY,
            version: "v3.2",
        });
        const data = await client.getMovie(imdbId);
        if (!data.moviebackground || data.moviebackground.length === 0)
            return null;
        // Sort by likes descending
        const backdrops = data.moviebackground.sort((a, b) => parseInt(b.likes || "0") - parseInt(a.likes || "0"));
        const bestBackdrop = backdrops[0].url;
        const localPath = await downloadBackdrop(bestBackdrop, imdbId);
        if (!localPath)
            return null;
        return { backdropPath: localPath, backdropUrl: bestBackdrop };
    }
    catch (error) {
        // Expected if movie has no art or API limits out
        console.error(`[Fanart] Error fetching movie backdrop for ${imdbId}:`, error?.message || error);
        return null;
    }
}
async function getBackdropForShow(imdbId) {
    const dbApiKey = (0, db_1.getConfig)("fanart_api_key");
    const FANART_API_KEY = dbApiKey || process.env.FANART_TV_API_KEY;
    if (!FANART_API_KEY || !imdbId)
        return null;
    try {
        // 1. Convert IMDB ID to TVDB ID using TVMaze free API
        const tvmazeUrl = `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`;
        const tvmazeRes = await fetch(tvmazeUrl, { redirect: 'follow' });
        if (!tvmazeRes.ok) {
            console.log(`[Fanart] TVMaze lookup failed for ${imdbId}`);
            return null;
        }
        const tvmazeData = await tvmazeRes.json();
        const tvdbId = tvmazeData?.externals?.thetvdb;
        if (!tvdbId) {
            console.log(`[Fanart] No TVDB ID found for ${imdbId}`);
            return null;
        }
        // 2. Fetch images from Fanart.tv using the TVDB ID via the SDK
        const client = new api_1.default({
            apiKey: FANART_API_KEY,
            version: "v3.2",
        });
        const data = await client.getShow(tvdbId);
        if (!data.showbackground || data.showbackground.length === 0)
            return null;
        const backdrops = data.showbackground.sort((a, b) => parseInt(b.likes || "0") - parseInt(a.likes || "0"));
        const bestBackdrop = backdrops[0].url;
        const localPath = await downloadBackdrop(bestBackdrop, imdbId); // Save as imdbId.jpg for consistency
        if (!localPath)
            return null;
        return { backdropPath: localPath, backdropUrl: bestBackdrop };
    }
    catch (error) {
        console.error(`[Fanart] Error fetching show backdrop for ${imdbId}:`, error?.message || error);
        return null;
    }
}
