"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Users, Settings, Search, Bell, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import CommandMenu from "./CommandMenu";
import { useBackground } from "@/components/BackgroundContext";

const WatchPartyModal = dynamic(() => import("../WatchParty/WatchPartyModal"), { ssr: false });

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const { bgImage } = useBackground();

  const mobileNavLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/shows", label: "Shows", icon: Tv },
  ];

  const topNavLinks = [
    { href: "/movies", label: "Movies" },
    { href: "/shows", label: "TV Series" },
    { href: "/animation", label: "Animation" },
    { href: "/thriller", label: "Thriller" },
    { href: "/drama", label: "Drama" },
    { href: "/more", label: "More" },
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

  // Don't show shell on player routes
  if (pathname.startsWith("/join") || pathname.startsWith("/watch") || pathname.startsWith("/player")) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Dynamic background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url('${bgImage || "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop"}')` }}
      />
      {/* Dark overlay to ensure text contrast */}
      <div className="absolute inset-0 bg-white/10" />
      
      {/* Centered Desktop Window Container */}
      <div className="flex-1 flex flex-col md:p-3 lg:p-4 z-10 w-full h-full ">
        <div className="w-full h-full mx-auto md:rounded-[2rem] md:border md:border-white/10 flex flex-col overflow-hidden relative shadow-2xl bg-black/40 md:backdrop-blur-xl">
          
          {/* TOP NAVIGATION (Desktop Only) */}
          <header className="hidden md:flex items-center justify-between px-8 py-5 shrink-0 z-20">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <button 
                onClick={() => setIsCommandOpen(true)}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/5 rounded-full py-2.5 pl-11 pr-4 text-sm text-white/50 text-left transition-colors flex items-center justify-between"
              >
                Search
              </button>
            </div>

            {/* Categories */}
            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
              {topNavLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="px-5 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button onClick={() => setShowPartyModal(true)} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-colors relative">
                <Users className="w-5 h-5" />
              </button>
              <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-green-500 rounded-full border border-zinc-900" />
              </button>
              
              <div className="flex items-center gap-2 pl-2 p-1.5 pr-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-orange-400 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                  MR
                </div>
                <span className="text-sm font-medium text-white/90">Moinur Rahman</span>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </div>
            </div>
          </header>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 relative overflow-y-auto overflow-x-hidden md:px-8 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="min-h-full p-4  backdrop-blur-3xl sm:backdrop-blur-none"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* MOBILE FLOATING BOTTOM NAV */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
        <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
          <button onClick={() => setIsCommandOpen(true)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <Search className="w-5 h-5" />
          </button>
          
          {mobileNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`p-2 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <link.icon className="w-5 h-5" />
              </Link>
            );
          })}

          <Link href="/settings" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <CommandMenu open={isCommandOpen} setOpen={setIsCommandOpen} />
      <WatchPartyModal isOpen={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </div>
  );
}
