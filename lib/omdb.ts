import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

export interface OMDBResult {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
  Plot: string;
  imdbRating: string;
  Genre: string;
  Runtime: string;
  Type: string;
  Response: string;
  Error?: string;
}

export interface FetchedMetadata {
  omdb_id: string;
  confirmed_title: string;
  year: number | null;
  poster: string | null;
  overview: string | null;
  rating: string | null;
  genres: string | null;
  runtime: number | null;
}

const API_KEY = process.env.OMDB_API_KEY || "";
const BASE_URL = "http://www.omdbapi.com/";

/**
 * Fetch metadata from OMDB API for a given title.
 * Implements fallback strategy:
 *   1. Search with title + type + year
 *   2. Retry without year if not found
 *   3. Return null if still not found (don't block scan)
 */
export async function fetchOMDB(
  title: string,
  type: "movie" | "show",
  year?: number | null
): Promise<FetchedMetadata | null> {
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
    let runtime: number | null = null;
    if (data.Runtime && data.Runtime !== "N/A") {
      const runtimeMatch = data.Runtime.match(/(\d+)/);
      if (runtimeMatch) {
        runtime = parseInt(runtimeMatch[1], 10);
      }
    }

    // Parse year
    let parsedYear: number | null = null;
    if (data.Year && data.Year !== "N/A") {
      // Year can be "2019–2024" for series, take the start year
      const yearMatch = data.Year.match(/(\d{4})/);
      if (yearMatch) {
        parsedYear = parseInt(yearMatch[1], 10);
      }
    }

    // Download poster
    let posterPath: string | null = null;
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
  } catch (err) {
    console.error(`[OMDB] Fetch error for "${title}":`, err);
    return null;
  }
}

/**
 * Download a poster image to /public/posters/[imdbID].jpg
 * Skips if file already exists.
 */
export async function downloadPoster(imdbID: string, url: string): Promise<string> {
  const postersDir = path.join(process.cwd(), "public", "posters");
  if (!fs.existsSync(postersDir)) {
    fs.mkdirSync(postersDir, { recursive: true });
  }

  const filename = `${imdbID}.jpg`;
  const filepath = path.join(postersDir, filename);

  // Don't re-download
  if (fs.existsSync(filepath)) {
    console.log(`Poster already exists: ${imdbID}`);
    return `/posters/${filename}`;
  }

  try {
    await downloadFile(url, filepath);
    return `/posters/${filename}`;
  } catch (err) {
    console.error(`[OMDB] Failed to download poster for ${imdbID}:`, err);
    return `/placeholder.jpg`;
  }
}

/**
 * Simple HTTP GET that returns parsed JSON.
 */
function httpGet(url: string): Promise<OMDBResult> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
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
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
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

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });
        fileStream.on("error", (err) => {
          fs.unlinkSync(destPath);
          reject(err);
        });
      })
      .on("error", reject);
  });
}
