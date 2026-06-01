"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Clock, Calendar, ArrowLeft, HardDrive, Info, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import type { MediaEntry } from "@/lib/db";

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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Hero Section */}
      <div className="relative h-[65vh] md:h-[80vh] w-full overflow-hidden">
        <Image
          src={bgImage}
          alt={show.title}
          fill
          className="object-cover object-top opacity-50 scale-105 transition-transform duration-1000 group-hover:scale-100"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 lg:px-20 pb-16">
          <Link href="/shows" className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all mb-8">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase">Return to Library</span>
          </Link>
          
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-primary text-primary-foreground border-none rounded-none px-3 font-black tracking-tighter">TV SERIES</Badge>
              <span className="text-muted-foreground font-mono text-sm tracking-widest">{show.year}</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-6 leading-[0.9]">
              {show.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm font-bold tracking-widest text-muted-foreground">
              <div className="flex items-center gap-2 text-primary">
                <Star className="w-4 h-4 fill-current" />
                {show.rating?.replace("/10", "") || "N/A"}
              </div>
              <div className="flex items-center gap-2 text-foreground">
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
            
            <div className="bg-muted/30 backdrop-blur-xl rounded-2xl p-8 border border-border">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" /> Storyline
              </h3>
              <p className="text-foreground leading-relaxed italic">
                {show.overview || "No description available for this series."}
              </p>
              <div className="mt-8 pt-8 border-t border-border flex justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Seasons</p>
                  <p className="text-2xl font-black">{seasons.length}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Files Found</p>
                  <p className="text-2xl font-black">{episodes.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Seasons & Episodes */}
          <div className="lg:col-span-8">
            <div className="sticky top-20 z-30 bg-background/80 backdrop-blur-md py-4 mb-10 border-b border-border flex items-center gap-8 overflow-x-auto no-scrollbar">
              {seasons.map((season) => (
                <button
                  key={season}
                  onClick={() => setActiveSeason(season ?? 1)}
                  className={`text-sm font-black tracking-widest uppercase transition-all pb-2 border-b-2 ${
                    activeSeason === season 
                    ? "text-primary border-primary" 
                    : "text-muted-foreground border-transparent hover:text-foreground"
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
                    ? "bg-muted/10 border-border hover:bg-muted/30 hover:border-primary/20" 
                    : "opacity-40 grayscale pointer-events-none border-transparent"
                  }`}
                >
                  <div className="relative w-full md:w-64 aspect-video rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                    <Image src={ep.poster || "/placeholder.jpg"} alt="ep" fill className="object-cover" />
                    
                    {ep.available ? (
                      <Link href={`/player/${ep.id}`} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <Play className="w-5 h-5 fill-primary-foreground text-primary-foreground ml-1" />
                         </div>
                      </Link>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <HardDrive className="w-6 h-6 text-destructive" />
                      </div>
                    )}

                    {ep.watch_progress && ep.runtime && ep.watch_progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                        <div 
                          className="h-full bg-primary shadow-[0_0_10px_var(--primary)]" 
                          style={{ width: `${Math.min(100, (ep.watch_progress / (ep.runtime * 60)) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-center py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-black italic tracking-tighter uppercase mb-1">
                          E{ep.episode_start} <span className="text-muted-foreground mx-2">—</span> {ep.title}
                        </h3>
                        <p className="text-xs font-mono text-muted-foreground truncate max-w-md">{ep.filename}</p>
                      </div>
                      {!ep.available && (
                        <Badge className="bg-destructive/10 text-destructive border-none text-[10px] font-bold">OFFLINE</Badge>
                      )}
                    </div>
                    
                    <div className="mt-4 flex items-center gap-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
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
    <div className="min-h-screen bg-background p-20 space-y-12 animate-pulse">
      <div className="h-64 w-full bg-muted rounded-3xl" />
      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-4 h-96 bg-muted rounded-3xl" />
        <div className="col-span-8 space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-20 text-center">
      <h1 className="text-9xl font-black text-muted mb-4 italic uppercase">404</h1>
      <p className="text-muted-foreground tracking-[0.5em] uppercase font-bold text-xs mb-8">Series Not Found</p>
      <Link href="/shows" className="px-8 py-3 bg-foreground text-background font-black uppercase tracking-tighter hover:bg-primary hover:text-primary-foreground transition-colors">
        Back to Library
      </Link>
    </div>
  );
}