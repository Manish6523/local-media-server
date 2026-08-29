"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOMDB = fetchOMDB;
exports.downloadPoster = downloadPoster;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const paths_1 = require("./paths");
const API_KEY = process.env.OMDB_API_KEY || "";
const BASE_URL = "http://www.omdbapi.com/";
/**
 * Fetch metadata from OMDB API for a given title.
 * Implements fallback strategy:
 *   1. Search with title + type + year
 *   2. Retry without year if not found
 *   3. Return null if still not found (don't block scan)
 */
async function fetchOMDB(title, type, year) {
    if (!API_KEY) {
        console.warn("[OMDB] No API key configured. Skipping fetch.");
        return null;
    }
    const omdbType = type === "show" ? "series" : "movie";
    // Attempt 1: With year
    let url = `${BASE_URL}?t=${encodeURIComponent(title)}&type=${omdbType}&apikey=${API_KEY}`;
    if (year) {
        url += `&y=${year}`;
    }
    try {
        let data = await httpGet(url);
        // If not found and we used a year, retry without year
        if (data.Response === "False" && year) {
            console.log(`[OMDB] Not found with year ${year}, retrying without year: "${title}"`);
            const fallbackUrl = `${BASE_URL}?t=${encodeURIComponent(title)}&type=${omdbType}&apikey=${API_KEY}`;
            data = await httpGet(fallbackUrl);
        }
        // If still not found, try with just title (no type constraint)
        if (data.Response === "False") {
            console.log(`[OMDB] Not found as ${omdbType}, trying without type: "${title}"`);
            const fallbackUrl2 = `${BASE_URL}?t=${encodeURIComponent(title)}&apikey=${API_KEY}`;
            data = await httpGet(fallbackUrl2);
        }
        if (data.Response === "False") {
            console.log(`[OMDB] Not found: "${title}" — ${data.Error}`);
            return null;
        }
        // Parse runtime: "45 min" → 45
        let runtime = null;
        if (data.Runtime && data.Runtime !== "N/A") {
            const runtimeMatch = data.Runtime.match(/(\d+)/);
            if (runtimeMatch) {
                runtime = parseInt(runtimeMatch[1], 10);
            }
        }
        // Parse year
        let parsedYear = null;
        if (data.Year && data.Year !== "N/A") {
            // Year can be "2019–2024" for series, take the start year
            const yearMatch = data.Year.match(/(\d{4})/);
            if (yearMatch) {
                parsedYear = parseInt(yearMatch[1], 10);
            }
        }
        // Download poster
        let posterPath = null;
        if (data.Poster && data.Poster !== "N/A") {
            posterPath = await downloadPoster(data.imdbID, data.Poster);
        }
        return {
            omdb_id: data.imdbID,
            confirmed_title: data.Title,
            year: parsedYear,
            poster: posterPath,
            overview: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
            rating: data.imdbRating && data.imdbRating !== "N/A" ? `${data.imdbRating}/10` : null,
            genres: data.Genre && data.Genre !== "N/A" ? data.Genre : null,
            runtime,
        };
    }
    catch (err) {
        console.error(`[OMDB] Fetch error for "${title}":`, err);
        return null;
    }
}
/**
 * Download a poster image to /public/posters/[imdbID].jpg
 * Skips if file already exists.
 */
async function downloadPoster(imdbID, url) {
    const postersDir = paths_1.PATHS.posters;
    if (!fs_1.default.existsSync(postersDir)) {
        fs_1.default.mkdirSync(postersDir, { recursive: true });
    }
    const filename = `${imdbID}.jpg`;
    const filepath = path_1.default.join(postersDir, filename);
    // Don't re-download
    if (fs_1.default.existsSync(filepath)) {
        console.log(`[OMDB] Poster already exists for ${imdbID}`);
        return paths_1.PATHS.posterUrl(filename);
    }
    try {
        await downloadFile(url, filepath);
        return paths_1.PATHS.posterUrl(filename);
    }
    catch (err) {
        console.error(`[OMDB] Failed to download poster for ${imdbID}:`, err);
        return `/placeholder.jpg`;
    }
}
/**
 * Simple HTTP GET that returns parsed JSON.
 */
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https_1.default : http_1.default;
        client
            .get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error(`Failed to parse OMDB response: ${data}`));
                }
            });
        })
            .on("error", reject);
    });
}
/**
 * Download a file from a URL to a local path.
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https_1.default : http_1.default;
        client
            .get(url, (res) => {
            // Follow redirects
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode && res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
                return;
            }
            const fileStream = fs_1.default.createWriteStream(destPath);
            res.pipe(fileStream);
            fileStream.on("finish", () => {
                fileStream.close();
                resolve();
            });
            fileStream.on("error", (err) => {
                fs_1.default.unlinkSync(destPath);
                reject(err);
            });
        })
            .on("error", reject);
    });
}
