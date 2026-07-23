<p align="center">
  <h1 align="center">🎬 VidLock</h1>
  <p align="center">
    A self-hosted, fully local, Netflix-style media server.<br/>
    No cloud. No accounts. No subscriptions. Just your media, beautifully presented.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?style=flat-square&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/FFmpeg-HW%20Accel-007808?style=flat-square&logo=ffmpeg" alt="FFmpeg" />
  <img src="https://img.shields.io/badge/Socket.IO-Watch%20Party-010101?style=flat-square&logo=socketdotio" alt="Socket.IO" />
</p>

---

## ✨ What is VidLock?

Point VidLock at a folder of movies and TV shows, hit **Scan**, and get a beautiful browsing UI with hardware-accelerated streaming, subtitles, watch progress tracking, favorites, and synchronized **LAN watch parties** — all running from a single Node.js process on your own machine.

No internet required after the initial metadata fetch.

---

## 🚀 Features

### 📚 Library Management
- **Smart scanner** — recursively walks local folders and optional external HDDs, parses filenames into structured metadata (title, season, episode), and auto-fetches posters, backdrops, ratings, and plot summaries
- **Incremental scanning** — already-scanned files with confirmed metadata are skipped, only new files trigger API calls
- **HDD awareness** — when an external drive is unplugged, its entries are marked offline instead of deleted; plug it back in and re-scan to restore

### 🎥 Browsing & Discovery
- **Movies & Shows** — sortable grids (by rating, year, recently added, A→Z) with genre filtering
- **Series grouping** — episodes are grouped by show with season tabs and episode lists
- **Continue Watching** — resume where you left off, auto-marks as watched at ≥90%
- **Favorites** — star any title, browse them on a dedicated page
- **Search** — instant full-library search

### ▶️ Player
- **Netflix-style player** — HTML5 + HLS.js with a custom UI (progress bar, volume, skip overlays)
- **Hardware-accelerated transcoding** — on-the-fly FFmpeg transcoding for `.mkv`, `.avi`, `.wmv`, and 10-bit HEVC
- **GPU auto-detection** — probes at boot: NVENC → VAAPI → QSV → CPU fallback
- **Subtitles** — external `.srt` (auto-converted to WebVTT) and `.vtt`, embedded tracks via FFmpeg, with size/color controls
- **Multi audio tracks** — switch between dubs and commentaries on the fly
- **Range streaming** — native MP4 files are served with HTTP range requests (no transcoding overhead)

### 🎉 Watch Party (LAN Co-Watching)
- **Room-based** — host creates a room, gets a 6-character code + QR code
- **Synced playback** — host controls play/pause/seek; all clients stay in sync
- **NTP-style clock correction** — 5-sample round-trip handshake computes per-client clock offset for frame-accurate sync
- **Ready-check protocol** — after seeks, server pauses everyone and waits up to 15s for all clients to finish buffering before resuming
- **In-room chat** — 200-character message panel

### 📺 TV / webOS Mode
- Auto-redirects LG webOS and NetCast browsers to a lightweight `/tv` UI designed for cursor/remote navigation

### 🔒 Admin PIN
- Optional SHA-256-hashed PIN to lock down settings and edit actions
- Per-session verification via `sessionStorage`

### ✏️ Metadata Editing
- Fix any title the parser got wrong
- Override poster/backdrop with custom image URLs
- Group standalone files into a series manually

---

## 📋 Requirements

| Requirement | Details |
|---|---|
| **Node.js** | v20 or later |
| **FFmpeg + ffprobe** | Must be on your `PATH` — required for transcoding, audio/subtitle probing, and GPU detection |
| **Build tools** | Needed for `better-sqlite3` native compilation (see below) |
| **OMDB API key** | Free — provides plot, rating, year, runtime, genres, and posters |
| **Fanart.tv API key** | Free, optional — provides high-resolution backdrops |

#### Build tools by platform

| Platform | Command |
|---|---|
| Debian / Ubuntu | `sudo apt install build-essential python3` |
| Arch / Manjaro | `sudo pacman -S base-devel python` |
| macOS | `xcode-select --install` |
| Windows | `npm install --global windows-build-tools` |

> **OS support:** Linux is the primary target (VAAPI device paths assume `/dev/dri/renderD12{8,9}`). macOS and Windows work with NVENC or CPU fallback.

---

## 🔑 Getting API Keys

### OMDB (required)

