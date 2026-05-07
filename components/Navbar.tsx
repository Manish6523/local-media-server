"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, Settings, Users } from "lucide-react";
import dynamic from "next/dynamic";

const WatchPartyModal = dynamic(() => import("./WatchParty/WatchPartyModal"), { ssr: false });

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/join") || pathname.startsWith("/watch") || pathname.startsWith("/player")) return <></>;
  
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        // Navigates to home with search query parameter
        window.location.href = `/?search=${encodeURIComponent(searchQuery.trim())}`;
      }
    },
    [searchQuery]
  );

  if (pathname.startsWith("/player")) return null;

  const navlinks = [
    { href: "/", label: "HOME" },
    { href: "/movies", label: "MOVIES" },
    { href: "/shows", label: "SHOWS" },
    { href: "/favorites", label: "WATCHLIST" }
  ];

  const navbar = (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? "bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 py-2"
          : "bg-black/50 py-4"
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-6 md:px-12 lg:px-20 relative">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0 z-10">
            <div className="w-7 h-7 bg-white flex items-center justify-center rounded-none rotate-45 group-hover:rotate-[225deg] transition-transform duration-500">
              <div className="w-3 h-3 bg-[#050505] -rotate-45" />
            </div>
            <span className="text-xl font-black tracking-[0.3em] text-white">
              FILMARO
            </span>
          </Link>

          {/* Center Navigation - Perfectly centered */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-10">
            {navlinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[10px] font-black tracking-[0.2em] transition-all hover:text-white relative pb-1 ${
                    isActive ? "text-white" : "text-white/40"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 animate-in fade-in zoom-in duration-300" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side: Search & Settings */}
          <div className="flex items-center gap-6 z-10">
            {/* Search Component */}
            <form 
              onSubmit={handleSearchSubmit} 
              className={`relative flex items-center transition-all duration-500 ${
                isSearchOpen ? "w-48 md:w-64" : "w-8"
              }`}
            >
              <input
                type="text"
                placeholder="SEARCH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setIsSearchOpen(false)}
                className={`w-full bg-transparent border-b transition-all duration-500 outline-none text-[10px] font-black tracking-widest py-1 pr-8 ${
                  isSearchOpen 
                    ? "border-red-600 text-white opacity-100 px-2" 
                    : "border-transparent text-transparent opacity-0 pointer-events-none"
                }`}
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`absolute right-0 p-2 transition-colors ${
                  isSearchOpen ? "text-red-600" : "text-white/40 hover:text-white"
                }`}
              >
                {isSearchOpen && searchQuery ? (
                   <X className="w-4 h-4" onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }} />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

            {/* Watch Party */}
            <button
              onClick={() => setShowPartyModal(true)}
              className="group flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-white/40 group-hover:text-[#E50914] transition-colors" />
              <span className="hidden xl:block text-[10px] font-black tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                PARTY
              </span>
            </button>

            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

            <Link
              href="/settings"
              className="group flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              <span className="hidden xl:block text-[10px] font-black tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                SETTINGS
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {navbar}
      <WatchPartyModal isOpen={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </>
  );
}