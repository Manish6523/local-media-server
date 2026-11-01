"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyFile = identifyFile;
exports.titleSimilarity = titleSimilarity;
exports.matchToOmdb = matchToOmdb;
exports.processLibraryFile = processLibraryFile;
const path_1 = __importDefault(require("path"));
const drizzle_orm_1 = require("drizzle-orm");
const guessit_js_1 = require("guessit-js");
const schema_1 = require("../db/schema");
const db_1 = require("./db");
const OMDB_BASE_URL = "https://www.omdbapi.com/";
const MINIMUM_TITLE_SIMILARITY = 0.65;
// Share searches and details between episodes during a scan, with bounded memory.
const responseCache = new Map();
function identifyFile(filename) {
    return (0, guessit_js_1.guessit)(filename);
}
function normalizeTitle(title) {
    return title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "")
        .trim();
}
function levenshteinDistance(left, right) {
    if (left === right)
        return 0;
    if (left.length === 0)
        return right.length;
    if (right.length === 0)
        return left.length;
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
        const current = [leftIndex];
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
            const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            current[rightIndex] = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, previous[rightIndex - 1] + substitutionCost);
        }
        previous = current;
    }
    return previous[right.length];
}
function titleSimilarity(left, right) {
    const normalizedLeft = normalizeTitle(left);
    const normalizedRight = normalizeTitle(right);
    const longestLength = Math.max(normalizedLeft.length, normalizedRight.length);
    if (longestLength === 0)
        return 1;
    return 1 - levenshteinDistance(normalizedLeft, normalizedRight) / longestLength;
}
function isConfidentMatch(guess, media) {
    if (!media.Title || !media.imdbID || !/^tt\d+$/.test(media.imdbID))
        return false;
    if (!guess.title)
        return true;
    return titleSimilarity(guess.title, media.Title) >= MINIMUM_TITLE_SIMILARITY;
}
async function fetchOmdb(parameters) {
    const apiKey = (0, db_1.getConfig)("omdb_api_key") || process.env.OMDB_API_KEY;
    if (!apiKey)
        throw new Error("OMDb API key is missing. Configure it in Settings.");
    try {
        parameters.set("apikey", apiKey);
        const url = `${OMDB_BASE_URL}?${parameters.toString()}`;
        const cached = responseCache.get(url);
        if (cached && cached.expires > Date.now())
            return cached.data;
        const response = await fetch(url, {
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
            throw new Error("OMDb request failed. Retry the scan later.");
        const data = (await response.json());
        if (data.Response === "True") {
            if (responseCache.size >= 500)
                responseCache.clear();
            responseCache.set(url, { expires: Date.now() + 300000, data });
        }
        if (data.Response !== "True" && !/not found|too many results/i.test(String(data.Error))) {
            throw new Error("OMDb could not complete the lookup. Check your key or retry later.");
        }
        return data.Response === "True" ? data : null;
    }
    catch (error) {
        throw error;
    }
}
async function fetchOmdbByImdbId(imdbId) {
    return fetchOmdb(new URLSearchParams({ i: imdbId }));
}
async function matchToOmdb(filename) {
    const guessed = identifyFile(filename);
    if (typeof guessed.imdb_id === "string") {
        const omdb = await fetchOmdbByImdbId(guessed.imdb_id);
        if (omdb && isConfidentMatch(guessed, omdb)) {
            return { status: "matched", guess: guessed, omdb };
        }
        return { status: "unmatched", guess: guessed };
    }
    if (!guessed.title)
        return { status: "unmatched", guess: guessed };
    const title = guessed.title;
    const targetType = guessed.type === "episode" ? "series" : "movie";
    // 1. Try direct exact title query with year (?t=title&y=year)
    if (typeof guessed.year === "number") {
        const directWithYearParams = new URLSearchParams({
            t: guessed.title,
            type: targetType,
            y: String(guessed.year),
        });
        const directOmdb = await fetchOmdb(directWithYearParams);
        if (directOmdb && isConfidentMatch(guessed, directOmdb)) {
            return { status: "matched", guess: guessed, omdb: directOmdb };
        }
    }
    // 2. Try direct title query without year (?t=title) - handles festival vs theatrical release years (e.g. 2015 vs 2016)
    const directParams = new URLSearchParams({
        t: guessed.title,
        type: targetType,
    });
    const directOmdb = await fetchOmdb(directParams);
    if (directOmdb && isConfidentMatch(guessed, directOmdb)) {
        // If filename specified a year, verify match is within +/- 2 years
        if (typeof guessed.year === "number" && directOmdb.Year) {
            const parsedYear = parseInt(directOmdb.Year, 10);
            if (isNaN(parsedYear) || Math.abs(parsedYear - guessed.year) <= 2) {
                return { status: "matched", guess: guessed, omdb: directOmdb };
            }
        }
        else {
            return { status: "matched", guess: guessed, omdb: directOmdb };
        }
    }
    // 3. Search query with year (?s=title&y=year)
    let topResult;
    if (typeof guessed.year === "number") {
        const searchWithYear = await fetchOmdb(new URLSearchParams({
            s: guessed.title,
            type: targetType,
            y: String(guessed.year),
        }));
        const candidate = searchWithYear?.Search?.[0];
        if (candidate && titleSimilarity(guessed.title, candidate.Title) >= MINIMUM_TITLE_SIMILARITY) {
            topResult = candidate;
        }
    }
    // 4. Search query without year (?s=title)
    if (!topResult) {
        const searchNoYear = await fetchOmdb(new URLSearchParams({
            s: guessed.title,
            type: targetType,
        }));
        if (searchNoYear?.Search && searchNoYear.Search.length > 0) {
            // Pick best matching candidate (preferring closest year if filename has a year)
            const candidate = searchNoYear.Search.find((item) => {
                const sim = titleSimilarity(title, item.Title);
                if (sim < MINIMUM_TITLE_SIMILARITY)
                    return false;
                if (typeof guessed.year === "number") {
                    const itemYear = parseInt(item.Year, 10);
                    return isNaN(itemYear) || Math.abs(itemYear - guessed.year) <= 2;
                }
                return true;
            }) || searchNoYear.Search[0];
            if (candidate && titleSimilarity(title, candidate.Title) >= MINIMUM_TITLE_SIMILARITY) {
                topResult = candidate;
            }
        }
    }
    if (!topResult || titleSimilarity(title, topResult.Title) < MINIMUM_TITLE_SIMILARITY) {
        return { status: "unmatched", guess: guessed };
    }
    const omdb = await fetchOmdbByImdbId(topResult.imdbID);
    if (!omdb || !isConfidentMatch(guessed, omdb)) {
        return { status: "unmatched", guess: guessed };
    }
    return { status: "matched", guess: guessed, omdb };
}
async function processLibraryFile(filePath) {
    const { db } = (0, db_1.getDb)();
    const cached = db.select().from(schema_1.mediaFiles).where((0, drizzle_orm_1.eq)(schema_1.mediaFiles.filePath, filePath)).get();
    if (cached?.status === "matched")
        return cached;
    let match;
    try {
        match = await matchToOmdb(path_1.default.basename(filePath));
    }
    catch (error) {
        db.insert(schema_1.mediaFiles).values({ filePath, status: "pending" }).onConflictDoUpdate({ target: schema_1.mediaFiles.filePath, set: { status: "pending", updatedAt: new Date().toISOString() } }).run();
        throw error;
    }
    const now = new Date().toISOString();
    const matchedOmdb = match.status === "matched" ? match.omdb : null;
    const values = {
        type: match.guess.type ?? "movie",
        season: Array.isArray(match.guess.season) ? match.guess.season[0] : match.guess.season ?? null,
        episode: Array.isArray(match.guess.episode) ? Math.min(...match.guess.episode) : match.guess.episode ?? null,
        episodeEnd: Array.isArray(match.guess.episode) ? Math.max(...match.guess.episode) : match.guess.episode ?? null,
        matchSource: "auto",
        filePath,
        imdbId: matchedOmdb?.imdbID ?? null,
        title: matchedOmdb?.Title ?? match.guess.title ?? null,
        status: match.status,
        updatedAt: now,
    };
    const record = db
        .insert(schema_1.mediaFiles)
        .values({ ...values, createdAt: now })
        .onConflictDoUpdate({ target: schema_1.mediaFiles.filePath, set: values })
        .returning()
        .get();
    return { ...record, ...(matchedOmdb ? { omdb: matchedOmdb } : {}) };
}