OMDB provides plot, rating, year, runtime, genres, and posters.

1. Go to **https://www.omdbapi.com/apikey.aspx**
2. Pick the **FREE** tier (1,000 requests/day — plenty for a personal library)
3. Enter your email — OMDB will email you the key, click the verification link
4. Copy the key (looks like `90a745e1`)

> VidLock caches every successful OMDB response in SQLite. Once your library is scanned, you'll basically never hit the API again.

### Fanart.tv (optional, recommended)

Fanart.tv provides high-resolution backdrops for the hero carousel and detail pages.

1. Create a free account at **https://fanart.tv/register/**
2. Go to **https://fanart.tv/get-an-api-key/** (requires login)
3. Request a **Personal API key** — it's instant
4. Copy the key (a 32-character hex string)

Without this key, VidLock still works — you just won't get backdrops, only OMDB posters.

---

## ⚡ Quick Start

```bash
# Clone the repo
git clone https://github.com/Manish6523/local-media-server.git vidlock
cd vidlock

# Install dependencies (compiles better-sqlite3 native bindings)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and media paths

# Start the dev server
npm run dev
```

Open **http://localhost:3000** and you're in.

---

## ⚙️ Configuration

Edit the `.env` file in the project root:

```dotenv
OMDB_API_KEY=your_omdb_key_here
FANART_TV_API_KEY=your_fanart_key_here    # optional
LOCAL_MEDIA_PATH=/path/to/your/media/
HDD_PATH=/path/to/your/external/drive/    # optional
```

| Variable | Required | Description |
|---|---|---|
| `OMDB_API_KEY` | ✅ | Fetches metadata (plot, rating, year, poster) from OMDB |
| `FANART_TV_API_KEY` | ❌ | Fetches high-res backdrops from Fanart.tv |
| `LOCAL_MEDIA_PATH` | ✅ | Primary media folder, scanned recursively |
| `HDD_PATH` | ❌ | Secondary/external path. If unplugged at scan time, items are flagged offline instead of deleted |

> Both paths are also stored in the SQLite `config` table — you can change them later in **Settings** without touching `.env`.

> `PORT` defaults to `3000`. Override with `PORT=4000 npm start` if needed.

---

## 🏃 Running

