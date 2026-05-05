import fs from "fs";
import path from "path";
import FanartTVClient from "@fanart-tv/api";

const FANART_API_KEY = process.env.FANART_TV_API_KEY;

const client = new FanartTVClient({
  apiKey: FANART_API_KEY || "",
  version: "v3.2",
});

async function fetchWithTimeout(url: string, timeoutMs: number = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function downloadBackdrop(url: string, imdbId: string): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), "public", "backdrops");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Use the imdbId for the filename so we can rely on it locally
    const filename = `${imdbId}.jpg`;
    const filepath = path.join(dir, filename);

    if (fs.existsSync(filepath)) {
      console.log(`[Fanart] Backdrop already exists for ${imdbId}`);
      return `/backdrops/${filename}`;
    }

    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const buffer = await res.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    console.log(`[Fanart] Downloaded backdrop for ${imdbId}`);
    return `/backdrops/${filename}`;
  } catch (error) {
    console.error(`[Fanart] Download failed for ${url}:`, error);
    return null;
  }
}

export async function getBackdropForMovie(imdbId: string): Promise<{ backdropPath: string; backdropUrl: string } | null> {
  if (!FANART_API_KEY || !imdbId) return null;

  try {
    const data = await client.getMovie(imdbId);
    if (!data.moviebackground || data.moviebackground.length === 0) return null;

    // Sort by likes descending
    const backdrops = data.moviebackground.sort((a: any, b: any) => parseInt(b.likes || "0") - parseInt(a.likes || "0"));
    const bestBackdrop = backdrops[0].url;

    const localPath = await downloadBackdrop(bestBackdrop, imdbId);
    if (!localPath) return null;

    return { backdropPath: localPath, backdropUrl: bestBackdrop };
  } catch (error: any) {
    // Expected if movie has no art or API limits out
    console.error(`[Fanart] Error fetching movie backdrop for ${imdbId}:`, error?.message || error);
    return null;
  }
}

export async function getBackdropForShow(imdbId: string): Promise<{ backdropPath: string; backdropUrl: string } | null> {
  if (!FANART_API_KEY || !imdbId) return null;

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
    const data = await client.getShow(tvdbId);
    if (!data.showbackground || data.showbackground.length === 0) return null;

    const backdrops = data.showbackground.sort((a: any, b: any) => parseInt(b.likes || "0") - parseInt(a.likes || "0"));
    const bestBackdrop = backdrops[0].url;

    const localPath = await downloadBackdrop(bestBackdrop, imdbId); // Save as imdbId.jpg for consistency
    if (!localPath) return null;

    return { backdropPath: localPath, backdropUrl: bestBackdrop };
  } catch (error: any) {
    console.error(`[Fanart] Error fetching show backdrop for ${imdbId}:`, error?.message || error);
    return null;
  }
}
