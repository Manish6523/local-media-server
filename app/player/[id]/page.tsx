"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NetflixPlayer from "@/components/Player/NetflixPlayer";

import type { MediaEntry } from "@/lib/db";

export default function PlayerPage() {
  const params = useParams();
  const id = params.id as string;
  const [media, setMedia] = useState<MediaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/media?id=${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setMedia(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-14 h-14 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">{error || "Not found"}</p>
          <Link href="/" className="text-[#E50914] hover:text-[#f6121d] transition-colors">
            ← Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NetflixPlayer
      mediaId={id}
      title={media.title}
      type={media.type}
      season={media.season}
      episodeStart={media.episode_start}
      episodeEnd={media.episode_end}
      filename={media.filename}
      exactDuration={media.exactDuration || 0}
      initialWatchProgress={media.watch_progress || 0}
    />
  );
}
