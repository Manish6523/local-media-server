"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles, Search, Globe, HardDrive } from "lucide-react";
import type { MediaEntry } from "@/lib/db";
import PosterCard from "@/components/PosterCard";

const searchCache = new Map<string, MediaEntry[]>();

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialQuery = searchParams.get("q") || "";
  const initialMode = (searchParams.get("mode") as "local" | "online") || "local";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<"local" | "online">(initialMode);

  // Debounced search effect
  useEffect(() => {
    if (!query) {
      setResults([]);
      // Remove params if query is empty
      if (searchParams.has("q")) {
        router.replace(`/search?mode=${searchMode}`);
      }
      return;
    }

    // Sync state to URL
    const currentQ = searchParams.get("q");
    const currentMode = searchParams.get("mode");
    if (currentQ !== query || currentMode !== searchMode) {
      router.replace(`/search?q=${encodeURIComponent(query)}&mode=${searchMode}`);
    }

    const cacheKey = `${query}-${searchMode}`;
    if (searchCache.has(cacheKey)) {
      setResults(searchCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&mode=${searchMode}`);
        if (res.ok) {
          const data = await res.json();
          searchCache.set(cacheKey, data);
          setResults(data);
        }
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchMode]);

  return (
    <div className="min-h-screen pt-28 px-4 md:px-8 lg:px-14 pb-24 max-w-7xl mx-auto">
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto mb-12 space-y-6">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight text-center">
          What do you want to watch?
        </h1>
        
        {/* Search Input */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-white/40" />
          </div>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-16 pr-6 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all shadow-xl shadow-black/20"
            placeholder="Search for movies, shows, anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {loading && (
            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
              <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Source Toggle */}
        <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/5 border border-white/10">
          <button
            onClick={() => setSearchMode("local")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              searchMode === "local" 
                ? "bg-violet-500 text-white shadow-md shadow-violet-500/20" 
                : "text-white/40 hover:text-white/80"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Local Library
          </button>
          <button
            onClick={() => setSearchMode("online")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              searchMode === "online" 
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                : "text-white/40 hover:text-white/80"
            }`}
          >
            <Globe className="w-4 h-4" />
            Online (2embed)
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="mt-8">
        {!query ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <Sparkles className="w-12 h-12 mb-4 text-white/20" />
            <p className="text-xl font-medium text-white/60">Search your entire library</p>
            <p className="text-sm text-white/40 mt-2">Start typing above to see instant results</p>
          </div>
        ) : loading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-8 h-8 mb-4 text-violet-400 animate-spin" />
            <p className="text-lg font-medium text-white/60">Searching...</p>
          </div>
        ) : results.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight text-white/80">
                Search Results
              </h2>
              <span className="text-sm font-medium text-white/40 bg-white/5 px-3 py-1 rounded-full">
                {results.length} found
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
              {results.map((media) => (
                <PosterCard key={media.id} media={media} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No results found</h3>
            <p className="text-white/50">
              We couldn't find anything matching "{query}" in your {searchMode === "local" ? "local library" : "online sources"}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 px-4 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
