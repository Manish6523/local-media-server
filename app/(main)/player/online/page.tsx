"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

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

  if (!imdbId) return null;

  // Construct iframe URL
  let embedUrl = `https://www.2embed.cc/embed/${imdbId}`;
  if (type === "show") {
    embedUrl = `https://www.2embed.cc/embedtv/${imdbId}&s=1&e=1`;
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
