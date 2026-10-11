import { NextResponse } from "next/server";
import { getConfig } from "@/lib/db";
import FanartTVClient from "@fanart-tv/api";

const OMDB_BASE_URL = "http://www.omdbapi.com/";

interface ArtworkOption {
  url: string;
  source: "omdb" | "fanart";
  likes?: number;
  previewUrl?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim();
    const mediaType = searchParams.get("type") || "movie"; // 'movie' or 'show'

    if (!query) {
      return NextResponse.json({ posters: [], backdrops: [] });
    }

    const posters: ArtworkOption[] = [];
    const backdrops: ArtworkOption[] = [];

    // 1. Fetch OMDB Data for title & IMDb ID
    const dbOmdbKey = getConfig("omdb_api_key");
    const omdbApiKey = dbOmdbKey || process.env.OMDB_API_KEY || "";
    let imdbId: string | null = null;

    if (omdbApiKey) {
      try {
        const omdbType = mediaType === "show" ? "series" : "movie";
        const omdbRes = await fetch(
          `${OMDB_BASE_URL}?t=${encodeURIComponent(query)}&type=${omdbType}&apikey=${omdbApiKey}`
        );
        if (omdbRes.ok) {
          const omdbData = await omdbRes.json();
          if (omdbData.Response !== "False") {
            imdbId = omdbData.imdbID;
            if (omdbData.Poster && omdbData.Poster !== "N/A") {
              posters.push({
                url: omdbData.Poster,
                source: "omdb",
              });
            }
          } else {
            // Try searching without type constraint
            const fallbackRes = await fetch(
              `${OMDB_BASE_URL}?t=${encodeURIComponent(query)}&apikey=${omdbApiKey}`
            );
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (fallbackData.Response !== "False") {
                imdbId = fallbackData.imdbID;
                if (fallbackData.Poster && fallbackData.Poster !== "N/A") {
                  posters.push({
                    url: fallbackData.Poster,
                    source: "omdb",
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("[Artwork Search] Error searching OMDB:", err);
      }
    }

    // 2. Fetch Fanart.tv Data if we have IMDb ID
    const dbFanartKey = getConfig("fanart_api_key");
    const fanartApiKey = dbFanartKey || process.env.FANART_TV_API_KEY;

    if (fanartApiKey && imdbId) {
      try {
        const client = new FanartTVClient({
          apiKey: fanartApiKey,
          version: "v3.2",
        });

        if (mediaType === "show") {
          // Look up TVDB ID via TVMaze free lookup
          try {
            const tvmazeRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`, {
              redirect: "follow",
            });
            if (tvmazeRes.ok) {
              const tvmazeData = await tvmazeRes.json();
              const tvdbId = tvmazeData?.externals?.thetvdb;

              if (tvdbId) {
                const fanartData: any = await client.getShow(tvdbId);
                if (fanartData) {
                  // Show posters
                  if (Array.isArray(fanartData.tvposter)) {
                    fanartData.tvposter.forEach((item: any) => {
                      if (item?.url) {
                        posters.push({
                          url: item.url,
                          source: "fanart",
                          likes: parseInt(item.likes || "0", 10),
                        });
                      }
                    });
                  }
                  // Show backdrops
                  if (Array.isArray(fanartData.showbackground)) {
                    fanartData.showbackground.forEach((item: any) => {
                      if (item?.url) {
                        backdrops.push({
                          url: item.url,
                          source: "fanart",
                          likes: parseInt(item.likes || "0", 10),
                        });
                      }
                    });
                  }
                }
              }
            }
          } catch (tvErr) {
            console.error("[Artwork Search] Error fetching show fanart:", tvErr);
          }
        } else {
          // Movie
          try {
            const fanartData: any = await client.getMovie(imdbId);
            if (fanartData) {
              // Movie posters
              if (Array.isArray(fanartData.movieposter)) {
                fanartData.movieposter.forEach((item: any) => {
                  if (item?.url) {
                    posters.push({
                      url: item.url,
                      source: "fanart",
                      likes: parseInt(item.likes || "0", 10),
                    });
                  }
                });
              }
              // Movie backdrops
              if (Array.isArray(fanartData.moviebackground)) {
                fanartData.moviebackground.forEach((item: any) => {
                  if (item?.url) {
                    backdrops.push({
                      url: item.url,
                      source: "fanart",
                      likes: parseInt(item.likes || "0", 10),
                    });
                  }
                });
              }
            }
          } catch (movieErr) {
            console.error("[Artwork Search] Error fetching movie fanart:", movieErr);
          }
        }
      } catch (fanartErr) {
        console.error("[Artwork Search] Fanart error:", fanartErr);
      }
    }

    return NextResponse.json({
      imdbId,
      posters,
      backdrops,
    });
  } catch (error) {
    console.error("[Artwork Search API] Error:", error);
    return NextResponse.json({ error: "Failed to search artwork" }, { status: 500 });
  }
}
