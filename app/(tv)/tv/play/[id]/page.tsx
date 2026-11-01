import React from "react";
import { notFound } from "next/navigation";
import { getMediaById, getAllMedia, type MediaEntry } from "@/lib/db";
import TVPlayerClient from "./TVPlayerClient";

export const dynamic = "force-dynamic";

interface TVPlayPageProps {
  params: Promise<{ id: string }>;
}

export default async function TVPlayPage({ params }: TVPlayPageProps) {
  const { id } = await params;
  const mediaId = Number.parseInt(id, 10);
  if (Number.isNaN(mediaId)) notFound();

  const media = getMediaById(mediaId);
  if (!media) notFound();

  let nextEpisode: MediaEntry | null = null;
  if (media.type === "show") {
    const all = getAllMedia();
    const showEps = all
      .filter((m) => m.type === "show" && m.title.toLowerCase() === media.title.toLowerCase())
      .sort((a, b) => {
        if ((a.season ?? 0) !== (b.season ?? 0)) {
          return (a.season ?? 0) - (b.season ?? 0);
        }
        return (a.episode_start ?? 0) - (b.episode_start ?? 0);
      });

    const currentIndex = showEps.findIndex((e) => e.id === media.id);
    if (currentIndex !== -1 && currentIndex < showEps.length - 1) {
      nextEpisode = showEps[currentIndex + 1];
    }
  }

  return <TVPlayerClient media={media} nextEpisode={nextEpisode} />;
}
