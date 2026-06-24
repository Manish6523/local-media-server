# VidLock — Full Documentation

> A fully local, offline, Netflix-style personal media library and player.
> No cloud. No accounts. No internet required after the initial metadata fetch.

---

## Table of Contents

### Part 1 — Project Documentation
1. [Overview](#1-overview)
2. [Feature Tour](#2-feature-tour)
3. [System Requirements](#3-system-requirements)
4. [Installation](#4-installation)
5. [Environment Variables](#5-environment-variables)
6. [Running the App](#6-running-the-app)
7. [First-Run Workflow](#7-first-run-workflow)
8. [Filename Parsing Cheat Sheet](#8-filename-parsing-cheat-sheet)
9. [GPU Hardware Acceleration](#9-gpu-hardware-acceleration)
10. [Watch Party (LAN Co-Watching)](#10-watch-party-lan-co-watching)
11. [TV / webOS Mode](#11-tv--webos-mode)
12. [Admin PIN Protection](#12-admin-pin-protection)
13. [Troubleshooting](#13-troubleshooting)

### Part 2 — Codebase Documentation
14. [Repository Layout](#14-repository-layout)
15. [Runtime Architecture](#15-runtime-architecture)
16. [Custom Server (`server.ts`)](#16-custom-server-serverts)
17. [Edge Middleware (`proxy.ts`)](#17-edge-middleware-proxyts)
18. [Database Layer (`lib/db.ts` + `db/schema.ts`)](#18-database-layer-libdbts--dbschemats)
19. [Library Modules (`lib/*`)](#19-library-modules-lib)
20. [API Routes (`app/(main)/api/*`)](#20-api-routes-appmainapi)
21. [Page Routes](#21-page-routes)
22. [React Components](#22-react-components)
23. [The Watch Party Hook (`hooks/useWatchParty.ts`)](#23-the-watch-party-hook-hooksusewatchpartyts)
24. [The Player Pipeline](#24-the-player-pipeline)
25. [Data Flow Diagrams](#25-data-flow-diagrams)
26. [Extending VidLock](#26-extending-vidlock)

---

# Part 1 — Project Documentation

## 1. Overview

**VidLock** is a self-hosted, single-user (or LAN-multi-user) media browser and player built on **Next.js 16** with a **custom Node HTTP server** that adds Socket.IO for real-time co-watching. It scans local folders and an optional external HDD for video files, parses filenames into structured metadata, enriches them with **OMDB** (plot, rating, year, poster) and **Fanart.tv** (backdrops), and presents the result as a Netflix-style browser with streaming, transcoding, subtitle handling, watch progress, favorites, and a synchronised **Watch Party** mode.

The whole stack runs out of one process on one machine: no separate Postgres, no Redis, no auth provider, no cloud upload. Persistence is a single SQLite file at `db/media.db`. Posters and backdrops are downloaded into `public/posters/` and `public/backdrops/`.

### Design philosophy
- **Local-first** — your library, on your hardware, talking to your TV over the LAN.
- **No re-downloads** — metadata is cached forever in SQLite once fetched.
- **No re-transcodes when unnecessary** — direct-play any browser-friendly codec; transcode only `.mkv`/`.avi`/`.wmv` or 10-bit HEVC.
- **No silver bullets** — the parser is a chain of regexes tuned against real-world filenames, not a smart NLP model.

---

## 2. Feature Tour

| Area | What you get |
| --- | --- |
| **Library scan** | Recursive walk of two configurable paths (local + HDD), filename → metadata, OMDB+Fanart enrichment. |
| **Movie / Show browsers** | Sortable grids (rating, year, recently added, A→Z), genre filter, dedup by series title. |
| **Detail pages** | Poster, backdrop, plot, rating, genres, runtime, episode list with seasons tabs. |
| **Player** | HTML5 + HLS.js, range-stream for MP4, on-the-fly FFmpeg transcode (HLS or fragmented MP4) for everything else. |
| **Subtitles** | External `.srt`/`.vtt` (auto-converted), embedded tracks via FFmpeg → WebVTT, size + color controls. |
| **Audio tracks** | Multi-track switching using `ffprobe` to enumerate streams, transcode pipeline accepts a track index. |
| **Continue watching** | Per-file watch progress, "is_watched" auto-flag at ≥90%, next-episode prefetch. |
| **Favorites** | Per-asset star, dedicated `/favorites` page. |
| **Watch Party** | 6-character room codes, host-controlled play/pause/seek, drift correction, ready-check protocol, in-room chat. |
| **QR Code share** | Quick join link generated for the LAN IP. |
| **TV mode** | Auto-redirect from `/` to `/tv` for LG webOS / NetCast browsers (lightweight static-style markup). |
| **Admin PIN** | SHA-256 hashed PIN that gates settings + sensitive actions, session-unlock. |
| **GPU autodetect** | NVENC → VAAPI → QSV → libx264, probed once at boot. |

---

## 3. System Requirements

- **Node** 20+ (the dev script uses `tsx` to run TS directly).
- **FFmpeg + ffprobe** on `PATH`. The transcode and probe routes call them as child processes.
- **SQLite** support — bundled via `better-sqlite3` (compiles a native module on install).
- **OS** — Linux primary (VAAPI device paths assume `/dev/dri/renderD12{8,9}`); macOS/Windows usable with NVENC or CPU fallback.
- **OMDB API key** (free tier works, http only).
- **Fanart.tv API key** (optional — without it, only OMDB posters show up).

---

## 4. Installation

```bash
git clone <repo> vidlock
cd vidlock
npm install        # compiles better-sqlite3 native bindings
```

If `better-sqlite3` fails to build, install platform build tools (`build-essential` on Debian/Ubuntu, Xcode CLT on macOS).

---

## 5. Environment Variables

Create `.env.local` at the project root:

```dotenv
OMDB_API_KEY=your_omdb_key_here
FANART_TV_API_KEY=your_fanart_key_here
LOCAL_MEDIA_PATH=/path/to/your/media/
HDD_PATH=/run/media/<user>/HDD/
```

Notes:
- `LOCAL_MEDIA_PATH` and `HDD_PATH` are also saved into the SQLite `config` table on first boot — the **Settings** page can change them later without touching `.env.local`.
- If `HDD_PATH` doesn't exist at scan time, the scanner silently skips it; entries from the HDD are marked `available=0` rather than deleted.

---

## 6. Running the App

```bash
npm run dev      # tsx server.ts (clears terminal first), dev mode
npm run build    # next build
npm start        # NODE_ENV=production tsx server.ts
npm run lint     # eslint
```

`server.ts` boots Next, mounts Socket.IO on the same HTTP server, and pre-detects the best FFmpeg encoder. It listens on `process.env.PORT || 3000`.

---

## 7. First-Run Workflow

1. Start the server (`npm run dev`).
2. Open <http://localhost:3000>.
3. Visit `/settings`:
   - Set **Local Path** (e.g. `/home/me/media/`) and (optional) **HDD Path**.
   - Click **Save**, then **Scan now**.
4. The scan walks both paths, parses filenames, hits OMDB (one call per **unique show title** + one per movie), downloads posters into `public/posters/` and backdrops into `public/backdrops/`, and writes everything to `db/media.db`.
5. Go back to `/` — Home, Movies, Shows, and Favorites are now populated.

The `last_scan` timestamp is stored in `config`. Subsequent scans are incremental: known files with confirmed OMDB IDs are skipped; new files trigger metadata fetches.

---

## 8. Filename Parsing Cheat Sheet

`lib/parser.ts` runs eight ordered regex patterns. First match wins:

| # | Pattern | Examples |
| - | --- | --- |
| 1 | Standard `SxxExx` | `Show.S01E01`, `S2E03-05` |
| 2 | `Sxx <sep> Exx` | `S03 E04`, `S01-E05`, `S01.E05` |
| 3 | `Sxx-Exx` dash | `S01-E01` |
| 4 | `NNExx` (season w/o S prefix, ≤50) | `02E01`, `03-E04` |
| 5 | `Sxx <dash> NN` | `S2 - 06` |
| 6 | Numbered prefix at start | `01. Title`, `02 - Title` |
| 7 | Episode-only `Exx` | `E01`, `E01-05` |
| 8 | Bracketed `[NN - Title SNN]` | `[03 - Hell's Paradise S02]` |

Files that don't match any pattern are tagged `movie`. After detection the title is cleaned with:
- Bracket/brace/paren strippers
- A `JUNK_TAGS` list (e.g. `1080p`, `x265`, `BluRay`, `YIFY`, `@username`)
- Country code trimming for shows (`US`, `UK`, …)
- Year extraction (1900–2099)
- Title-case normalization that respects small words (`a`, `an`, `the`, `of`, …)

If the parsed title and the OMDB-returned title don't share substrings after alphanumeric normalization, the asset is stored with `omdb_confirmed = 0` so it can be flagged in the UI and corrected via the **Edit Title** modal.

---

## 9. GPU Hardware Acceleration

At boot, `lib/gpu-detect.ts` runs an FFmpeg probe per backend in this order:

1. **NVENC** (`-hwaccel cuda -c:v h264_nvenc`)
2. **VAAPI** on `/dev/dri/renderD128` or `D129` (`h264_vaapi`)
3. **QSV** (`h264_qsv`)
4. **CPU** (`libx264`)

The first one that produces a non-zero exit code from a 0.5–1s synthetic encode wins, and the result is cached on `globalThis.__gpuCapability` so API routes and the server share one value. The detected GPU is shown in `/settings → System` and on the home `/api/system-info`.

Each transcode route (`/api/transcode`, `/api/hls/...`) builds its FFmpeg argv dynamically from this capability — see `buildGpuArgs` / `buildHlsArgs`. 10-bit HEVC is detected via `ffprobe` and the GPU pipeline scales `P010 → NV12` entirely in VAAPI surfaces.

---

## 10. Watch Party (LAN Co-Watching)

Anyone on the same network can join a party by typing `/join/<roomCode>` or scanning the host's QR code.

### Lifecycle

```
HOST clicks "Watch Party" on a poster
   → create-room (Socket.IO)            → roomCode (e.g. "K7QP9R")
HOST sees lobby with member list
   → emitPartyStart                     → all clients navigate to /watch/<code>
HOST plays / pauses / seeks
   → playback-event (only host)         → playback-sync to everyone
   → on seek, server enters "ready-check": pauses everyone, waits for each
     guest to emit member-ready (video buffered), then re-emits all-ready
SERVER heartbeat                         → sync-tick every 10s with projectedTime
GUEST disconnects                        → member-left, host transfer if needed
```

### Key timing details
- Each guest pings the server 5× on connect to compute an **NTP-style clock offset**; `playback-sync` then includes a `playAtServerTime` so all clients schedule the play with `setTimeout(..., playAt - now)`.
- The host's own seek does **not** wait for itself (the server marks `host.ready = true`).
- Server validates `currentTime`: must be a finite number, `0 ≤ t ≤ 86400` (24h sanity bound).
- Ready check has a **15s timeout** (long enough for VAAPI encoder init) before forcing playback to resume.
- Chat messages: max 200 chars, oldest pruned after 200 messages.
- Empty rooms are deleted on the last disconnect.

---

## 11. TV / webOS Mode

`proxy.ts` (Next.js middleware) sniffs `User-Agent` for `Web0S` or `NetCast`, and redirects `/` → `/tv` on those devices. The `(tv)/tv/*` route group has its own lightweight layout (`tv-styles.css`, no React shell) and a `TVBrowser` component that produces a webOS-friendly grid + player.

---

## 12. Admin PIN Protection

PIN-protected actions are gated by `<AdminPinGate>`, which sits at the top of the **Settings** page and on the "Edit title" / "Edit poster" buttons of each card.

- `POST /api/config { action: "set-pin", pin: "1234" }` — stores SHA-256 hash in `config.admin_pin_hash` and sets `config.admin_pin_enabled = "true"`.
- `POST /api/admin/verify-pin { pin: "1234" }` — returns 200 on match, 401 otherwise.
- `GET /api/admin/pin-status` — used to decide whether to show the gate.
- Once verified, `sessionStorage.admin_unlocked = "true"` skips the gate for that browser session.
- `POST /api/config { action: "disable-pin" }` removes the gate.

---

## 13. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `better-sqlite3` build error on install | Install OS build tools; on Linux: `sudo apt install build-essential python3`. |
| Scan finds 0 files | Check `LOCAL_MEDIA_PATH`; settings page → "Validate path" returns a video count. |
| Posters not showing in production | Production `next start` doesn't auto-serve files added to `public/` after build — that's why `server.ts` has a custom handler for `/posters/*` and `/backdrops/*`. Make sure you use `npm start` (which runs `tsx server.ts`), not bare `next start`. |
| Playback stalls on `.mkv` | The `/api/transcode` route is hardware-bound; check `[GPU]` lines in the server log. If CPU fell back, `libx264 preset=ultrafast` may still be too slow on weak hardware. |
| Watch party guests drift | NTP ping happens once on connect — refresh the guest tab to re-sync. Default heartbeat is 10s. |
| HDD entries are missing | Plug in the HDD, re-scan; existing entries flip back to `available=1`. |
| Admin PIN forgotten | Delete the `admin_pin_hash` and `admin_pin_enabled` rows from `db/media.db` config table. |

---

# Part 2 — Codebase Documentation

## 14. Repository Layout

```
vidlock/
├── server.ts                  Custom Node HTTP server + Socket.IO + static poster serving
├── proxy.ts                   Next middleware (UA-based redirect to /tv)
├── next.config.ts             Image patterns, serverExternalPackages, Turbopack tweaks
├── package.json               Scripts: dev / build / start (all via tsx) / lint
├── tsconfig.json              Path alias "@/*" → repo root
├── components.json            shadcn config (style: base-nova, neutral)
├── eslint.config.mjs          Flat config, extends next/core-web-vitals + next/typescript
│
├── app/
│   ├── (main)/                Main route group — full React shell
│   │   ├── layout.tsx         RootLayout: HTML, Geist font, NavBar, BackgroundProvider
│   │   ├── page.tsx           Home (delegates to <HomeContent>)
│   │   ├── globals.css        Tailwind 4 + aurora bg + skeleton + animations
│   │   ├── favicon.ico
│   │   ├── movies/
│   │   │   ├── page.tsx              Sorted grid, /api/media?type=movie
│   │   │   └── [slug]/page.tsx       Movie detail (poster, plot, play, watch party)
│   │   ├── shows/
│   │   │   ├── page.tsx              Series grid (dedup by title)
│   │   │   └── [slug]/page.tsx       Show detail w/ season tabs + episode list
│   │   ├── favorites/page.tsx        Filtered grid of is_favorite=1
│   │   ├── settings/page.tsx         Paths, scan, PIN, GPU info, offline-toggle
│   │   ├── player/[id]/page.tsx      Solo full-screen player
│   │   ├── join/[roomCode]/page.tsx  Watch-party lobby for guests
│   │   ├── watch/[roomCode]/page.tsx Synced player + chat
│   │   └── api/                      All HTTP/JSON endpoints (see §20)
│   │
│   └── (tv)/tv/               Lightweight webOS-friendly variant
│       ├── layout.tsx
│       ├── page.tsx           getFilteredMedia() + <TVBrowser>
│       ├── TVBrowser.tsx
│       └── play/[id]/{page,TVPlayer}.tsx
│
├── components/
│   ├── HomeContent.tsx        Fetches /api/media, splits into rows
│   ├── HeroSection.tsx        Top carousel
│   ├── HeroFeatured.tsx       Variant used on Home
│   ├── PosterCard.tsx         The card used everywhere (poster/landscape variant)
│   ├── FavoriteButton.tsx     PUT /api/toggle-favorite
│   ├── EditTitleModal.tsx     Custom title/poster/backdrop override
│   ├── FolderPicker.tsx       UI over /api/browse-fs
│   ├── FolderBrowserModal.tsx Underlying modal
│   ├── GenreFilter.tsx        Pills bound to /api/genres
│   ├── SortDropdown.tsx       Shared sort UI (rating, year, recent, title)
│   ├── BentoGrid.tsx          Decorative grid layout
│   ├── MediaRow.tsx           Horizontal scrolling row
│   ├── BackgroundContext.tsx  Sets the page backdrop image
│   ├── SearchContext.tsx
│   ├── Toast.tsx              Lightweight inline toaster
│   ├── PageTransition.tsx     framer-motion wrapper
│   ├── ErrorBoundary.tsx
│   ├── AdminPinGate.tsx       SHA-256-verified gate (see §22)
│   ├── QRModal.tsx            Generates a QR for the LAN URL
│   ├── Home/                  HomeContent's sub-rows
│   │   ├── ContinueWatchingList.tsx
│   │   ├── HeroFeatured.tsx
│   │   ├── MiniMoviesList.tsx
│   │   └── SeriesRow.tsx
│   ├── layout/
│   │   ├── AppShell.tsx       Alt shell variant (kept for reference)
│   │   ├── NavBar.tsx         Main nav (desktop + mobile tray + QR)
│   │   └── CommandMenu.tsx    ⌘K search (cmdk)
│   ├── Player/
│   │   ├── NetflixPlayer.tsx  Main player UI
│   │   ├── usePlayer.ts       All HLS/MP4 + subtitle + transcode wiring
│   │   ├── ProgressBar.tsx
│   │   ├── VolumeControl.tsx
│   │   ├── SubtitleMenu.tsx
│   │   ├── AudioMenu.tsx
│   │   └── SkipOverlay.tsx    ±10s skip indicator
│   ├── WatchParty/
│   │   ├── WatchPartyModal.tsx     Top-level entry (create/join/list)
│   │   ├── CreateRoomModal.tsx     Host-flow modal
│   │   ├── ChatPanel.tsx
│   │   ├── MembersList.tsx
│   │   └── SyncOverlay.tsx
│   └── ui/                    shadcn primitives (badge, button, card, dialog, …)
│
├── lib/
│   ├── db.ts                  SQLite + Drizzle access layer + PIN helpers
│   ├── scanner.ts             Recursive video-file walker
│   ├── parser.ts              Filename → ParsedFile
│   ├── omdb.ts                OMDB fetch + poster download
│   ├── fanart.ts              IMDb → TVDB → Fanart.tv backdrop fetch
│   ├── gpu-detect.ts          FFmpeg encoder probe (NVENC/VAAPI/QSV/CPU)
│   ├── socket.ts              Singleton socket.io-client (browser)
│   └── utils.ts               cn() — clsx + tailwind-merge
│
├── hooks/
│   └── useWatchParty.ts       Big socket-state hook (~470 lines)
│
├── db/
│   ├── schema.ts              Drizzle schema (5 tables + config KV)
│   ├── media.db               SQLite file (WAL mode)
│   ├── media.db-shm           WAL shared memory
│   └── media.db-wal           WAL log
│
├── public/
│   ├── posters/               Downloaded by lib/omdb.ts (gitignored)
│   ├── backdrops/             Downloaded by lib/fanart.ts (gitignored)
│   ├── placeholder.jpg
│   └── tv-styles.css          CSS for the /tv route group
│
├── scripts/
│   └── test-parser.ts         Manual tester for lib/parser.ts
│
├── AGENTS.md                  Reminder: Next.js 16 has breaking changes
├── CLAUDE.md                  @AGENTS.md (just imports the above)
└── README.md                  Bootstrapped boilerplate
```

---

## 15. Runtime Architecture

```
┌─────────────────────────── server.ts (single Node process) ──────────────┐
│                                                                          │
│   detectBestEncoder()  ──►  globalThis.__gpuCapability                    │
│                                                                          │
│   httpServer = createServer(...)                                         │
│   ├── /posters/*   /backdrops/*  ──► fs.createReadStream                 │
│   └── otherwise    ──► next.handle(req, res)                             │
│                                                                          │
│   io = new SocketIOServer(httpServer)                                    │
│        events: create-room / join-room / playback-event /                │
│                member-ready / chat-message / party-started /             │
│                rejoin-room / list-rooms / get-room-info                  │
│                                                                          │
│   In-memory state: rooms: Map<code, Room>                                │
│   Server-side heartbeat: 10s sync-tick per active room                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
            ▲                              ▲                       ▲
            │ HTTP/JSON                    │ WebSocket             │ HTTP
            │                              │                       │
   ┌────────┴──────────┐         ┌─────────┴─────────┐    ┌────────┴────────┐
   │  Next.js App      │         │  socket.io-client │    │  /tv route      │
   │  Router (RSC)     │         │  (browser)        │    │  group (webOS)  │
   │                   │         │                   │    │                 │
   │  app/(main)/...   │         │  useWatchParty    │    │  app/(tv)/tv/.. │
   │  React 19         │         │  hook             │    │                 │
   └───────────────────┘         └───────────────────┘    └─────────────────┘

   Persistence:
     db/media.db (SQLite, better-sqlite3, drizzle-orm)
     public/posters/*.jpg  (OMDB poster cache)
     public/backdrops/*.jpg (Fanart.tv backdrop cache)
     /tmp/filmaro-cache/<streamKey>/ (HLS segments, purged on start + 10min idle)
```

Everything — Next's App Router, the API routes, the WebSocket server, the FFmpeg child processes, the SQLite handle, the GPU-detection cache — lives in **one Node process**. There is no separate worker pool, no Redis, no auth service.

---

## 16. Custom Server (`server.ts`)

`server.ts` is the entrypoint that all of `dev`, `start`, and `build` (via `next build`) feed into. Highlights:

### Boot sequence
1. `await detectBestEncoder()` — probes FFmpeg encoders, caches result on `globalThis.__gpuCapability`.
2. Purge `/tmp/filmaro-cache` (stale HLS segments from the previous run).
3. Register `SIGINT`/`SIGTERM` to purge `/tmp/filmaro-cache` on shutdown.
4. Create `http.createServer` with a request handler that:
   - Serves `/posters/*` and `/backdrops/*` directly via `fs.createReadStream` (Next in production won't pick these up because they're written post-build).
   - Delegates everything else to `next.handle`.
5. Mount `SocketIOServer` on the same HTTP server with `cors: { origin: "*" }`.
6. Listen on `process.env.PORT || 3000`.

### Watch-party state (in-process)
```ts
type Member  = { id, name, isHost, joinedAt, ready }
type Room    = {
  mediaId, hostId, hostName, members[], messages[],
  state: { isPlaying, currentTime, updatedAt },
  syncInterval, waitingForReady, readyTimeout,
}
const rooms = new Map<roomCode, Room>()
```
`projectedTime(state)` returns `state.currentTime + (now - state.updatedAt)/1000` when playing, otherwise `state.currentTime` — this is what gets broadcast on each heartbeat tick and on guest join.

### Socket event matrix

| Event | From | Effect |
| --- | --- | --- |
| `create-room` | host | Generates 6-char code (32-char alphabet, ambiguous chars removed), starts heartbeat. |
| `get-room-info` | anyone | Pre-join metadata (host name, member count). |
| `list-rooms` | anyone | Snapshot of all active rooms (used by WatchPartyModal). |
| `join-room` | guest | Adds member, broadcasts `member-joined` + `new-message`, replies to joiner with projected state. |
| `rejoin-room` | reconnecting client | Updates `socket.id` for an existing member; promotes to host if they were host. |
| `member-ready` | guest | Marks ready; if all members ready, calls `completeReadyCheck`. |
| `playback-event` | **host only** | Updates state, broadcasts `playback-sync`. Validates `currentTime ∈ [0, 86400]`. On `seek`, kicks off `startReadyCheck`. |
| `chat-message` | anyone | ≤200 char message, appended to ring buffer of 200, broadcast `new-message`. |
| `party-started` | **host only** | Broadcasts `party-started` so guests navigate from lobby to `/watch/<code>`. |
| `disconnect` | system | Removes member; deletes room if empty; transfers host if the host disconnected (notify only the new host via `you-are-host`, everyone else via `host-changed`). |

### Heartbeat (`startSyncHeartbeat`)
Every 10 seconds: if at least one guest is in the room and `state.isPlaying`, emit a `sync-tick` with the projected time. Skipped while `waitingForReady` is true.

### Ready check (`startReadyCheck`)
Triggered when the host seeks:
1. Set `waitingForReady = true`, pause everyone, set `ready = isHost` on each member.
2. Emit `waiting-for-ready` with the current member list.
3. Set 15s timeout that calls `completeReadyCheck` regardless.
4. As each guest's video signals buffered, it emits `member-ready` → server marks them ready → broadcasts `member-ready-update`.
5. When all are ready, server unpauses, emits `all-ready`.

---

## 17. Edge Middleware (`proxy.ts`)

A single-purpose Next middleware:
- Only matches `/` (via `config.matcher`).
- Inspects `User-Agent` for `Web0S` or `NetCast`.
- If found, redirects to `/tv`. Otherwise passes through.

Other routes (`/api/*`, `/movies`, `/tv` itself) are untouched.

---

## 18. Database Layer (`lib/db.ts` + `db/schema.ts`)

### Schema (`db/schema.ts`, Drizzle/SQLite)

| Table | Key columns | Purpose |
| --- | --- | --- |
| `media_assets` | `id`, `filepath` (UNIQUE), `filename`, `source` (`'local'`/`'hdd'`), `type` (`'movie'`/`'show'`), `available`, `fetched_at`, `created_at`, `omdb_confirmed` | One row per video file. |
| `tv_shows` | `id`, `title`, `overview`, `poster`, `backdrop`, `backdrop_url`, `omdb_id`, `rating`, `genres` | One row per distinct series. |
| `episodes` | `id`, `media_asset_id → media_assets.id`, `show_id → tv_shows.id`, `season_number`, `episode_start`, `episode_end`, `runtime` | Per-file episode metadata. |
| `movies` | `id`, `media_asset_id → media_assets.id`, `title`, `year`, `runtime`, `poster`, `backdrop`, `backdrop_url`, `overview`, `rating`, `genres`, `omdb_id` | Per-file movie metadata. |
| `playback_progress` | `id`, `media_asset_id → media_assets.id`, `watch_progress`, `is_watched`, `is_favorite`, `last_watched_at` | Per-file user state. |
| `config` | `key` (PK), `value` | KV store: `local_path`, `hdd_path`, `last_scan`, `show_offline_media`, `admin_pin_hash`, `admin_pin_enabled`. |

### `MediaEntry` (flat shape)
The rest of the codebase doesn't work with the normalized rows directly — it uses `MediaEntry`, a flattened join produced by `fetchAllWithRelations()`:

```ts
{
  id, filepath, filename, source, type,
  title, year, season, episode_start, episode_end,
  omdb_id, poster, backdrop, backdrop_url,
  overview, rating, genres, runtime,
  available, fetched_at, created_at,
  last_watched_at, watch_progress, is_watched, is_favorite,
  omdb_confirmed,
  exactDuration? // attached by /api/media on detail fetch
}
```

### Helpers exported

| Function | Notes |
| --- | --- |
| `getDb()` | Lazy init. Opens `db/media.db`, sets `journal_mode = WAL`, seeds default `config`. |
| `getAllMedia()` | Sorted by `title → season → episode_start`. |
| `getMediaById(id)` / `getMediaByFilepath(p)` / `getMediaByType('movie'|'show')` / `searchMedia(q)` | All operate on the flat join. |
| `upsertMedia(entry)` | Inserts or updates `media_assets`, then the type-specific child table; for shows, dedupes `tv_shows` by lowercase title. Initializes `playback_progress` on first insert. |
| `updateAvailability(source, available)` | Mass-flip `available` (used when the HDD is missing). |
| `deleteMissingMedia(source, validPaths)` | Cleans up rows that no longer exist on disk; deletes child rows first (FK). |
| `clearMediaLibrary()` | Wipes all media tables (used by `/api/clear-db`). |
| `getMediaStats()` | `{ totalMovies, totalShows, totalFiles }`. |
| `getConfig(k) / setConfig(k, v)` | KV. |
| `getShowOfflineMedia()` / `setShowOfflineMedia()` | Wrappers over the `show_offline_media` config key. |
| `getShowMetadataByTitle(title)` | Raw SQL — quick lookup for reusing show metadata across episodes in the same scan group. |
| `getPinEnabled / setPin / disablePin / verifyPin` | SHA-256 helpers on the `config` KV. |

### Why a flat join?
The Drizzle layer is fine for writes, but reads (sorting, filtering by genres, deduping shows) are easier on a flat shape. `fetchAllWithRelations()` does one query with four `leftJoin`s and maps the result through `mapToFlatEntry`.

---

## 19. Library Modules (`lib/*`)

### `scanner.ts`
Recursive `fs.readdirSync({ withFileTypes: true })` walk. Hard-coded extension whitelist:
```ts
VIDEO_EXTENSIONS = { .mp4, .mkv, .avi, .mov, .m4v, .wmv }
```
Catches errors per-file and per-directory so one unreadable file doesn't crash the scan. Returns `{ files, hddConnected }`.

### `parser.ts`
See [§8](#8-filename-parsing-cheat-sheet). Pure function: `parseFilename(name): ParsedFile`. Eight ordered patterns + extensive cleanup. The `JUNK_TAGS` and `COUNTRY_CODES` lists are tunable in one place.

### `omdb.ts`
`fetchOMDB(title, type, year?)` — three-attempt strategy:
1. With `t=`, `type=`, `y=`.
2. Drop `y=` if response is `False`.
3. Drop `type=` if still `False`.
Returns a `FetchedMetadata` (or `null`). Side effect: downloads the poster into `public/posters/<imdbID>.jpg` (with redirect-follow and `unlink` on failure) and returns the **relative URL path** `/posters/<imdbID>.jpg`. Skips re-download if the file exists.

### `fanart.ts`
Two-step backdrop fetch (via the `@fanart-tv/api` SDK):
- Movies: direct `client.getMovie(imdbID)`.
- Shows: hop through TVMaze (`/lookup/shows?imdb=`) to convert IMDb ID → TVDB ID, then `client.getShow(tvdbId)`.
Sorts results by `likes` and downloads the winner to `public/backdrops/<imdbID>.jpg`. 4–5s timeout via `AbortController`.

### `gpu-detect.ts`
- `testEncoder(label, args)` — spawns FFmpeg with the supplied args, 10s timeout, returns `Promise<boolean>` on exit code 0.
- `testVaapi(device)` — VAAPI-specific args that are known to work on AMD Vega 10.
- `detectBestEncoder()` — sequential NVENC → VAAPI → QSV → CPU. First success wins. Caches on `globalThis.__gpuCapability`.
- `getDetectedGPU()` — read from cache; falls back to CPU defaults if nothing has been detected yet (e.g., API route imported before `server.ts` finished booting).

### `socket.ts`
Browser-side singleton:
```ts
let socket: Socket | null = null
getSocket()        // io({ transports: ["websocket","polling"], autoConnect: true })
disconnectSocket() // socket.disconnect(); socket = null
```

### `utils.ts`
`cn(...inputs) = twMerge(clsx(inputs))` — the standard shadcn pattern.

---

## 20. API Routes (`app/(main)/api/*`)

All routes are Node-runtime, `export const dynamic = "force-dynamic"`. Conventions: `GET` for reads, `POST` for actions, `PUT` for mutations.

### Library / catalog

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/scan` | GET | Two-pass scan: group shows by normalized title, fetch OMDB once per show, dedupe API calls, upsert all rows. Returns `{summary: {totalFiles, uniqueShows, omdbCallsForShows, omdbCallsSaved, new, updated, skipped, errors, deleted, hddConnected}}`. |
| `/api/clear-db` | POST | `clearMediaLibrary()` + reset `last_scan`. |
| `/api/config` | GET / POST | Read/write `local_path`, `hdd_path`, `last_scan`, `showOfflineMedia`. POST also handles `action: "set-pin" \| "disable-pin"`. |
| `/api/media` | GET | Query params: `id`, `type`, `search`, `stats`. Returns flat `MediaEntry[]` (single object if `id`). When `id` is set, also runs `ffprobe -show_entries format=duration` to get `exactDuration` for accurate seeking. Filters by HDD availability + `show_offline_media`. |
| `/api/media/[id]` | PUT (custom override) | Lets the user override poster/backdrop/title, downloading a custom image into `public/posters/custom_<id>_<ts>.jpg` (timestamped to bust caches, old ones cleaned). |
| `/api/search` | GET | `q=` substring search, dedup shows by title, capped at 20. |
| `/api/genres` | GET | Distinct sorted list across all `genres` columns. |
| `/api/continue-watching` | GET | `watch_progress>0 AND is_watched=0`, sorted by `last_watched_at`, top 6. |
| `/api/recently-added` | GET | `created_at` within last 7d, grouped by title, top 6 (with `episode_count`). |
| `/api/favorites` | GET | `is_favorite=1`. |
| `/api/next-episode` | GET | Given a show `id`, find next episode in season, then S+1E1, then null. |

### Filesystem / system

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/browse-fs` | GET | Lists subdirectories of a given path for `FolderPicker`. Defaults to `os.homedir()`. Only returns directories. |
| `/api/validate-path` | GET | Returns `{ valid, fileCount }`, recursively counting video files. |
| `/api/system-info` | GET | `{ platform, type, release, gpu: {type, label, encoder} }`. |
| `/api/local-ip` | GET | Picks first non-internal IPv4 interface; returns `{ ip, url }` for QR generation. |

### Streaming

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/stream?id=N` | GET | **Direct play** for browser-friendly MP4/M4V. Honours `Range:` with `206 Partial Content`, otherwise full-file `200`. 64KB internal buffer. Sets `X-Content-Type-Options: nosniff`. |
| `/api/transcode?id=N&audioTrack=0&start=0&clientId=...` | GET | **Fragmented MP4 transcode** for mkv/avi/wmv. Builds GPU-aware FFmpeg argv. Per-viewer process (keyed by `mediaId:audioTrack:clientId`). New seek = kill old + 800ms debounce + spawn new. Cap of 2 concurrent FFmpeg processes; further requests queue. Streams `pipe:1` MP4 chunks via Web ReadableStream. |
| `/api/hls/[mediaId]/[audioTrack]/[start]/[file]` | GET | **HLS transcode** alternative. Writes playlist + .ts segments to `/tmp/filmaro-cache/<key>/`. Detects 10-bit HEVC via `ffprobe`; the VAAPI path converts P010 → NV12 in GPU memory. 10-min idle cleanup; older sibling transcodes (same media, different start) are killed when a new one spawns. |
| `/api/media-info?id=N` | GET | Classifies a file into `direct` / `remux` / `transcode` based on codecs/container from `ffprobe`. |
| `/api/audio-tracks?id=N` | GET | Enumerates audio streams via `ffprobe`, mapping language codes to labels. |
| `/api/subtitles?id=N` | GET | Lists subtitle tracks: external `.srt`/`.vtt` siblings + embedded streams from `ffprobe`. |
| `/api/subtitle-file?path=...&start=N` | GET | Serves an external sub file. SRT is converted to WebVTT on the fly (header + comma→period). When `start>0`, FFmpeg shifts timestamps. |
| `/api/subtitle-stream?id=N&track=N&start=N` | GET | Extracts an embedded subtitle stream → WebVTT via FFmpeg `-f webvtt pipe:1`. |

### User state

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/watch-progress` | PUT | `{id, currentTime, duration}` → updates `playback_progress`. Auto-flags `is_watched=1` at ≥90%. Ignores `currentTime<5s` to suppress accidental clicks. |
| `/api/toggle-favorite` | PUT | `{id, isFavorite: boolean}` → flips `is_favorite`. |

### Admin

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/admin/pin-status` | GET | `{ enabled: boolean }`. |
| `/api/admin/verify-pin` | POST | `{ pin }` → 200 ok, 401 wrong. |

---

## 21. Page Routes

| Path | File | Role |
| --- | --- | --- |
| `/` | `app/(main)/page.tsx` | Suspense wrapper around `<HomeContent>`. |
| `/movies` | `app/(main)/movies/page.tsx` | Client component, fetches `/api/media?type=movie`, sortable grid. |
| `/movies/[slug]` | `app/(main)/movies/[slug]/page.tsx` | Slug = `title.toLowerCase().replace(/\s+/g,"-")`. Plays/joins party. |
| `/shows` | `app/(main)/shows/page.tsx` | Grid deduped by title. |
| `/shows/[slug]` | `app/(main)/shows/[slug]/page.tsx` | Seasons tabs + episode list. |
| `/favorites` | `app/(main)/favorites/page.tsx` | `/api/favorites`. |
| `/settings` | `app/(main)/settings/page.tsx` | Whole admin surface: paths, scan, PIN, GPU, offline toggle. Wrapped in `<AdminPinGate>`. |
| `/player/[id]` | `app/(main)/player/[id]/page.tsx` | Solo full-screen `<NetflixPlayer>`. |
| `/join/[roomCode]` | `app/(main)/join/[roomCode]/page.tsx` | Watch party lobby (guest waits for `party-started`). |
| `/watch/[roomCode]` | `app/(main)/watch/[roomCode]/page.tsx` | Player + chat panel + sync overlay. |
| `/tv` | `app/(tv)/tv/page.tsx` | Server component for webOS. |
| `/tv/play/[id]` | `app/(tv)/tv/play/[id]/page.tsx` | Minimal TV player. |

Notes:
- `RootLayout` in `app/(main)/layout.tsx` wraps everything in `<BackgroundProvider>` + `<NavBar>` and applies the aurora background. It hides the shell on `/join`, `/watch`, and `/player` routes (handled inside `<AppShell>` / inferred by `NavBar`).
- `<HomeContent>` reads `?search=` from the URL and toggles between search results and the curated rows (`HeroFeatured`, `ContinueWatchingList`, `MiniMoviesList`, `SeriesRow`).

---

## 22. React Components

### Shell
- **`NavBar.tsx`** — Sticky top + mobile bottom tray. Handles ⌘K (opens `CommandMenu`), fullscreen toggle, QR modal (only on LAN), watch-party modal trigger.
- **`AppShell.tsx`** — Alternative full-window layout (currently not the primary shell, kept for reference). Uses `<BackgroundProvider>`.
- **`CommandMenu.tsx`** — `cmdk` palette over `/api/search`.
- **`BackgroundContext.tsx`** — Page-level backdrop image, set by detail pages.
- **`SearchContext.tsx`** — Tiny shared search state.

### Cards / lists
- **`PosterCard.tsx`** — Universal card. Two variants (`poster` / `landscape`). Shows availability badge, rating, watch-progress bar, favorite toggle, "Edit title" (gated behind `<AdminPinGate>`), and "Start Watch Party" entry point. Uses `next/dynamic` to lazy-import `CreateRoomModal`.
- **`MediaRow.tsx`** / **`BentoGrid.tsx`** — Layout primitives.
- **`Home/*`** — Curated rows on `/`: `HeroFeatured`, `ContinueWatchingList`, `MiniMoviesList`, `SeriesRow`.
- **`HeroSection.tsx`** / **`HeroFeatured.tsx`** — Auto-rotating top hero (framer-motion, 10s interval).

### Forms / modals
- **`EditTitleModal.tsx`** — Edits title, poster URL, backdrop URL via PUT `/api/media/[id]`.
- **`FolderPicker.tsx`** / **`FolderBrowserModal.tsx`** — Visual file-system picker over `/api/browse-fs`.
- **`SortDropdown.tsx`** — `SortOption` union; reused on Movies / Shows / Favorites.
- **`GenreFilter.tsx`** — Genre pills over `/api/genres`.
- **`FavoriteButton.tsx`** — Optimistic PUT to `/api/toggle-favorite`.
- **`Toast.tsx`** — Lightweight transient toaster.
- **`AdminPinGate.tsx`** — Reads `/api/admin/pin-status`, blocks children with a PIN modal if `enabled && !sessionStorage.admin_unlocked`. Animates a shake on wrong PIN; sets `sessionStorage.admin_unlocked = "true"` on success.
- **`QRModal.tsx`** — Calls `/api/local-ip`, encodes the URL with `qrcode`, draws into a canvas.

### Player
- **`NetflixPlayer.tsx`** — Player UI shell. Receives `mediaId`, `exactDuration`, optional `watchPartyMode`. Decides `baseNeedsTranscode` from the file extension (`mkv|avi|wmv`). Delegates state to `usePlayer`.
- **`usePlayer.ts`** — The big one. Owns:
  - Refs: `videoRef`, `containerRef`, `hideTimer`, `skipAnimTimer`, `progressInterval`, `hasResumed`.
  - State: `PlayerState` (play/pause, duration, volume, mute, buffer, fullscreen, controls visibility, subtitle/audio selection, skip animation, cue text, subtitle size/color).
  - Source URL builder: picks between `/api/stream`, `/api/transcode`, or HLS playlist URL based on `baseNeedsTranscode` and seek target.
  - HLS.js initialization for `.mkv`-route streams.
  - Subtitle pipeline: fetches `/api/subtitles?id=`, adds them as `<track>` elements, watches for active cue text.
  - Persists volume, mute, subtitle size, subtitle color in `localStorage`.
  - PUT `/api/watch-progress` every 10s while playing.
- **`ProgressBar.tsx`** — Hover-scrubbing seek bar.
- **`VolumeControl.tsx`** / **`SubtitleMenu.tsx`** / **`AudioMenu.tsx`** / **`SkipOverlay.tsx`** — Self-contained UI bits.

### Watch Party UI
- **`WatchPartyModal.tsx`** — Tabbed UI (create / join / current rooms). Calls `useWatchParty.listRooms()` etc.
- **`CreateRoomModal.tsx`** — Host name → `createRoom(mediaId, hostName)` → navigates to `/watch/<code>`.
- **`ChatPanel.tsx`** — Live message stream, 200-char input.
- **`MembersList.tsx`** — Shows each member with their `ready` state.
- **`SyncOverlay.tsx`** — "Waiting for everyone to be ready…" full-screen overlay used during `waitingForReady`.

### shadcn primitives (`components/ui/*`)
Standard shadcn outputs (`badge`, `button`, `card`, `carousel`, `command`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `input-group`, `scroll-area`, `separator`, `skeleton`, `slider`, `tabs`, `textarea`). Tailwind 4 with CSS variables in `app/(main)/globals.css`.

---

## 23. The Watch Party Hook (`hooks/useWatchParty.ts`)

`useWatchParty(autoConnect=false)` is a fat hook that owns the entire client side of the protocol. It returns a single object with state + actions + event subscribers.

### State it tracks
```ts
isConnected, members, messages, isHost, roomCode, mediaId,
playbackState, waitingForReady, ntpOffset,
isProcessingServerEvent: MutableRefObject<boolean>
```

### Connection lifecycle
1. `connect()` — lazily `getSocket()` and attach listeners.
2. On `socket.on("connect")`:
   - 5 round-trip `ping`/`pong` pairs.
   - `offset = t2 - (t1 + t3) / 2`, averaged → `ntpOffset`.
   - All future server timestamps are interpreted with this offset via `getServerTime() = Date.now() + ntpOffset`.

### Important detail: echo suppression
`isProcessingServerEvent` is a ref that flips to `true` when:
- A `playback-sync` is received, or
- An `all-ready` is received.

`emitPlayback(type, currentTime)` checks the ref and bails if `true`. This prevents this client from echoing the same play/pause back to the server during the brief window after applying an incoming sync. It auto-resets after 1500ms.

### Persisted across navigation
`sessionStorage` keys: `wp_name`, `wp_isHost`, `wp_mediaId`, `wp_roomCode`. This is what enables the lobby (`/join/<code>`) → player (`/watch/<code>`) transition without re-joining.

### Event registration pattern
For sync-tick, playback-sync, waiting-for-ready, all-ready, and party-started, the hook exposes paired `onX` / `offX` so consumers can swap handlers without leaking listeners. Each `onX` first detaches any previously-registered handler.

### Why a ref for `isProcessingServerEvent`
A state setter would cause a re-render and a setTimeout cleanup race. A ref is the right tool: mutate it synchronously, read it inside callbacks, no rerender.

---

## 24. The Player Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│ Browser opens /player/<id>                                   │
│ NetflixPlayer reads media.filename → baseNeedsTranscode?     │
│                                                              │
│   .mp4/.m4v/.mov   →  /api/stream?id=N      (Range stream)   │
│   .mkv/.avi/.wmv   →  /api/hls/N/0/0/playlist.m3u8           │
│                       (Hls.js attaches to videoRef)          │
│                       OR /api/transcode for fragmented MP4   │
│                                                              │
│ usePlayer:                                                   │
│  - fetches /api/audio-tracks?id=N                            │
│  - fetches /api/subtitles?id=N                               │
│  - mounts <track> for each subtitle                          │
│  - 10s interval → PUT /api/watch-progress                    │
│                                                              │
│ On seek:                                                     │
│  - Direct play: use video.currentTime (browser handles Range)│
│  - Transcode:   build a new URL with ?start=N (server-side)  │
│                 debounces 800ms, kills old FFmpeg            │
│  - HLS:         new playlist URL with new start segment      │
│                                                              │
│ On audio-track change:                                       │
│  - Rebuild URL with new audioTrack param                     │
│  - Reload the source                                         │
│                                                              │
│ On subtitle change:                                          │
│  - Toggle <track mode> between "showing" and "disabled"      │
│                                                              │
│ In watch-party mode (props.watchPartyMode is set):           │
│  - on play/pause/seek, call props.onPlay/onPause/onSeek      │
│    which run hook.emitPlayback(type, time)                   │
│  - registerVideoRef hands the <video> back so the hook can   │
│    schedule the precise play time using ntpOffset            │
└──────────────────────────────────────────────────────────────┘
```

### Codec decisions
- `lib/db.ts` returns `exactDuration` from `ffprobe -show_entries format=duration` on every `id` fetch — the player uses this rather than `media.runtime * 60` (which is OMDB's rounded minute count) so seeking is accurate.
- `/api/media-info` returns one of `direct | remux | transcode`. The player uses the file-extension heuristic by default; this richer classifier is available for future precision.

---

## 25. Data Flow Diagrams

### Library scan
```
Settings → /api/scan
  │
  ▼
scanAllSources(localPath, hddPath)            lib/scanner.ts
  │  walkDirectory recursively
  ▼
files: { filepath, filename, source }[]
  │
  ▼
parseFilename(filename) → ParsedFile          lib/parser.ts
  │
  ▼
group shows by lowercase title
  for each group:
    if showMetadata exists in tv_shows  ── reuse (1 row)
    else fetchOMDB(repTitle) + getBackdropForShow(omdbId)
    upsertMedia(...)  for each episode
  for each movie:
    if cached → skip
    else fetchOMDB + getBackdropForMovie
    upsertMedia(...)
  │
  ▼
deleteMissingMedia(source, validPaths)
updateAvailability("hdd", connected ? 1 : 0)
setConfig("last_scan", now)
  │
  ▼
{ summary: { totalFiles, uniqueShows, omdbCallsForShows, omdbCallsSaved, ... } }
```

### Watch party seek
```
HOST: video.onseeked → emitPlayback("seek", t)
     │
     ▼
SERVER: playback-event{type:"seek", currentTime:t}
     │   validates (typeof number, finite, 0..86400)
     │   state.currentTime = t
     │   broadcast playback-sync to all
     │   startReadyCheck:
     │     waitingForReady = true
     │     all members.ready = isHost (host auto-ready)
     │     broadcast waiting-for-ready
     │     setTimeout 15s → completeReadyCheck (force)
     │
     ▼
GUESTS: receive playback-sync (seek)
        seek their <video> to t, set isProcessingServerEvent = true
        when video.onloadeddata: emit member-ready
        SyncOverlay shows "Waiting..."
     │
     ▼
SERVER: member-ready → mark member, broadcast member-ready-update
        when all ready: completeReadyCheck
          state.isPlaying = true, waitingForReady = false
          broadcast all-ready { state, members }
     │
     ▼
GUESTS: receive all-ready → setPlaybackState, play()
```

### NTP offset
```
Client connect → 5x { emit("ping"); on "pong"(t2) }
  t1 = before emit
  t3 = after recv
  offset_i = t2 - (t1 + t3) / 2
  ntpOffset = mean(offset_i)
getServerTime() = Date.now() + ntpOffset
```

---

## 26. Extending VidLock

Common extension points and where to touch:

| You want to… | Edit |
| --- | --- |
| Add a new video extension | `lib/scanner.ts → VIDEO_EXTENSIONS` |
| Add a new junk tag | `lib/parser.ts → JUNK_TAGS` |
| Add a new filename pattern | New `tryX` function + add to `detectEpisode()` |
| Add a new metadata source | New module in `lib/`, call from `app/(main)/api/scan/route.ts` |
| Add a new column | Update `db/schema.ts`, add migration logic in `getDb()` if needed, extend `MediaEntry` + `mapToFlatEntry` |
| Add a new sort option | `components/SortDropdown.tsx → SortOption` + cases in each page's `useMemo` sort |
| Add a new watch-party event | Add socket handler in `server.ts` + matching wiring in `hooks/useWatchParty.ts` |
| Force CPU encoding for testing | In `lib/gpu-detect.ts → detectBestEncoder()`, short-circuit to the CPU `GPUCapability` |
| Add an admin-gated action | Wrap the UI button in `<AdminPinGate>`, server-side check `getPinEnabled()` if you also want server enforcement |
| Test parser on a single name | `npx tsx scripts/test-parser.ts "Show.S01E02.1080p.x265.mkv"` |

### Quirks worth knowing
- `next.config.ts` sets `serverExternalPackages: ["better-sqlite3"]` so the native module isn't bundled.
- `dev` script clears the terminal first (`clear; tsx server.ts`) — handy for re-reading the GPU-detection log on each restart.
- Production posters/backdrops are served by `server.ts` directly (not by Next) because Next's static handler only knows about files present at `next build` time.
- `/tmp/filmaro-cache` is purged both on startup and on `SIGINT`/`SIGTERM`. Idle stream dirs are cleaned after 10 minutes.
- The whole app trusts the local network. There is no per-user auth — only the admin PIN, which gates write-style actions in the UI but is not enforced on `/api/scan`, `/api/clear-db`, or `/api/media/[id]` PUT routes server-side. If you expose VidLock beyond the LAN, add a middleware that calls `getPinEnabled()` + verifies a signed cookie before letting those routes through.
- `AGENTS.md` says **this is not the Next.js you know** — version 16 has breaking changes (App Router server actions, Turbopack defaults, etc.). When in doubt, check `node_modules/next/dist/docs/` before relying on training-data memory.
