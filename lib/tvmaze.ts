import { MediaEntry } from "./db";
import { normalize, downloadPoster } from "./omdb"; // We can reuse the normalize utility from omdb

const BASE_URL = "https://api.tvmaze.com";

// Type definitions for TVMaze API responses
export interface TVMazeShow {
  id: number;
  url: string;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  runtime: number;
  averageRuntime: number;
  premiered: string;
  ended: string | null;
  officialSite: string | null;
  rating: {
    average: number | null;
  };
  network: any;
  externals: {
    tvrage: number | null;
    thetvdb: number | null;
    imdb: string | null;
  };
  image: {
    medium: string;
    original: string;
  } | null;
  summary: string | null;
}

export interface TVMazeEpisode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number;
  rating: {
    average: number | null;
  };
  image: {
    medium: string;
    original: string;
  } | null;
  summary: string | null;
}

async function mapTVMazeToShowEntry(show: TVMazeShow): Promise<Partial<MediaEntry> & { confirmed_title: string }> {
  // Try to use the original image, fallback to medium, fallback to null
  const posterUrl = show.image?.original || show.image?.medium || null;
  const omdb_id = show.externals.imdb || `tvm-${show.id}`;
  
  let poster = posterUrl;
  if (posterUrl) {
    poster = await downloadPoster(omdb_id, posterUrl);
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

export async function fetchTVMazeShow(title: string, year?: number | null): Promise<(Partial<MediaEntry> & { confirmed_title: string }) | null> {
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

    const data: TVMazeShow = await response.json();
    return await mapTVMazeToShowEntry(data);
  } catch (error) {
    console.error(`[TVMaze] Failed to fetch show "${title}":`, error);
    return null;
  }
}

export async function fetchTVMazeShowByIMDB(imdbId: string): Promise<(Partial<MediaEntry> & { confirmed_title: string; tvmaze_id: number }) | null> {
  try {
    const url = `${BASE_URL}/lookup/shows?imdb=${imdbId}`;
    // Using fetch directly because /lookup returns a 301 redirect to the actual show endpoint,
    // which fetch handles automatically by default.
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      console.log(`[TVMaze] Show not found by IMDB ID: "${imdbId}"`);
      return null;
    }

    const data: TVMazeShow = await response.json();
    const mapped = await mapTVMazeToShowEntry(data);
    return {
      ...mapped,
      tvmaze_id: data.id
    };
  } catch (error) {
    console.error(`[TVMaze] Failed to fetch show by IMDB "${imdbId}":`, error);
    return null;
  }
}

export async function fetchTVMazeEpisodes(tvmazeId: number): Promise<TVMazeEpisode[]> {
  try {
    const url = `${BASE_URL}/shows/${tvmazeId}/episodes`;
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      console.log(`[TVMaze] Episodes not found for TVMaze ID: ${tvmazeId}`);
      return [];
    }

    const data: TVMazeEpisode[] = await response.json();
    return data;
  } catch (error) {
    console.error(`[TVMaze] Failed to fetch episodes for TVMaze ID ${tvmazeId}:`, error);
    return [];
  }
}
