"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search, Film, Tv, Settings, Play, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        window.location.href = `/?search=${encodeURIComponent(searchQuery.trim())}`;
      }
    },
    [searchQuery]
  );

  const navLinks = [
    { href: "/", label: "Home", icon: null },
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/shows", label: "TV Shows", icon: Tv },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#141414]/95 backdrop-blur-md shadow-lg shadow-black/20"
          : "nav-blur"
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Play className="w-8 h-8 text-[#E50914] fill-[#E50914] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Vid<span className="text-[#E50914]">Lock</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-white ${
                  pathname === link.href
                    ? "text-white"
                    : "text-[#b3b3b3]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search & Mobile Nav */}
          <div className="flex items-center gap-3">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3b3b3]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Titles, genres..."
                    autoFocus
                    className="bg-[#141414] border border-white/30 rounded pl-10 pr-4 py-1.5 text-sm text-white placeholder:text-[#666] focus:outline-none focus:border-white/60 w-48 md:w-64 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="text-[#b3b3b3] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="text-[#b3b3b3] hover:text-white transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Mobile nav links */}
            <div className="flex md:hidden items-center gap-2">
              {navLinks.slice(1).map((link) => {
                const Icon = link.icon;
                return Icon ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`p-2 rounded-lg transition-colors ${
                      pathname === link.href
                        ? "text-white bg-white/10"
                        : "text-[#b3b3b3] hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