```bash
npm run dev      # Development (auto-reload)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

> **Important:** The app uses a custom Node.js server (`server.ts`) to mount Socket.IO and serve dynamically downloaded posters/backdrops. Always use `npm start`, never `next start` — otherwise images added after the build won't be served.

---

## 🎯 First-Run Walkthrough

1. **Start the server** — `npm run dev`
2. **Open** http://localhost:3000
3. **Go to Settings:**
   - Set your **Local Media Path** (e.g., `/home/me/media/`)
   - Optionally set your **HDD Path**
   - Click **Save**, then **Scan for New Files**
4. **Wait for the scan** — it walks your directories, parses filenames, fetches metadata from OMDB, downloads posters and backdrops, and writes everything to `db/media.db`
5. **Browse** — Home, Movies, Shows, and Favorites are now populated

Subsequent scans are incremental — only new files trigger metadata fetches.

### 📁 Supported Filename Patterns

The parser handles most common naming conventions:

```
Show.S01E01.1080p.x265.mkv           → Show, Season 1, Episode 1
Show - S03 E04.mkv                    → Show, Season 3, Episode 4
Show.S2E03-05.mkv                     → Show, Season 2, Episodes 3-5
02E01 - Episode Title.mkv             → Season 2, Episode 1
01. Episode Title.mkv                 → Episode 1
[03 - Hell's Paradise S02].mkv        → Hell's Paradise, Season 2
The Matrix (1999) 1080p.mkv           → The Matrix (movie)
```

Junk tags like `1080p`, `x265`, `BluRay`, `YIFY`, scene release groups, and country codes are stripped automatically. If the parser gets a title wrong, click **Edit Title** on any card to fix it.

---

## 🎉 Watch Party

1. On any movie or episode, click **Start Watch Party**
2. Share the 6-character room code or QR code with anyone on your LAN
3. Guests join via `http://<your-lan-ip>:3000/join/<code>`
4. Host clicks **Start** — all clients jump to the player in sync
5. Host controls play/pause/seek — everyone follows
6. Chat with your friends in the side panel

**How sync works:** Each client runs an NTP-style handshake on connect (5 round-trip samples averaged) to compute a clock offset against the server. Play/pause events fire at the same wall-clock moment on all devices. After seeks, the server waits for all clients to finish buffering before resuming.

---

## ⚡ GPU Acceleration

VidLock auto-detects the best available hardware encoder at boot:

| Priority | Encoder | GPU |
|---|---|---|
| 1 | NVENC | NVIDIA |
| 2 | VAAPI | Intel / AMD (Linux) |
| 3 | QSV | Intel Quick Sync |
| 4 | libx264 | CPU fallback |

The detected encoder is shown in **Settings → System Info** and is used automatically for all transcoding jobs. 10-bit HEVC content is handled transparently on the VAAPI path.

---

## 🐛 Troubleshooting

| Symptom | Fix |
|---|---|
| `better-sqlite3` build error | Install platform build tools (see [Requirements](#-requirements)) and retry `npm install` |
| Scan finds 0 files | Check your `LOCAL_MEDIA_PATH` in `.env` or Settings. Use **Settings → Validate Path** to verify |
| Posters not showing in production | Use `npm start`, not `next start`. The custom server is required for dynamically added images |
| `.mkv` playback is slow or stuttering | GPU encoding likely fell back to CPU. Check `[GPU]` lines in the startup log. CPU transcoding of 1080p HEVC may not be feasible on weak hardware |
| Watch party guests drift out of sync | Refresh the guest's browser tab to recompute the clock offset |
| HDD items show as offline | Plug in the drive and re-scan. Items will flip back to `available` |
| Forgot the admin PIN | Run: `sqlite3 db/media.db "DELETE FROM config WHERE key IN ('admin_pin_hash', 'admin_pin_enabled');"` |
| OMDB returns the wrong movie | Click **Edit Title** on the card, correct it, and re-scan |

---

## 📂 Project Structure

```
vidlock/
├── server.ts                 Custom Node HTTP server + Socket.IO + HLS/streaming
├── proxy.ts                  Next.js middleware (webOS UA detection → /tv redirect)
├── app/
│   ├── (main)/               Main UI routes + API endpoints
│   │   ├── api/              28 API routes (media, scan, stream, watch-progress, etc.)
│   │   ├── movies/           Movies browse page
│   │   ├── shows/            Shows browse page
│   │   ├── favorites/        Favorites page
│   │   ├── player/           Video player page
│   │   ├── watch/            Watch party player
│   │   ├── join/             Watch party join/lobby
│   │   └── settings/         Settings & admin page
│   └── (tv)/tv/              Lightweight TV/webOS UI
├── components/
│   ├── Player/               Netflix-style video player (HLS, subtitles, audio tracks)
│   ├── WatchParty/           Room creation, lobby, chat, sync overlay
│   ├── Home/                 Homepage sections (hero, continue watching, etc.)
│   └── *.tsx                 Shared components (cards, modals, filters, toasts)
├── lib/
│   ├── db.ts                 SQLite + Drizzle ORM (schema, queries, config)
│   ├── scanner.ts            Filesystem walker
│   ├── parser.ts             Filename → metadata parser
│   ├── omdb.ts               OMDB API client
│   ├── fanart.ts             Fanart.tv API client
│   ├── gpu-detect.ts         FFmpeg hardware encoder detection
│   └── socket.ts             Socket.IO singleton
├── db/
│   ├── schema.ts             Drizzle schema definitions
│   └── media.db              SQLite database (auto-created, gitignored)
├── hooks/                    React hooks (useWatchParty, etc.)
├── public/
│   ├── posters/              Downloaded poster images (gitignored)
│   ├── backdrops/            Downloaded backdrop images (gitignored)
│   └── episode-thumbs/       Episode thumbnails (gitignored)
├── .env.example              Environment variable template
├── package.json              Dependencies & scripts
└── DOCUMENTATION.md          Full architecture & API reference
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + React 19 |
| **Server** | Custom Node.js HTTP server with Socket.IO |
| **Database** | SQLite (WAL mode) via better-sqlite3 + Drizzle ORM |
| **Streaming** | FFmpeg + ffprobe for transcoding, HLS.js for playback |
| **Styling** | Tailwind CSS 4 + shadcn/ui + Framer Motion |
| **Metadata** | OMDB API + Fanart.tv API |

---

## 📖 Documentation

For the full architecture deep-dive, API route reference, database schema, Socket.IO event matrix, and extension guide, see [DOCUMENTATION.md](./DOCUMENTATION.md).

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.
