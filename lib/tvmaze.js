"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTVMazeShow = fetchTVMazeShow;
exports.fetchTVMazeShowByIMDB = fetchTVMazeShowByIMDB;
exports.fetchTVMazeEpisodes = fetchTVMazeEpisodes;
const omdb_1 = require("./omdb"); // We can reuse the normalize utility from omdb
const BASE_URL = "https://api.tvmaze.com";
async function mapTVMazeToShowEntry(show) {
    // Try to use the original image, fallback to medium, fallback to null
    const posterUrl = show.image?.original || show.image?.medium || null;
    const omdb_id = show.externals.imdb || `tvm-${show.id}`;
    let poster = posterUrl;
    if (posterUrl) {
        poster = await (0, omdb_1.downloadPoster)(omdb_id, posterUrl);
    }
    // TVMaze doesn't explicitly separate backdrop and poster, so we use the same or let it fall back
    const backdrop = posterUrl;
    // Clean up summary HTML tags since TVMaze returns summaries in HTML
    let overview = show.summary || "";
    overview = overview.replace(/<[^>]*>?/gm, '');
    return {
        omdb_id: omdb_id,
        confirmed_title: show.name,
        poster: poster,
        backdrop: backdrop,
        backdrop_url: backdrop,
        overview: overview,
        rating: show.rating?.average ? `${show.rating.average}/10` : null,
        genres: show.genres?.join(", ") || null,
        runtime: show.averageRuntime || show.runtime || null,
    };
}
async function fetchTVMazeShow(title, year) {
    try {
        // We use singlesearch to get the top result
        const url = `${BASE_URL}/singlesearch/shows?q=${encodeURIComponent(title)}`;
        const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
        if (!response.ok) {
            if (response.status === 404) {
                console.log(`[TVMaze] Show not found: "${title}"`);
                return null;
            }
            throw new Error(`TVMaze API Error: ${response.status}`);
        }
        const data = await response.json();
        return await mapTVMazeToShowEntry(data);
    }
    catch (error) {
        console.error(`[TVMaze] Failed to fetch show "${title}":`, error);
        return null;
    }
}
async function fetchTVMazeShowByIMDB(imdbId) {
    try {
        const url = `${BASE_URL}/lookup/shows?imdb=${imdbId}`;
        // Using fetch directly because /lookup returns a 301 redirect to the actual show endpoint,
        // which fetch handles automatically by default.
        const response = await fetch(url, { next: { revalidate: 3600 } });
        if (!response.ok) {
            console.log(`[TVMaze] Show not found by IMDB ID: "${imdbId}"`);
            return null;
        }
        const data = await response.json();
        const mapped = await mapTVMazeToShowEntry(data);
        return {
            ...mapped,
            tvmaze_id: data.id
        };
    }
    catch (error) {
        console.error(`[TVMaze] Failed to fetch show by IMDB "${imdbId}":`, error);
        return null;
    }
}
async function fetchTVMazeEpisodes(tvmazeId) {
    try {
        const url = `${BASE_URL}/shows/${tvmazeId}/episodes`;
        const response = await fetch(url, { next: { revalidate: 3600 } });
        if (!response.ok) {
            console.log(`[TVMaze] Episodes not found for TVMaze ID: ${tvmazeId}`);
            return [];
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(`[TVMaze] Failed to fetch episodes for TVMaze ID ${tvmazeId}:`, error);
        return [];
    }
}
