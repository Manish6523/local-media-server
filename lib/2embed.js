"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendingMovies = getTrendingMovies;
exports.getTrendingShows = getTrendingShows;
exports.searchOnline = searchOnline;
exports.getOnlineDetails = getOnlineDetails;
// API endpoints
const BASE_URL = "https://api.2embed.cc";
/**
 * Maps a 2embed API result to our internal MediaEntry format
 */
function mapToMediaEntry(item, type) {
    // Use a string hash or a negative ID to differentiate online items in the client?
    // Since our MediaEntry requires a numeric ID for the client, we'll hash the tmdb_id or use negative
    const id = -(item.tmdb_id || Math.floor(Math.random() * 1000000));
    return {
        id,
        filepath: "", // No local filepath
        filename: "",
        source: "online",
        type,
        title: item.title || item.name || "Unknown Title",
        year: item.year ? parseInt(item.year) : (item.release_date ? parseInt(item.release_date.substring(0, 4)) : null),
        season: null,
        episode_start: null,
        episode_end: null,
        omdb_id: item.imdb_id,
        poster: item.poster || null,
        backdrop: item.backdrops && item.backdrops.length > 0 ? item.backdrops[0] : null,
        backdrop_url: item.backdrops && item.backdrops.length > 0 ? item.backdrops[0] : null,
        overview: item.plot || null,
        rating: item.vote_average ? `${item.vote_average}/10` : null,
        genres: item.genres ? item.genres.join(", ") : null,
        runtime: null,
        available: 1,
        fetched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        last_watched_at: null,
        watch_progress: 0,
        is_watched: 0,
        is_favorite: 0,
        omdb_confirmed: 1,
    };
}
async function getTrendingMovies(timeWindow = "day", page = 1) {
    try {
        const res = await fetch(`${BASE_URL}/trending?time_window=${timeWindow}&page=${page}`, { next: { revalidate: 3600 } });
        if (!res.ok)
            return [];
        const data = await res.json();
        return data.results.map(item => mapToMediaEntry(item, "movie"));
    }
    catch (e) {
        console.error("Failed to fetch trending movies", e);
        return [];
    }
}
async function getTrendingShows(timeWindow = "day", page = 1) {
    try {
        const res = await fetch(`${BASE_URL}/trendingtv?time_window=${timeWindow}&page=${page}`, { next: { revalidate: 3600 } });
        if (!res.ok)
            return [];
        const data = await res.json();
        return data.results.map(item => mapToMediaEntry(item, "show"));
    }
    catch (e) {
        console.error("Failed to fetch trending shows", e);
        return [];
    }
}
async function searchOnline(query, page = 1, type = "movie") {
    try {
        const endpoint = type === "movie" ? "/search" : "/searchtv";
        const res = await fetch(`${BASE_URL}${endpoint}?q=${encodeURIComponent(query)}&page=${page}`);
        if (!res.ok)
            return [];
        const data = await res.json();
        return data.results.map(item => mapToMediaEntry(item, type));
    }
    catch (e) {
        console.error(`Failed to search online ${type}`, e);
        return [];
    }
}
async function getOnlineDetails(imdbId, type) {
    try {
        const endpoint = type === "movie" ? "/movie" : "/tv";
        const res = await fetch(`${BASE_URL}${endpoint}?imdb_id=${imdbId}`);
        if (!res.ok)
            return null;
        const item = await res.json();
        return mapToMediaEntry(item, type);
    }
    catch (e) {
        console.error(`Failed to fetch details for ${imdbId}`, e);
        return null;
    }
}
