import { getMediaById } from "@/lib/db";
import { notFound } from "next/navigation";
import TVPlayer from "./TVPlayer";

export const dynamic = "force-dynamic";

interface PlayPageProps {
  params: Promise<{ id: string }>;
}

function formatEpisodeLabel(item: {
  type: string;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
}) {
  if (item.type !== "show") {
    return "";
  }
  var parts = [];
  if (item.season !== null && item.season !== undefined) {
    parts.push("Season " + item.season);
  }
  if (item.episode_start !== null && item.episode_start !== undefined) {
    parts.push("Episode " + item.episode_start);
    if (
      item.episode_end !== null &&
      item.episode_end !== undefined &&
      item.episode_end !== item.episode_start
    ) {
      parts[parts.length - 1] =
        "Episodes " + item.episode_start + "-" + item.episode_end;
    }
  }
  return parts.join(", ");
}

export default async function PlayPage(props: PlayPageProps) {
  var resolvedParams = await props.params;
  var id = parseInt(resolvedParams.id, 10);

  if (isNaN(id)) {
    notFound();
  }

  var media = getMediaById(id);

  if (!media) {
    notFound();
  }

  var title = media.title || "Untitled";
  var episodeLabel = formatEpisodeLabel(media);
  var streamUrl = "/api/stream?id=" + media.id;

  var metaParts = [];
  if (media.year) {
    metaParts.push(String(media.year));
  }
  if (media.rating) {
    metaParts.push(media.rating);
  }
  if (media.genres) {
    metaParts.push(media.genres);
  }
  if (media.runtime) {
    metaParts.push(media.runtime + " min");
  }
  var metaText = metaParts.join(" \u2022 ");

  return (
    <TVPlayer
      title={title}
      episodeLabel={episodeLabel}
      metaText={metaText}
      streamUrl={streamUrl}
      overview={media.overview || ""}
    />
  );
}
