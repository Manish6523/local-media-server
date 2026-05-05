"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Clock, Calendar, ArrowLeft, HardDrive, Info, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MediaEntry {
  id: number;
  type: "movie" | "show";
  title: string;
  year: number | null;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
  poster: string | null;
  overview: string | null;
  rating: string | null;
  genres: string | null;
  runtime: number | null;
  available: number;
  backdrop: string | null;
  backdrop_url: string | null;
  filename: string;
  watch_progress?: number;
  is_favorite?: number;
}

export default function ShowDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [episodes, setEpisodes] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<number>(1);

  useEffect(() => {
    fetch("/api/media?type=show")
      .then((r) => r.json())
      .then((data: MediaEntry[]) => {
        const filtered = data.filter(
          (m: MediaEntry) =>
            m.title.toLowerCase().replace(/\s+/g, "-") === decodeURIComponent(slug)
        );
        setEpisodes(filtered);

        if (filtered.length > 0) {
          const seasons = [...new Set(filtered.map((e: MediaEntry) => e.season).filter(Boolean))].sort(
            (a, b) => (a ?? 0) - (b ?? 0)
          );
          if (seasons.length > 0) setActiveSeason(seasons[0] ?? 1);
        }
      })
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (episodes.length === 0) return <NotFound />;

  const show = episodes[0];
  const posterSrc = show.poster || "/placeholder.jpg";
  const bgImage = show.backdrop || show.poster || "/placeholder.jpg";

  const seasons = [...new Set(episodes.map((e) => e.season).filter(Boolean))].sort(
    (a, b) => (a ?? 0) - (b ?? 0)
  );

  const seasonEpisodes = episodes
    .filter((e) => e.season === activeSeason)
    .sort((a, b) => (a.episode_start ?? 0) - (b.episode_start ?? 0));

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/30">
      {/* Hero Section */}
      <div className="relative h-[65vh] md:h-[80vh] w-full overflow-hidden">
        <Image
          src={bgImage}
          alt={show.title}
          fill
          className="object-cover object-top opacity-50 scale-105 transition-transform duration-1000 group-hover:scale-100"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 lg:px-20 pb-16">
          <Link href="/shows" className="group flex items-center gap-2 text-white/50 hover:text-white transition-all mb-8">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase">Return to Library</span>
          </Link>
          
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-red-600 text-white border-none rounded-none px-3 font-black tracking-tighter">TV SERIES</Badge>
              <span className="text-white/40 font-mono text-sm tracking-widest">{show.year}</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-6 leading-[0.9]">
              {show.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm font-bold tracking-widest text-white/60">
              <div className="flex items-center gap-2 text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                {show.rating?.replace("/10", "") || "N/A"}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {show.runtime}M / EP
              </div>
              <div className="uppercase">{show.genres}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20 pb-32 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Sidebar: Poster & Meta */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/5 group">
              <Image src={posterSrc} alt={show.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" /> Storyline
              </h3>
              <p className="text-neutral-400 leading-relaxed italic">
                {show.overview || "No description available for this series."}
              </p>
              <div className="mt-8 pt-8 border-t border-white/10 flex justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Total Seasons</p>
                  <p className="text-2xl font-black">{seasons.length}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Files Found</p>
                  <p className="text-2xl font-black">{episodes.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Seasons & Episodes */}
          <div className="lg:col-span-8">
            <div className="sticky top-20 z-30 bg-[#050505]/80 backdrop-blur-md py-4 mb-10 border-b border-white/5 flex items-center gap-8 overflow-x-auto no-scrollbar">
              {seasons.map((season) => (
                <button
                  key={season}
                  onClick={() => setActiveSeason(season ?? 1)}
                  className={`text-sm font-black tracking-widest uppercase transition-all pb-2 border-b-2 ${
                    activeSeason === season 
                    ? "text-red-500 border-red-500" 
                    : "text-white/20 border-transparent hover:text-white/60"
                  }`}
                >
                  Season {season}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {seasonEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  className={`group flex flex-col md:flex-row gap-6 p-4 rounded-2xl transition-all border ${
                    ep.available 
                    ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10" 
                    : "opacity-40 grayscale pointer-events-none border-transparent"
                  }`}
                >
                  <div className="relative w-full md:w-64 aspect-video rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                    <Image src={ep.poster || "/placeholder.jpg"} alt="ep" fill className="object-cover" />
                    
                    {ep.available ? (
                      <Link href={`/player/${ep.id}`} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <Play className="w-5 h-5 fill-white text-white ml-1" />
                         </div>
                      </Link>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <HardDrive className="w-6 h-6 text-red-500" />
                      </div>
                    )}

                    {ep.watch_progress && ep.runtime && ep.watch_progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                        <div 
                          className="h-full bg-red-600 shadow-[0_0_10px_#ef4444]" 
                          style={{ width: `${Math.min(100, (ep.watch_progress / (ep.runtime * 60)) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-center py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-black italic tracking-tighter uppercase mb-1">
                          E{ep.episode_start} <span className="text-white/20 mx-2">—</span> {ep.title}
                        </h3>
                        <p className="text-xs font-mono text-white/30 truncate max-w-md">{ep.filename}</p>
                      </div>
                      {!ep.available && (
                        <Badge className="bg-red-500/10 text-red-500 border-none text-[10px] font-bold">OFFLINE</Badge>
                      )}
                    </div>
                    
                    <div className="mt-4 flex items-center gap-4 text-[10px] font-bold tracking-widest text-white/40 uppercase">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ep.runtime}m</span>
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> MKV</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#050505] p-20 space-y-12 animate-pulse">
      <div className="h-64 w-full bg-white/5 rounded-3xl" />
      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-4 h-96 bg-white/5 rounded-3xl" />
        <div className="col-span-8 space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-20 text-center">
      <h1 className="text-9xl font-black text-white/5 mb-4 italic uppercase">404</h1>
      <p className="text-white/40 tracking-[0.5em] uppercase font-bold text-xs mb-8">Series Not Found</p>
      <Link href="/shows" className="px-8 py-3 bg-white text-black font-black uppercase tracking-tighter hover:bg-red-600 hover:text-white transition-colors">
        Back to Library
      </Link>
    </div>
  );
}