"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

function OnlinePlayer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imdbId = searchParams.get("imdb");
  const type = searchParams.get("type") || "movie";
  const [loading, setLoading] = useState(true);

  // If missing imdb ID, redirect back
  useEffect(() => {
    if (!imdbId) {
      router.back();
    }
  }, [imdbId, router]);

  // Vidfast Message Listener
  useEffect(() => {
    const vidfastOrigins = [
      'https://vidfast.pro',
      'https://vidfast.in',
      'https://vidfast.io',
      'https://vidfast.me',
      'https://vidfast.net',
      'https://vidfast.pm',
      'https://vidfast.xyz',
      'https://vidfast.vc',
      'https://vidfast.bz'
    ];

    const handleMessage = ({ origin, data }: MessageEvent) => {
      if (!vidfastOrigins.includes(origin) || !data) {
        return;
      }

      if (data.type === 'MEDIA_DATA') {
        localStorage.setItem('vidFastProgress', JSON.stringify(data.data));
      }

      if (data.type === 'PLAYER_EVENT') {
        const { event, currentTime, duration } = data.data;
        console.log(`Player ${event} at ${currentTime}s of ${duration}s`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!imdbId) return null;

  // Construct iframe URL
  let embedUrl = `https://vidfast.vc/movie/${imdbId}?autoPlay=true`;
  if (type === "show") {
    const season = searchParams.get("s") || "1";
    const episode = searchParams.get("e") || "1";
    embedUrl = `https://vidfast.vc/tv/${imdbId}/${season}/${episode}?autoPlay=true&nextButton=true&autoNext=true`;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top Bar for navigation */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all group"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Loading State Behind Iframe */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
        </div>
      )}

      {/* Iframe Player */}
      <div className="flex-1 w-full h-full relative z-10">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          allow="encrypted-media"
          referrerPolicy="no-referrer"
          onLoad={() => setLoading(false)}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default function OnlinePlayerPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 text-violet-500 animate-spin" /></div>}>
      <OnlinePlayer />
    </Suspense>
  );
}
