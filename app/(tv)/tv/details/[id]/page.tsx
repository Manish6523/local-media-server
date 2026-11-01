import React from "react";
import { notFound } from "next/navigation";
import { getMediaById, getAllMedia, type MediaEntry } from "@/lib/db";
import TVDetailsClient from "./TVDetailsClient";

export const dynamic = "force-dynamic";

interface TVDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TVDetailsPage({ params }: TVDetailsPageProps) {
  const { id } = await params;
  const mediaId = Number.parseInt(id, 10);
  if (Number.isNaN(mediaId)) notFound();

  const media = getMediaById(mediaId);
  if (!media) notFound();

  let episodes: MediaEntry[] = [];
  if (media.type === "show") {
    const all = getAllMedia();
    episodes = all
      .filter((m) => m.type === "show" && m.title.toLowerCase() === media.title.toLowerCase())
      .sort((a, b) => {
        if ((a.season ?? 0) !== (b.season ?? 0)) {
          return (a.season ?? 0) - (b.season ?? 0);
        }
        return (a.episode_start ?? 0) - (b.episode_start ?? 0);
      });
  }

  return <TVDetailsClient media={media} episodes={episodes} />;
}

