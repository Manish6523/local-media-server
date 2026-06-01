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
import { Film, Tv } from "lucide-react";
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
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a movie or show name..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>
        
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 cursor-pointer p-3"
              >
                {item.type === "movie" ? (
                  <Film className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Tv className="w-4 h-4 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.year} • {item.type.toUpperCase()}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
