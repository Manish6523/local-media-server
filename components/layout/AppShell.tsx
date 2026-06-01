"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Users, Settings, Search, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import CommandMenu from "./CommandMenu";

const WatchPartyModal = dynamic(() => import("../WatchParty/WatchPartyModal"), { ssr: false });

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  const navLinks = [
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

  // Don't show shell on player routes
  if (pathname.startsWith("/join") || pathname.startsWith("/watch") || pathname.startsWith("/player")) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* DESKTOP SIDEBAR */}
      <motion.aside
        initial={{ width: "80px" }}
        animate={{ width: isSidebarExpanded ? "240px" : "80px" }}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className="hidden md:flex flex-col border-r border-white/5 bg-background/60 backdrop-blur-xl z-50 transition-all duration-300 ease-in-out"
      >
        <div className="p-6 flex items-center justify-center md:justify-start">
          <div className="w-8 h-8 shrink-0 bg-primary flex items-center justify-center rounded-md rotate-45">
            <div className="w-3 h-3 bg-background -rotate-45" />
          </div>
          <AnimatePresence>
            {isSidebarExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-4 font-black tracking-[0.2em] text-foreground text-xl whitespace-nowrap"
              >
                FILMARO
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 mt-8 flex flex-col gap-2 px-4">
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center p-3 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground group w-full"
          >
            <Search className="w-5 h-5 shrink-0 group-hover:text-primary transition-colors" />
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-4 font-semibold text-sm tracking-wide whitespace-nowrap flex-1 text-left"
                >
                  Search
                </motion.span>
              )}
            </AnimatePresence>
            {isSidebarExpanded && (
              <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-white/20 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            )}
          </button>

          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center p-3 rounded-xl transition-all group ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                <link.icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {isSidebarExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-4 font-semibold text-sm tracking-wide whitespace-nowrap"
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}

          <div className="my-4 h-px bg-white/5 mx-2" />

          <button
            onClick={() => setShowPartyModal(true)}
            className="flex items-center p-3 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground group w-full"
          >
            <Users className="w-5 h-5 shrink-0 group-hover:text-primary transition-colors" />
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-4 font-semibold text-sm tracking-wide whitespace-nowrap flex-1 text-left"
                >
                  Watch Party
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="p-4">
          <Link
            href="/settings"
            className="flex items-center p-3 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground group"
          >
            <Settings className="w-5 h-5 shrink-0 group-hover:text-primary transition-colors" />
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-4 font-semibold text-sm tracking-wide whitespace-nowrap"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="min-h-full pb-24 md:pb-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MOBILE FLOATING BOTTOM NAV */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
        <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
          <button onClick={() => setIsCommandOpen(true)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <Search className="w-5 h-5" />
          </button>
          
          {navLinks.map((link) => {
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
