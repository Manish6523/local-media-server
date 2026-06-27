import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchOMDB } from "@/lib/omdb";
import { getBackdropForShow } from "@/lib/fanart";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

interface EpisodeInput {
  mediaId: number;
  episodeNumber: number;
  episodeName?: string;
}

interface SeasonInput {
  seasonNumber: number;
  episodes: EpisodeInput[];
}

interface GroupRequest {
  seriesName: string;
  fetchMetadata: boolean;
  seasons: SeasonInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GroupRequest = await request.json();
    const { seriesName, fetchMetadata, seasons } = body;

    if (!seriesName || !seriesName.trim()) {
      return NextResponse.json({ error: "Series name is required" }, { status: 400 });
    }

    if (!seasons || seasons.length === 0) {
      return NextResponse.json({ error: "At least one season is required" }, { status: 400 });
    }

    // Collect all media IDs
    const allEpisodes = seasons.flatMap((s) =>
      s.episodes.map((e) => ({ ...e, seasonNumber: s.seasonNumber }))
    );

    if (allEpisodes.length < 2) {
      return NextResponse.json({ error: "At least 2 episodes are required" }, { status: 400 });
    }

    const { sqliteDb, db } = getDb();

    // Validate all media IDs exist and are movies
    for (const ep of allEpisodes) {
      const asset = db
        .select()
        .from(schema.mediaAssets)
        .where(eq(schema.mediaAssets.id, ep.mediaId))
        .get();
      if (!asset) {
        return NextResponse.json(
          { error: `Media asset with id ${ep.mediaId} not found` },
          { status: 400 }
        );
      }
      if (asset.type !== "movie") {
        return NextResponse.json(
          { error: `Media asset ${ep.mediaId} is not a movie (type: ${asset.type})` },
          { status: 400 }
        );
      }
    }

    // Fetch metadata from OMDB if requested
    let omdbData: Awaited<ReturnType<typeof fetchOMDB>> = null;
    let backdropResult: Awaited<ReturnType<typeof getBackdropForShow>> = null;

    if (fetchMetadata) {
      try {
        omdbData = await fetchOMDB(seriesName, "show");
        if (omdbData?.omdb_id) {
          backdropResult = await getBackdropForShow(omdbData.omdb_id);
        }
      } catch (err) {
        console.error("[GroupAsSeries] Metadata fetch failed:", err);
        // Continue without metadata
      }
    }

    const confirmedTitle = omdbData?.confirmed_title || seriesName.trim();

    // Run everything in a transaction
    const transaction = sqliteDb!.transaction(() => {
      // Upsert tv_shows row
      let tvShow = db
        .select()
        .from(schema.tvShows)
        .where(eq(schema.tvShows.title, confirmedTitle))
        .get();

      if (!tvShow) {
        tvShow = db
          .insert(schema.tvShows)
          .values({
            title: confirmedTitle,
            overview: omdbData?.overview || null,
            poster: omdbData?.poster || null,
            backdrop: backdropResult?.backdropPath || null,
            backdropUrl: backdropResult?.backdropUrl || null,
            omdbId: omdbData?.omdb_id || null,
            rating: omdbData?.rating || null,
            genres: omdbData?.genres || null,
          })
          .returning()
          .get();
      } else {
        // Update show metadata if we fetched new data
        if (omdbData) {
          db.update(schema.tvShows)
            .set({
              overview: omdbData.overview || tvShow.overview,
              poster: omdbData.poster || tvShow.poster,
              backdrop: backdropResult?.backdropPath || tvShow.backdrop,
              backdropUrl: backdropResult?.backdropUrl || tvShow.backdropUrl,
              omdbId: omdbData.omdb_id || tvShow.omdbId,
              rating: omdbData.rating || tvShow.rating,
              genres: omdbData.genres || tvShow.genres,
            })
            .where(eq(schema.tvShows.id, tvShow.id))
            .run();
        }
      }

      const showId = tvShow.id;
      const now = new Date().toISOString();

      for (const ep of allEpisodes) {
        // 1. Update media_assets: movie → show
        db.update(schema.mediaAssets)
          .set({
            type: "show",
            fetchedAt: now,
            omdbConfirmed: fetchMetadata && omdbData ? 1 : 0,
          })
          .where(eq(schema.mediaAssets.id, ep.mediaId))
          .run();

        // 2. Get the movie's runtime before deleting
        const movieRow = db
          .select()
          .from(schema.movies)
          .where(eq(schema.movies.mediaAssetId, ep.mediaId))
          .get();
        const runtime = movieRow?.runtime || null;

        // 3. Delete from movies table
        db.delete(schema.movies)
          .where(eq(schema.movies.mediaAssetId, ep.mediaId))
          .run();

        // 4. Insert into episodes table
        db.insert(schema.episodes)
          .values({
            mediaAssetId: ep.mediaId,
            showId,
            seasonNumber: ep.seasonNumber,
            episodeStart: ep.episodeNumber,
            episodeEnd: ep.episodeNumber,
            runtime,
          })
          .run();
      }

      return { showId };
    });

    const result = transaction();

    // Build slug for the show
    const seriesSlug = encodeURIComponent(
      confirmedTitle.toLowerCase().replace(/\s+/g, "-")
    );

    return NextResponse.json({
      success: true,
      updated: allEpisodes.length,
      seriesTitle: confirmedTitle,
      seriesSlug,
      metadataFound: !!omdbData,
    });
  } catch (err: any) {
    console.error("[GroupAsSeries] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
