"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ FIX: Move the conditional check AFTER all hooks
  if (pathname.startsWith("/player")) return null;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#031716]/95 backdrop-blur-md shadow-lg shadow-black/30"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-6 md:px-10 lg:px-14">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
              <div className="w-4 h-4 rounded-full border-2 border-[#031716] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#031716]" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-[0.2em] text-white">
              FILMARO
            </span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-8">
            <Link
              href="/favorites"
              className="text-xs font-bold tracking-[0.15em] text-white hover:text-white/80 transition-colors"
            >
              WATCHLIST
            </Link>
            <Link
              href="/settings"
              className="text-xs font-bold tracking-[0.15em] text-white hover:text-white/80 transition-colors"
            >
              SETTINGS
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}