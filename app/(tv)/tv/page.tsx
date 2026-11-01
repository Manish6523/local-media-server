import React from "react";
import { getAllMedia, getShowOfflineMedia, type MediaEntry } from "@/lib/db";
import TVHomeView from "@/components/TV/TVHomeView";

export const dynamic = "force-dynamic";

interface TVPageProps {
  searchParams: Promise<{ type?: string; search?: string }>;
}

export default async function TVPage({ searchParams }: TVPageProps) {
  const sp = await searchParams;
  const activeFilter = sp.type;
  const query = sp.search?.toLowerCase().trim();

  let all = getAllMedia();
  const showOffline = getShowOfflineMedia();
  if (!showOffline) {
    all = all.filter((m) => m.available === 1);
  }

  if (query) {
    all = all.filter((m) => m.title && m.title.toLowerCase().includes(query));
  }

  // 1. Continue watching: in-progress items, sorted by most recently watched
  const continueWatching = all
    .filter((m) => (m.watch_progress ?? 0) > 0 && !(m.is_watched ?? 0) && m.available)
    .sort((a, b) => {
      const aTime = a.last_watched_at ? new Date(a.last_watched_at).getTime() : 0;
      const bTime = b.last_watched_at ? new Date(b.last_watched_at).getTime() : 0;
      return bTime - aTime;
    });

  // 2. Movies
  const movies = all.filter((m) => m.type === "movie");

  // 3. Unique Shows (group loose episodes into single representative show cards)
  const showsMap = new Map<string, MediaEntry>();
  for (const item of all) {
    if (item.type === "show") {
      const normTitle = item.title.toLowerCase();
      if (!showsMap.has(normTitle)) {
        showsMap.set(normTitle, item);
      } else {
        // If the current entry has a backdrop/poster and existing doesn't, prefer it
        const current = showsMap.get(normTitle)!;
        if (!current.poster && item.poster) {
          showsMap.set(normTitle, item);
        }
      }
    }
  }
  const shows = Array.from(showsMap.values());

  // 4. Featured Hero: first continue watching item, or top movie, or top show
  const featured = continueWatching[0] || movies[0] || shows[0] || null;

  return (
    <TVHomeView
      continueWatching={continueWatching}
      movies={movies}
      shows={shows}
      featured={featured}
      activeFilter={activeFilter}
    />
  );
}
