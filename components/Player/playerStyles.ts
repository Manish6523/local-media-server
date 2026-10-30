import React from "react";

/**
 * Production-safe glass style for MediaPlayer popups and menus floating over HTML5 <video>.
 * Prevents Next.js / PostCSS production build minifier from stripping -webkit-backdrop-filter,
 * and provides a solid dark base gradient so popups remain completely legible even if GPU
 * compositing falls back temporarily.
 */
export const PLAYER_POPUP_GLASS_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(18, 18, 20, 0.88), rgba(10, 10, 12, 0.94))",
  backdropFilter: "saturate(180%) blur(36px)",
  WebkitBackdropFilter: "saturate(180%) blur(36px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
  willChange: "transform, opacity",
};

/**
 * Production-safe glass style for MediaPlayer control capsules, floating pills, and HUDs.
 */
export const PLAYER_PILL_GLASS_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05))",
  backdropFilter: "saturate(160%) blur(32px)",
  WebkitBackdropFilter: "saturate(160%) blur(32px)",
  border: "1px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.35)",
  willChange: "transform, opacity",
};

/**
 * Production-safe glass style for play buttons, interactive pills, and glowing controls.
 */
export const GLASS_BUTTON_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06))",
  backdropFilter: "saturate(160%) blur(24px)",
  WebkitBackdropFilter: "saturate(160%) blur(24px)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
  willChange: "transform, opacity",
};

/**
 * Production-safe glass style for cards, episode containers, and small panels.
 */
export const GLASS_CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))",
  backdropFilter: "saturate(140%) blur(20px)",
  WebkitBackdropFilter: "saturate(140%) blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

/**
 * Production-safe glass style for side panels, sheets, and full modal drawers.
 */
export const GLASS_PANEL_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(16, 16, 20, 0.90), rgba(10, 10, 14, 0.95))",
  backdropFilter: "saturate(180%) blur(40px)",
  WebkitBackdropFilter: "saturate(180%) blur(40px)",
  border: "1px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  willChange: "transform, opacity",
};
