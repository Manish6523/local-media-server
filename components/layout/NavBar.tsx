"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Film, Tv, Heart, Settings, Search, Users, Sparkles, ChevronUp, Maximize, QrCode, Shuffle, Menu, X, Compass, Download, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/Toast";
import { useScan } from "@/components/ScanProvider";

const WatchPartyModal = dynamic(() => import("../WatchParty/WatchPartyModal"), { ssr: false });
const QRModal = dynamic(() => import("../QRModal"), { ssr: false });

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isLocalNetwork, setIsLocalNetwork] = useState(true);
  const [showShuffleMenu, setShowShuffleMenu] = useState(false);
  const [shuffleLoading, setShuffleLoading] = useState(false);
  const [showDiscoverTab, setShowDiscoverTab] = useState(true);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const shuffleRef = useRef<HTMLDivElement>(null);
  const { scanning, scanProgress } = useScan();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI?.onUpdateProgress) {
      (window as any).electronAPI.onUpdateProgress((progress: any) => {
        setUpdateProgress(progress.percent);
      });
    }
  }, []);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    ...(showDiscoverTab ? [{ href: "/discover", label: "Discover", icon: Compass }] : []),
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/shows", label: "Shows", icon: Tv },
    { href: "/favorites", label: "Favorites", icon: Heart },
  ];

  // Primary mobile links (always visible)
  const primaryMobileLinks = [
    { href: "/", label: "Home", icon: Home },
    ...(showDiscoverTab ? [{ href: "/discover", label: "Discover", icon: Compass }] : []),
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/shows", label: "Shows", icon: Tv },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/search");
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

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (data.showDiscoverTab !== undefined) {
          setShowDiscoverTab(data.showDiscoverTab);
        }
      })
      .catch(console.error);
  }, []);

  // ── Shuffle handler ──
  const triggerShuffle = useCallback(async (type: "movie" | "show" | "both") => {
    setShowShuffleMenu(false);
    setShuffleLoading(true);
    try {
      const res = await fetch(`/api/shuffle?type=${type}`);
      const data = await res.json();
      if (data.found) {
        // Brief spin delay for visual feedback
        await new Promise(r => setTimeout(r, 300));
        router.push(data.href);
      } else {
        if (type === "movie") {
          toast("No unwatched movies found — try Shows or Both", "info");
        } else if (type === "show") {
          toast("No unwatched shows found — try Movies or Both", "info");
        } else {
          toast("You've watched everything! Mark some as unwatched to shuffle again 🎉", "success");
        }
      }
    } catch {
      toast("Shuffle failed — please try again", "error");
    } finally {
      setShuffleLoading(false);
    }
  }, [router, toast]);

  // ── Keyboard shortcut: R key for instant shuffle ──
  useEffect(() => {
    const handleShuffleKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if ((document.activeElement as HTMLElement)?.isContentEditable) return;
        triggerShuffle("both");
      }
    };
    window.addEventListener("keydown", handleShuffleKey);
    return () => window.removeEventListener("keydown", handleShuffleKey);
  }, [triggerShuffle]);

  // ── Close shuffle dropdown on outside click ──
  useEffect(() => {
    if (!showShuffleMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (shuffleRef.current && !shuffleRef.current.contains(e.target as Node)) {
        setShowShuffleMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowShuffleMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showShuffleMenu]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Don't show any nav on player/watch/join routes
  if (pathname.startsWith("/join") || pathname.startsWith("/watch") || pathname.startsWith("/player")) {
    return null;
  }

  // On show/movie detail pages, hide desktop nav but keep mobile bottom nav
  const isDetailPage = pathname.startsWith("/shows/") || pathname.startsWith("/movies/");

  return (
    <>
      {/* ═══ DESKTOP TOP NAV ═══ */}
      <header
        className={`${isDetailPage ? "hidden" : "flex"} fixed top-0 left-0 right-0 z-50 items-center justify-between px-4 md:px-6 lg:px-8 py-3 transition-all duration-500 ${
          scrolled
            // ? "bg-background/60 backdrop-blur-2xl border-b border-white/[0.04] shadow-lg shadow-black/10"
            ? "bg-transparent"
            : "bg-transparent"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0 glass-md px-4 py-1.5 rounded-full">
          <img 
            src="/logo.png" 
            alt="VidLock Logo" 
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(139,92,246,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(139,92,246,0.8)] transition-all duration-300"
          />
          <span className="text-lg font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
            VidLock
          </span>
        </Link>

        {/* Center Nav */}
        <nav className={`${isDetailPage ? "hidden" : "hidden md:flex"} items-center gap-1 glass-md px-1.5 py-1 rounded-full`}>
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
        <div className={`${isDetailPage ? "hidden" : "hidden md:flex"} items-center gap-2 shrink-0`}>
          <Link
            href="/search"
            className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-white/40 hover:text-white/70 hover:border-white/10 transition-all group"
          >
            <Search className="w-4 h-4" />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-white/30 ml-2">
              ⌘K
            </kbd>
          </Link>

          {/* Update Progress Indicator */}
          {updateProgress !== null && updateProgress < 100 && (
            <div
              className="relative p-2.5 rounded-full glass text-violet-400 transition-all"
              title={`Downloading update... ${Math.round(updateProgress)}%`}
            >
              <span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `conic-gradient(#8b5cf6 ${updateProgress * 3.6}deg, transparent ${updateProgress * 3.6}deg)`,
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                }}
              />
              <Download className="relative w-4 h-4" />
            </div>
          )}

          {/* Scan Progress Indicator */}
          {scanning && (
            <Link
              href="/settings"
              className="relative p-2.5 rounded-full glass text-emerald-400 hover:text-emerald-300 transition-all"
              title={`${scanProgress.message} — ${Math.round(scanProgress.percent)}%`}
            >
              <span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `conic-gradient(#10b981 ${scanProgress.percent * 3.6}deg, transparent ${scanProgress.percent * 3.6}deg)`,
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                }}
              />
              <RefreshCw className="relative w-4 h-4 animate-spin" />
            </Link>
          )}

          {/* Shuffle Button */}
          <div className="relative" ref={shuffleRef}>
            <button
              onClick={() => setShowShuffleMenu(v => !v)}
              className={`p-2.5 rounded-full glass transition-all cursor-pointer ${
                shuffleLoading
                  ? "text-violet-400 border-violet-500/20"
                  : "text-white/50 hover:text-white hover:border-emerald-500/20"
              }`}
              title="Shuffle (R)"
            >
              <Shuffle className={`w-4 h-4 ${shuffleLoading ? "animate-spin" : ""}`} />
            </button>

            {/* Shuffle Dropdown */}
            {showShuffleMenu && (
              <div className="absolute right-0 top-full mt-2 w-[180px] rounded-xl bg-black/60 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/40 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => triggerShuffle("movie")}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 cursor-pointer rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    <span className="text-base">🎬</span> Movies
                  </button>
                  <button
                    onClick={() => triggerShuffle("show")}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 cursor-pointer rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    <span className="text-base">📺</span> Shows
                  </button>
                  <button
                    onClick={() => triggerShuffle("both")}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 cursor-pointer rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    <span className="text-base">🎲</span> Both
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPartyModal(true)}
            className="p-2.5 rounded-full glass text-white/50 hover:text-white cursor-pointer hover:border-violet-500/20 transition-all"
            title="Watch Party"
          >
            <Users className="w-4 h-4" />
          </button>

          {isLocalNetwork && (
            <button
              onClick={() => setShowQRModal(true)}
              className="p-2.5 rounded-full glass text-white/50 hover:text-white cursor-pointer hover:border-cyan-500/20 transition-all"
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
      {/* Expanded Menu Overlay */}
      {mobileExpanded && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setMobileExpanded(false)}
        >
          <div
            className="absolute bottom-28 left-4 right-4 bg-gradient-to-b from-[#1a1a1a]/95 to-[#0a0a0a]/95 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-white/80 font-bold tracking-wide">More Options</span>
              <button onClick={() => setMobileExpanded(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => { setMobileExpanded(false); router.push("/favorites"); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all">
                <Heart className="w-6 h-6 text-rose-400" />
                <span className="text-[11px] font-medium text-white/70">Watchlist</span>
              </button>
              
              <button onClick={() => { setMobileExpanded(false); triggerShuffle("both"); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all">
                <Shuffle className={`w-6 h-6 text-violet-400 ${shuffleLoading ? "animate-spin" : ""}`} />
                <span className="text-[11px] font-medium text-white/70">Shuffle</span>
              </button>

              <button onClick={() => { setMobileExpanded(false); setShowPartyModal(true); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all">
                <Users className="w-6 h-6 text-blue-400" />
                <span className="text-[11px] font-medium text-white/70">Party</span>
              </button>

              {isLocalNetwork && (
                <button onClick={() => { setMobileExpanded(false); setShowQRModal(true); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all">
                  <QrCode className="w-6 h-6 text-emerald-400" />
                  <span className="text-[11px] font-medium text-white/70">Scan QR</span>
                </button>
              )}

              <button onClick={() => { setMobileExpanded(false); toggleFullscreen(); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all">
                <Maximize className="w-6 h-6 text-amber-400" />
                <span className="text-[11px] font-medium text-white/70">Fullscreen</span>
              </button>
              
              <button onClick={() => { setMobileExpanded(false); router.push("/settings"); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all">
                <Settings className="w-6 h-6 text-gray-400" />
                <span className="text-[11px] font-medium text-white/70">Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pill Nav */}
      <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-3">
        <div className="bg-[#0a0a0a]/85 backdrop-blur-3xl border border-white/[0.08] rounded-full p-1.5 flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {primaryMobileLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-white text-black shadow-md"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <link.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  {isActive && (
                    <span className="text-xs font-bold tracking-wide whitespace-nowrap">{link.label}</span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1 pl-1 shrink-0">
            {scanning && (
              <Link href="/settings" className="relative p-3 rounded-full text-emerald-400 transition-all" title={`${scanProgress.message} — ${Math.round(scanProgress.percent)}%`}>
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#10b981 ${scanProgress.percent * 3.6}deg, rgba(255,255,255,0.06) ${scanProgress.percent * 3.6}deg)`,
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                  }}
                />
                <RefreshCw className="relative w-5 h-5 animate-spin" />
              </Link>
            )}

            {updateProgress !== null && updateProgress < 100 && (
              <div
                className="relative p-3 rounded-full text-violet-400 transition-all"
                title={`Downloading update... ${Math.round(updateProgress)}%`}
              >
                <span
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: `conic-gradient(#8b5cf6 ${updateProgress * 3.6}deg, transparent ${updateProgress * 3.6}deg)`,
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                  }}
                />
                <Download className="relative w-5 h-5 animate-bounce" />
              </div>
            )}
            <div className="w-[1px] h-6 bg-white/[0.08] mx-1" />

            <Link
              href="/search"
              className="p-3 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
            >
              <Search className="w-5 h-5" />
            </Link>

            <button
              onClick={() => setMobileExpanded(!mobileExpanded)}
              className="p-3 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
            >
              {mobileExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <WatchPartyModal isOpen={showPartyModal} onClose={() => setShowPartyModal(false)} />
      <QRModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
    </>
  );
}
