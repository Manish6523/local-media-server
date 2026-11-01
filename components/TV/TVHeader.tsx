"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Film, Tv, Home, ExternalLink } from "lucide-react";
import { useTVNavigation } from "./TVNavigationContext";

export default function TVHeader() {
  const { isFocused, registerRow, unregisterRow } = useTVNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  const navItems = [
    { label: "Home", href: "/tv", active: !currentType && pathname === "/tv", icon: Home },
    { label: "Movies", href: "/tv?type=movie", active: currentType === "movie", icon: Film },
    { label: "Series", href: "/tv?type=show", active: currentType === "show", icon: Tv },
    { label: "Web UI", href: "/", active: false, icon: ExternalLink },
  ];

  useEffect(() => {
    registerRow(0, navItems.length);
    return () => unregisterRow(0);
  }, [registerRow, unregisterRow, navItems.length]);

  return (
    <header className="tv-header">
      {/* Brand */}
      <div className="tv-brand">
        <div className="tv-logo-box">
          <Tv className="w-5 h-5 text-white" style={{ width: 20, height: 20 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="tv-brand-title">
            Vid<span className="tv-brand-accent">Lock</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
            TV Edition
          </span>
        </div>
      </div>

      {/* Nav Pills (Row 0) */}
      <nav className="tv-nav-bar">
        {navItems.map((item, colIdx) => {
          const focused = isFocused(0, colIdx);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              data-tv-row={0}
              data-tv-col={colIdx}
              className={`tv-nav-pill ${focused ? "focused" : ""} ${item.active ? "active" : ""}`}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon style={{ width: 14, height: 14 }} />
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* D-Pad Hint Badge */}
      <div className="tv-remote-hint">
        <span>D-Pad: ↑ ↓ ← → | OK to Select</span>
      </div>
    </header>
  );
}
