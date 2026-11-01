import type { Metadata } from "next";
import { TVNavigationProvider } from "@/components/TV/TVNavigationContext";

export const metadata: Metadata = {
  title: "VidLock TV — 10-Foot Cinema Experience",
  description: "Modern D-Pad and remote control optimized media streaming interface for Smart TVs and displays.",
};

export default function TVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        {/* Universal Smart TV Compatible Stylesheet (Chromium 38+ / webOS / Tizen) */}
        <link rel="stylesheet" href="/tv-styles.css" />
      </head>
      <body>
        <TVNavigationProvider>
          {children}
        </TVNavigationProvider>
      </body>
    </html>
  );
}
