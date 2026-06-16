"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Heart, Settings, Search, Users, Sparkles, ChevronUp, Maximize, QrCode } from "lucide-react";
import dynamic from "next/dynamic";
import CommandMenu from "./CommandMenu";

const WatchPartyModal = dynamic(() => import("../WatchParty/WatchPartyModal"), { ssr: false });
const QRModal = dynamic(() => import("../QRModal"), { ssr: false });

export default function NavBar() {
  const pathname = usePathname();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isLocalNetwork, setIsLocalNetwork] = useState(true);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/shows", label: "Shows", icon: Tv },
    { href: "/favorites", label: "Favorites", icon: Heart },
  ];

  // Primary mobile links (always visible)
  const primaryMobileLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/shows", label: "Shows", icon: Tv },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Close expanded tray on route change
  useEffect(() => {
    setMobileExpanded(false);
  }, [pathname]);

  // Check if running on local network
  useEffect(() => {
    const hostname = window.location.hostname;
    const local =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.");
    setIsLocalNetwork(local);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Don't show nav on player/watch/join routes
  if (pathname.startsWith("/join") || pathname.startsWith("/watch") || pathname.startsWith("/player")) {
    return null;
  }

  return (
    <>
      {/* ═══ DESKTOP TOP NAV ═══ */}
      <header
        className={`hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 lg:px-8 py-3 transition-all duration-500 ${
          scrolled
            ? "bg-background/60 backdrop-blur-2xl border-b border-white/[0.04] shadow-lg shadow-black/10"
            : "bg-transparent"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
            VidLock
          </span>
        </Link>

        {/* Center Nav */}
        <nav className="flex items-center gap-1 glass-md px-1.5 py-1 rounded-full">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{link.label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-white/40 hover:text-white/70 hover:border-white/10 transition-all group"
          >
            <Search className="w-4 h-4" />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-white/30 ml-2">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => setShowPartyModal(true)}
            className="p-2.5 rounded-full glass text-white/50 hover:text-white hover:border-violet-500/20 transition-all"
            title="Watch Party"
          >
            <Users className="w-4 h-4" />
          </button>

          {isLocalNetwork && (
            <button
              onClick={() => setShowQRModal(true)}
              className="p-2.5 rounded-full glass text-white/50 hover:text-white hover:border-cyan-500/20 transition-all"
              title="Scan QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          <Link
            href="/settings"
            className={`p-2.5 rounded-full glass transition-all ${
              pathname === "/settings"
                ? "text-violet-400 border-violet-500/20"
                : "text-white/50 hover:text-white hover:border-white/10"
            }`}
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      {/* Backdrop overlay when expanded */}
      {mobileExpanded && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileExpanded(false)}
        />
      )}

      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
        {/* ── Secondary Tray (slides up) ── */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            mobileExpanded ? "max-h-20 opacity-100 mb-2" : "max-h-0 opacity-0 mb-0"
          }`}
        >
          <div className="glass-heavy rounded-2xl px-4 py-2.5 flex items-center justify-evenly shadow-2xl shadow-black/40">
            {/* Favourites */}
            <Link
              href="/favorites"
              onClick={() => setMobileExpanded(false)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
                pathname === "/favorites"
                  ? "text-violet-400"
                  : "text-white/40 hover:text-white/70 active:text-white"
              }`}
            >
              <Heart className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">Watchlist</span>
            </Link>

            {/* Watch Party */}
            <button
              onClick={() => { setMobileExpanded(false); setShowPartyModal(true); }}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-white/40 hover:text-white/70 active:text-white transition-all"
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">Party</span>
            </button>

            {/* QR Code */}
            {isLocalNetwork && (
              <button
                onClick={() => { setMobileExpanded(false); setShowQRModal(true); }}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-white/40 hover:text-white/70 active:text-white transition-all"
              >
                <QrCode className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-wide">Scan</span>
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={() => { toggleFullscreen(); setMobileExpanded(false); }}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
                isFullscreen
                  ? "text-violet-400"
                  : "text-white/40 hover:text-white/70 active:text-white"
              }`}
            >
              <Maximize className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">Fullscreen</span>
            </button>
          </div>
        </div>

        {/* ── Primary Row (always visible) ── */}
        <div className="glass-heavy rounded-2xl px-3 py-2.5 flex items-center justify-between shadow-2xl shadow-black/40">
          {/* Search */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Primary nav links: Home, Movies, Shows */}
          {primaryMobileLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative p-2.5 rounded-xl transition-all ${
                  isActive
                    ? "text-violet-400 bg-violet-500/10"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                <link.icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                )}
              </Link>
            );
          })}

          {/* Expand / Collapse toggle */}
          <button
            onClick={() => setMobileExpanded((v) => !v)}
            className={`p-2.5 rounded-xl transition-all duration-300 ${
              mobileExpanded
                ? "text-violet-400 bg-violet-500/10 rotate-180"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
            }`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CommandMenu open={isCommandOpen} setOpen={setIsCommandOpen} />
      <WatchPartyModal isOpen={showPartyModal} onClose={() => setShowPartyModal(false)} />
      <QRModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
    </>
  );
}
