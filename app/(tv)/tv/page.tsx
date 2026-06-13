import { getAllMedia, getMediaByType } from "@/lib/db";
import TVBrowser from "./TVBrowser";

export const dynamic = "force-dynamic";

interface TVPageProps {
  searchParams: Promise<{ type?: string; search?: string }>;
}

function getFilteredMedia(type: string | undefined, search: string | undefined) {
  var media;

  if (type === "movie" || type === "show") {
    media = getMediaByType(type);
  } else {
    media = getAllMedia();
  }

  if (search && search.length > 0) {
    var lower = search.toLowerCase();
    media = media.filter(function (item) {
      return item.title && item.title.toLowerCase().indexOf(lower) !== -1;
    });
  }

  return media;
}

export default async function TVPage(props: TVPageProps) {
  var sp = await props.searchParams;
  var type = sp.type;
  var search = sp.search;
  var media = getFilteredMedia(type, search);

  var movies = media.filter(function (m) {
    return m.type === "movie";
  });
  var shows = media.filter(function (m) {
    return m.type === "show";
  });

  var activeFilter = type || "all";

  // Serialize only what the client component needs
  var movieItems = movies.map(function (m) {
    return {
      id: m.id,
      type: m.type,
      title: m.title,
      year: m.year,
      season: m.season,
      episode_start: m.episode_start,
      episode_end: m.episode_end,
      poster: m.poster,
      genres: m.genres,
    };
  });

  var showItems = shows.map(function (m) {
    return {
      id: m.id,
      type: m.type,
      title: m.title,
      year: m.year,
      season: m.season,
      episode_start: m.episode_start,
      episode_end: m.episode_end,
      poster: m.poster,
      genres: m.genres,
    };
  });

  return (
    <TVBrowser
      movies={movieItems}
      shows={showItems}
      allCount={media.length}
      activeFilter={activeFilter}
    />
  );
}
