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
import { Film, Tv, Sparkles, Loader2 } from "lucide-react";
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
            <div className="flex items-center gap-2 justify-center py-6 text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-white/30">No results found.</div>
          )}
        </CommandEmpty>
        
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-4 cursor-pointer p-2 rounded-xl mx-2 my-1 transition-all duration-200 data-[selected=true]:bg-white/10 data-[selected=true]:scale-[1.01]"
              >
                <div className=" h-14 rounded overflow-hidden glass flex items-center justify-center shrink-0 bg-black/20">
                  {item.poster ? (
                    <img src={item.poster} alt="" className="w-full h-full object-contain" />
                  ) : item.type === "movie" ? (
                    <Film className="w-4 h-4 text-violet-400" />
                  ) : (
                    <Tv className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-white/90 truncate">{item.title}</span>
                  <span className="text-xs text-white/30">{item.year} • {item.type === "movie" ? "Movie" : "TV Show"}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
