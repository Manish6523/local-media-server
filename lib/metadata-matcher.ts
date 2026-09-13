import path from "path";
import { eq } from "drizzle-orm";
import { guessit, type GuessItResult } from "guessit-js";
import { mediaFiles } from "../db/schema";
import { getConfig, getDb } from "./db";

const OMDB_BASE_URL = "https://www.omdbapi.com/";
const MINIMUM_TITLE_SIMILARITY = 0.65;
// Share searches and details between episodes during a scan, with bounded memory.
const responseCache = new Map<string, { expires: number; data: unknown }>();

type MediaStatus = "matched" | "unmatched" | "pending";

export interface OmdbMedia {
  Response: "True" | "False";
  Title?: string;
  Year?: string;
  imdbID?: string;
  Type?: string;
  Poster?: string;
  Plot?: string;
  imdbRating?: string;
  Genre?: string;
  Runtime?: string;
  Error?: string;
  [key: string]: unknown;
}

interface OmdbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

interface OmdbSearchResponse {
  Response: "True" | "False";
  Search?: OmdbSearchResult[];
  Error?: string;
}

export type MetadataMatch =
  | { status: "matched"; guess: GuessItResult; omdb: OmdbMedia }
  | { status: "unmatched"; guess: GuessItResult };

export interface MediaFile {
  type: "movie" | "episode" | null;
  season: number | null;
  episode: number | null;
  episodeEnd: number | null;
  matchSource: string | null;
  id: number;
  filePath: string;
  imdbId: string | null;
  title: string | null;
  status: MediaStatus;
  createdAt: string;
  updatedAt: string;
}

export function identifyFile(filename: string): GuessItResult {
  return guessit(filename);
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

export function titleSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeTitle(left);
  const normalizedRight = normalizeTitle(right);
  const longestLength = Math.max(normalizedLeft.length, normalizedRight.length);
  if (longestLength === 0) return 1;
  return 1 - levenshteinDistance(normalizedLeft, normalizedRight) / longestLength;
}

function isConfidentMatch(guess: GuessItResult, media: OmdbMedia): boolean {
  if (!media.Title || !media.imdbID || !/^tt\d+$/.test(media.imdbID)) return false;
  if (!guess.title) return true;
  return titleSimilarity(guess.title, media.Title) >= MINIMUM_TITLE_SIMILARITY;
}

async function fetchOmdb<T extends { Response: "True" | "False" }>(
  parameters: URLSearchParams,
): Promise<T | null> {
  const apiKey = getConfig("omdb_api_key") || process.env.OMDB_API_KEY;
  if (!apiKey) throw new Error("OMDb API key is missing. Configure it in Settings.");

  try {
    parameters.set("apikey", apiKey);
    const url = `${OMDB_BASE_URL}?${parameters.toString()}`;
    const cached = responseCache.get(url);
    if (cached && cached.expires > Date.now()) return cached.data as T;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("OMDb request failed. Retry the scan later.");
    const data = (await response.json()) as T;
    if (data.Response === "True") {
      if (responseCache.size >= 500) responseCache.clear();
      responseCache.set(url, { expires: Date.now() + 300000, data });
    }
    if (data.Response !== "True" && !/not found|too many results/i.test(String((data as T & { Error?: string }).Error))) {
      throw new Error("OMDb could not complete the lookup. Check your key or retry later.");
    }
    return data.Response === "True" ? data : null;
  } catch (error) {
    throw error;
  }
}

async function fetchOmdbByImdbId(imdbId: string): Promise<OmdbMedia | null> {
  return fetchOmdb<OmdbMedia>(new URLSearchParams({ i: imdbId }));
}

export async function matchToOmdb(filename: string): Promise<MetadataMatch> {
  const guessed = identifyFile(filename);

  if (typeof guessed.imdb_id === "string") {
    const omdb = await fetchOmdbByImdbId(guessed.imdb_id);
    if (omdb && isConfidentMatch(guessed, omdb)) {
      return { status: "matched", guess: guessed, omdb };
    }
    return { status: "unmatched", guess: guessed };
  }

  if (!guessed.title) return { status: "unmatched", guess: guessed };

  const parameters = new URLSearchParams({
    s: guessed.title,
    type: guessed.type === "episode" ? "series" : "movie",
  });
  if (typeof guessed.year === "number") parameters.set("y", String(guessed.year));

  const search = await fetchOmdb<OmdbSearchResponse>(parameters);
  const topResult = search?.Search?.[0];
  if (!topResult || titleSimilarity(guessed.title, topResult.Title) < MINIMUM_TITLE_SIMILARITY) {
    return { status: "unmatched", guess: guessed };
  }

  const omdb = await fetchOmdbByImdbId(topResult.imdbID);
  if (!omdb || !isConfidentMatch(guessed, omdb)) {
    return { status: "unmatched", guess: guessed };
  }

  return { status: "matched", guess: guessed, omdb };
}

export async function processLibraryFile(filePath: string): Promise<MediaFile & { omdb?: OmdbMedia }> {
  const { db } = getDb();
  const cached = db.select().from(mediaFiles).where(eq(mediaFiles.filePath, filePath)).get();
  if (cached?.status === "matched") return cached as MediaFile;

  let match: MetadataMatch;
  try {
    match = await matchToOmdb(path.basename(filePath));
  } catch (error) {
    db.insert(mediaFiles).values({ filePath, status: "pending" }).onConflictDoUpdate({ target: mediaFiles.filePath, set: { status: "pending", updatedAt: new Date().toISOString() } }).run();
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
    .insert(mediaFiles)
    .values({ ...values, createdAt: now })
    .onConflictDoUpdate({ target: mediaFiles.filePath, set: values })
    .returning()
    .get() as MediaFile;
  return { ...record, ...(matchedOmdb ? { omdb: matchedOmdb } : {}) };
}
