"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Film, Tv, Sparkles, Loader2, Star } from "lucide-react";
import type { MediaEntry } from "@/lib/db";

export default function CommandMenu({ open, setOpen }: { open: boolean, setOpen: (o: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.slice(0, 10)); // Limit to 10
        }
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: MediaEntry) => {
    setOpen(false);
    const slug = item.title.toLowerCase().replace(/\s+/g, "-");
    if (item.type === "movie") {
      router.push(`/movies/${slug}`);
    } else {
      router.push(`/shows/${slug}`);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} commandProps={{ shouldFilter: false }}>
      <CommandInput 
        placeholder="Search movies, shows..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? (
            <div className="flex flex-col items-center gap-3 justify-center py-10 text-white/30">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Searching...</span>
            </div>
          ) : query ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Sparkles className="w-8 h-8 text-white/10" />
              <p className="text-white/25 text-sm font-medium">No results found</p>
              <p className="text-white/15 text-xs">Try a different search term</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10">
              <Sparkles className="w-8 h-8 text-white/10" />
              <p className="text-white/25 text-sm font-medium">Start typing to search</p>
              <p className="text-white/15 text-xs">Movies, shows, and more</p>
            </div>
          )}
        </CommandEmpty>
        
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-4 cursor-pointer p-2.5 rounded-xl mx-1 my-0.5 transition-all duration-200 data-[selected=true]:bg-white/[0.06]"
              >
                <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/[0.06] bg-white/[0.03]">
                  {item.poster ? (
                    <img src={item.poster} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.type === "movie" ? (
                        <Film className="w-4 h-4 text-violet-400/50" />
                      ) : (
                        <Tv className="w-4 h-4 text-cyan-400/50" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-white/90 truncate text-sm">{item.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-white/25 font-medium">{item.year}</span>
                    <span className="w-1 h-1 rounded-full bg-white/15" />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${item.type === "movie" ? "text-violet-400/60" : "text-cyan-400/60"}`}>
                      {item.type === "movie" ? "Movie" : "TV Show"}
                    </span>
                    {item.rating && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/15" />
                        <span className="text-[11px] text-amber-400/60 font-medium flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400/60" /> {item.rating}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === "movie" ? "bg-violet-500/10" : "bg-cyan-500/10"}`}>
                  {item.type === "movie" ? (
                    <Film className="w-3.5 h-3.5 text-violet-400/50" />
                  ) : (
                    <Tv className="w-3.5 h-3.5 text-cyan-400/50" />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
