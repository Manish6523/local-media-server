"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Clock, Calendar, ArrowLeft, HardDrive, Info, Share2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MediaEntry {
  id: number;
  type: "movie" | "show";
  title: string;
  year: number | null;
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

export default function MovieDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [movie, setMovie] = useState<MediaEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media?type=movie")
      .then((r) => r.json())
      .then((data: MediaEntry[]) => {
        const found = data.find(
          (m: MediaEntry) =>
            m.title.toLowerCase().replace(/\s+/g, "-") === decodeURIComponent(slug)
        );
        setMovie(found || null);
      })
      .catch(() => setMovie(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (!movie) return <NotFound />;

  const posterSrc = movie.poster || "/placeholder.jpg";
  const bgImage = movie.backdrop || movie.poster || "/placeholder.jpg";
  const progressPercent = movie.watch_progress && movie.runtime
    ? Math.min(100, Math.max(0, (movie.watch_progress / (movie.runtime * 60)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      {/* Immersive Hero Backdrop */}
      <div className="relative h-[65vh] md:h-[85vh] w-full overflow-hidden">
        <Image
          src={bgImage}
          alt={movie.title}
          fill
          className="object-cover object-top opacity-50 scale-105 transition-transform duration-1000"
          priority
        />
        {/* Layered Cinematic Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent" />
        
        {/* Top Navigation Overlay */}
        <div className="absolute top-32 left-0 w-full px-6 md:px-12 lg:px-20 z-20">
          <Link href="/" className="group inline-flex items-center gap-2 text-white/40 hover:text-white transition-all font-black tracking-[0.3em] text-[10px] uppercase">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Library
          </Link>
        </div>

        {/* Title & Stats Overlay */}
        <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 lg:px-20 pb-20 z-10">
          <div className="max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <Badge className="bg-emerald-500 text-black border-none rounded-none px-3 font-black tracking-tighter italic text-xs">ULTRA HD</Badge>
              <div className="h-4 w-[1px] bg-white/20 mx-1" />
              <span className="text-white/40 font-bold text-xs tracking-widest uppercase">
                {movie.genres?.split(',')[0]}
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase mb-8 leading-[0.8] italic drop-shadow-2xl">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-8 text-xs font-black tracking-[0.2em] text-white/50">
              <div className="flex items-center gap-2 text-emerald-400">
                <Star className="w-5 h-5 fill-current" />
                <span className="text-xl tracking-tighter">{movie.rating?.replace("/10", "") || "NR"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {movie.year}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {movie.runtime} MINS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="relative z-20 px-6 md:px-12 lg:px-20 pb-32 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Column: Media Card */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="relative aspect-[2/3] w-full max-w-[340px] mx-auto lg:mx-0 rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)] border border-white/10 group">
              <Image 
                src={posterSrc} 
                alt={movie.title} 
                fill 
                className={`object-cover transition-transform duration-700 group-hover:scale-110 ${!movie.available ? "grayscale brightness-50" : ""}`} 
              />
              
              {!movie.available && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 backdrop-blur-sm">
                  <HardDrive className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-red-500 font-black tracking-tighter text-xl leading-tight uppercase">Drive<br/>Disconnected</p>
                </div>
              )}

              {/* Progress bar integrated into card base */}
              {progressPercent > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/40">
                  <div className="h-full bg-emerald-500 shadow-[0_0_20px_#10b981]" style={{ width: `${progressPercent}%` }} />
                </div>
              )}
            </div>

            {/* Technical Quick-Specs */}
            <div className="hidden lg:block bg-white/5 border border-white/10 rounded-2xl p-6">
               <div className="flex items-center gap-3 mb-4 text-white/40">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Metadata Verified</span>
               </div>
               <p className="text-[11px] font-mono text-white/30 break-all leading-relaxed">
                  PATH: /mnt/media/movies/{movie.filename}
               </p>
            </div>
          </div>

          {/* Right Column: Info & Actions */}
          <div className="lg:col-span-8 lg:pt-10">
            <div className="flex flex-col gap-12">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Synopsis
                </h3>
                <p className="text-xl md:text-2xl font-medium leading-relaxed text-neutral-300 max-w-4xl italic">
                  {movie.overview || "No plot summary available for this title."}
                </p>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                {movie.available ? (
                  <Link
                    href={`/player/${movie.id}`}
                    className="group w-full sm:w-auto inline-flex items-center justify-center gap-4 bg-emerald-500 hover:bg-emerald-400 text-black px-12 py-6 rounded-full font-black text-xl transition-all transform hover:scale-105 hover:rotate-1 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                  >
                    <Play className="w-6 h-6 fill-black" />
                    RESUME FILM
                  </Link>
                ) : (
                  <div className="w-full sm:w-auto inline-flex items-center justify-center gap-4 bg-white/5 text-white/20 px-12 py-6 rounded-full font-black text-xl border border-white/5 cursor-not-allowed">
                    <HardDrive className="w-6 h-6" />
                    OFFLINE
                  </div>
                )}
                
                <button className="h-16 w-16 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all active:scale-90">
                   <Share2 className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Genres Tag Cloud */}
              <div className="pt-8 flex flex-wrap gap-2">
                {movie.genres?.split(',').map((genre) => (
                  <span key={genre} className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 border border-white/5">
                    {genre.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#050505] p-20 animate-pulse">
      <div className="h-[60vh] w-full bg-white/5 rounded-3xl mb-12" />
      <div className="grid grid-cols-12 gap-12 max-w-[1920px] mx-auto">
        <div className="col-span-4 h-96 bg-white/5 rounded-3xl" />
        <div className="col-span-8 h-96 bg-white/5 rounded-3xl" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-20 text-center">
      <div className="relative mb-8">
        <h1 className="text-[15vw] font-black text-white/5 italic uppercase leading-none">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white tracking-[0.8em] uppercase font-black text-sm">Media Lost</p>
        </div>
      </div>
      <Link href="/" className="px-12 py-4 bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-white transition-all rounded-full shadow-2xl">
        Back to Library
      </Link>
    </div>
  );
}