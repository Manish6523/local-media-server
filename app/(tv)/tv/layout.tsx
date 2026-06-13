import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VidLock TV",
  description: "VidLock lightweight TV interface for webOS and older browsers.",
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/tv-styles.css" />
      </head>
      <body>
        <header className="tv-header">
          <div className="tv-header-inner clearfix">
            <div className="tv-logo">VidLock</div>
            <nav className="tv-nav">
              <a href="/tv">Home</a>
              <a href="/tv?type=movie">Movies</a>
              <a href="/tv?type=show">Shows</a>
            </nav>
          </div>
        </header>
        {children}
        <div className="tv-footer">VidLock TV &mdash; Lightweight Interface</div>
      </body>
    </html>
  );
}
