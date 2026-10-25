# VidLock — Full Product Specification

> **Specification Version**: 1.0.0  
> **Repository Target**: `local-media-server` (`vidlock` v0.2.0)  
> **Methodology**: 100% source-code derived verification across backend, frontend, database, scripts, electron, and webOS applications. Zero `.md` reference files consulted.  
> **Conventions**:  
> - Items verified directly against source code reference file paths (e.g., `app/(main)/watch/[roomCode]/page.tsx`).  
> - Deduced operational semantics are marked `(inferred)`.  
> - Stubbed, unreferenced, or non-functional features are marked `(incomplete)`.

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Streaming and Transcoding Pipeline](#3-streaming-and-transcoding-pipeline)
4. [Every Page and Screen](#4-every-page-and-screen)
5. [Custom Video Player (Deep Dive)](#5-custom-video-player-deep-dive)
6. [Watch Party System](#6-watch-party-system)
7. [TV Experience (LG webOS & TV Browser)](#7-tv-experience-lg-webos--tv-browser)
8. [Library and Content Features](#8-library-and-content-features)
9. [Security and Access Control](#9-security-and-access-control)
10. [Design System and UX Details](#10-design-system-and-ux-details)
11. [User Journeys](#11-user-journeys)
12. [Settings and Configuration](#12-settings-and-configuration)
13. [API Reference](#13-api-reference)
14. [Feature Inventory Table](#14-feature-inventory-table)
15. [Known Bugs, Limitations, and Tech Debt](#15-known-bugs-limitations-and-tech-debt)
16. [Marketing-Ready Highlights](#16-marketing-ready-highlights)
17. [Verification Audit Trail](#17-verification-audit-trail)

---

## 1. Product Overview

### 1.1 One-Paragraph Pitch
**VidLock** is a high-performance, self-hosted, zero-cloud media streaming platform and desktop ecosystem built to transform local and external disk video libraries into an ultra-premium, Netflix-grade personal streaming service. Designed with an always-dark cinematic aesthetic, hardware-accelerated transcoding (NVENC, VAAPI, Intel QSV, AMD AMF), real-time synchronized Watch Parties with low-latency WebRTC mesh voice chat, and native support across Desktop (Electron), Web browsers, and LG Smart TVs (webOS), VidLock operates 100% locally with zero subscription requirements, zero telemetry, and robust optional PIN-level access control.

### 1.2 Target User
- Media enthusiasts, self-hosters, and home-lab operators with extensive personal movie and TV collections stored on internal SSDs, NAS shares, or external USB drives.
- Families and friend groups seeking private, latency-compensated synchronized remote watch sessions with integrated voice communication without relying on third-party SaaS services.
- Multi-device households streaming across desktop workstations, mobile phones/tablets, and living room smart TVs over local Wi-Fi or secure tunneling.

### 1.3 Core Value
- **Zero Cloud & Zero Tracking**: All database indexing, poster scraping, thumbnail extraction, playback tracking, and video delivery runs entirely on the host machine.
- **Universal Transcoding Engine**: Automatic detection and hardware-accelerated on-the-fly HLS transcoding for non-web-native containers and codecs (MKV, AVI, WMV, 10-bit HEVC, DTS/AC3/E-AC3 audio) with instant CPU software fallback.
- **Precision Synchronized Watch Parties**: Sub-second synchronization engine featuring drift detection, server-mediated ready-check barriers, host-controlled seeking, knock-to-join admission, and peer-to-peer WebRTC voice channels.
- **Omni-Platform Convergence**: Single unified architecture powering web browsers, a packaged Electron desktop suite with system tray and auto-updates, and an LG webOS IPK application with remote control D-pad navigation.

### 1.4 Tech Stack & Exact Versions
*Extracted directly from [package.json](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/package.json):*

| Dependency Type | Package Name | Exact Version | Purpose in Codebase |
| :--- | :--- | :--- | :--- |
| **Framework / Core** | `next` | `16.2.4` | Application runtime, App Router, SSR, dynamic API endpoints |
| **Framework / Core** | `react` | `19.2.4` | Component framework and state lifecycle |
| **Framework / Core** | `react-dom` | `19.2.4` | React DOM renderer |
| **Database** | `better-sqlite3` | `^12.10.0` | Synchronous high-throughput SQLite engine with WAL mode |
| **ORM** | `drizzle-orm` | `^0.45.2` | Type-safe schema definition and relational queries |
| **ORM Tooling** | `drizzle-kit` | `^0.31.10` | Database migrations and introspection |
| **Real-time / Sockets** | `socket.io` | `^4.8.3` | Watch party signaling server, sync ticks, chat, WebRTC relay |
| **Real-time / Client** | `socket.io-client`| `^4.8.3` | Client-side watch party and voice chat connection |
| **Video Engine** | `hls.js` | `^1.6.16` | Client-side MSE HLS stream playback and segment buffer manager |
| **Media Binaries** | `ffmpeg-static` | `^5.3.0` | Packaged binary for FFmpeg video processing |
| **Media Binaries** | `ffprobe-static` | `^3.1.0` | Packaged binary for FFprobe container/codec analysis |
| **Styling** | `tailwindcss` | `^4` | Utility-first CSS styling engine |
| **Styling PostCSS** | `@tailwindcss/postcss`| `^4` | PostCSS processing for Tailwind v4 |
| **Styling Utilities** | `tailwind-merge` | `^3.6.0` | Deduplication of conflicting Tailwind class names |
| **Styling Utilities** | `clsx` | `^2.1.1` | Conditional class name construction |
| **UI Components** | `shadcn` | `^4.10.0` | Headless/custom accessible UI baseline |
| **UI Primitive** | `@base-ui/react` | `^1.5.0` | Foundational accessible headless primitives |
| **Icons** | `lucide-react` | `^1.17.0` | Complete icon set throughout all interfaces |
| **Animations** | `framer-motion` | `^12.40.0` | Dynamic gestures and layout transitions |
| **CSS Animations** | `tw-animate-css` | `^1.4.0` | Keyframe animation utilities |
| **Carousel** | `embla-carousel-react`| `^8.6.0` | Touch & wheel enabled carousel slider |
| **Command Palette**| `cmdk` | `^1.1.1` | Keyboard navigation and search interface |
| **Drag & Drop** | `@dnd-kit/core` | `^6.3.1` | Core DnD engine for manual season/episode reordering |
| **Drag & Drop** | `@dnd-kit/sortable` | `^10.0.0` | Sortable list strategies for DnD grouping |
| **Drag & Drop** | `@dnd-kit/utilities`| `^3.2.2` | CSS transform helpers for DnD |
| **Media Parsing** | `guessit-js` | `^4.7.1` | Natural language media filename parsing (title, year, season, episode) |
| **External API** | `@fanart-tv/api` | `^1.0.2` | Client for Fanart.tv backdrop art retrieval |
| **QR Code** | `qrcode` | `^1.5.4` | Generation of LAN/tunnel quick-connect QR codes |
| **String Utility** | `slugify` | `^1.6.9` | URL-safe slug creation for movie/show titles |
| **Environment** | `dotenv` | `^17.4.2` | Runtime `.env` and `.env.local` parser |
| **Desktop Shell** | `electron` | `^40.0.0` | Cross-platform desktop application container |
| **Desktop Packaging**| `electron-builder` | `^26.15.3` | Installer & packaging pipeline (NSIS, DMG, AppImage) |
| **Desktop Persistence**| `electron-store` | `^11.0.2` | Persistent configuration store for Electron main process |
| **Desktop Updates** | `electron-updater`| `^6.8.9` | Differential auto-updater for desktop runtime |
| **Process Runner** | `tsx` | `^4.21.0` | TypeScript script execution engine for `server.ts` |
| **Concurrency** | `concurrently` | `^10.0.5` | Multi-process concurrent dev orchestrator |

---

## 2. Architecture

### 2.1 Repository Directory Structure
```
local-media-server/
├── app/                            # Next.js 16 App Router hierarchy
│   ├── (main)/                     # Primary responsive web and desktop route group
│   │   ├── admin/                  # Administrative interfaces (e.g. manual unmatched file matcher)
│   │   ├── api/                    # REST API endpoints (36 specialized route controllers)
│   │   ├── discover/               # Online catalog browsing (2embed API integration)
│   │   ├── favorites/              # Curated user favorite media grid
│   │   ├── globals.css             # Core Design System, CSS variables, Oklch palette, glassmorphism
│   │   ├── join/                   # Watch Party guest onboarding & knock-to-join lobby
│   │   ├── layout.tsx              # Root HTML shell, background provider, navbar, cast sender scripts
│   │   ├── movies/                 # Dedicated movies catalog & [slug] cinematic detail view
│   │   ├── page.tsx                # Dynamic home page (featured hero, continue watching, genres)
│   │   ├── player/                 # Direct playback interface ([id] local video and online embed)
│   │   ├── search/                 # Instant global library search interface
│   │   ├── settings/               # System configuration, hardware encoders, paths, PIN controls
│   │   ├── shows/                  # Dedicated TV series catalog & [slug] multi-season episode browser
│   │   └── watch/                  # Synchronized Watch Party theater ([roomCode])
│   └── (tv)/                       # Dedicated smart TV interface group
│       └── tv/                     # D-pad spatial navigation grid (TVBrowser) & video player (TVPlayer)
├── application/                    # Packaged platform targets
│   └── webos-app/                  # LG webOS TV standalone application package (appinfo.json, app.js)
├── components/                     # Modular React UI components
│   ├── Home/                       # Hero carousel, continue watching carousel, mini genre rows
│   ├── Player/                     # Custom Netflix-style player, progress scrubber, menus, audio picker
│   ├── WatchParty/                 # Real-time chat panel, member list, sync overlays, knock toast
│   ├── layout/                     # Glassmorphism floating navbar, mobile navigation drawer
│   └── ui/                         # shadcn UI components (buttons, badges, dialogs, inputs)
├── data/                           # Runtime persistent data directory (sqlite DB, downloaded artwork)
├── db/                             # Drizzle ORM schema definitions and migrations
├── electron/                       # Electron main process, tray management, auto-updater lifecycle
├── hooks/                          # Custom React hooks (usePlayer, useWatchParty, useVoiceChat)
├── lib/                            # Core service libraries (FFmpeg, GPU probe, DB queries, scrapers)
├── package.json                    # Dependency manifest, scripts, allowScripts definitions
├── server.ts                       # Custom Node HTTP server booting Next.js, Socket.IO, GPU probing
├── tv-cors.cjs                     # Narrow CORS middleware bridge for webOS file:// requests
└── tsconfig.json                   # Strict TypeScript compiler configuration
```

### 2.2 Frontend/Backend Split & Serving Topology
VidLock collapses both server and client execution into an integrated Node.js lifecycle orchestrated by [server.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts):
- **Server Tier**: Custom `http.createServer` instance hosting Next.js request handler alongside a `Socket.IO` engine attached to the identical port (default `2886`).
- **Database Engine**: Direct in-process SQLite driver (`better-sqlite3`) utilizing Write-Ahead Logging (`WAL` mode) executed directly in API routes and server boot routines via [lib/db.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/db.ts).
- **Client Tier**: React 19 client components bundled by Next.js using dynamic imports (`next/dynamic`) for heavy media modules (`MediaPlayer`, `WatchPartyModal`, `QRModal`).

### 2.3 System Data Flow Architecture
```mermaid
flowchart TD
    subgraph Storage ["Storage & Media Sources"]
        DISK["Local Disk / USB HDD Media"]
        SQLITE[("vidlock.db (better-sqlite3 / WAL)")]
        TMP["OS Temp Dir (/tmp/vidlock-cache)"]
    end

    subgraph CoreServer ["Custom Server (server.ts :2886)"]
        BOOT["Boot Probe (detectBestEncoder)"]
        HTTP["HTTP Server & CORS Middleware (tv-cors.cjs)"]
        SIO["Socket.IO Server (Rooms, Heartbeat, WebRTC Relay)"]
        NEXT["Next.js 16 App Router Handler"]
    end

    subgraph TranscodePipeline ["Transcoding & Streaming Pipeline"]
        PROBE["ffprobe Analyzer (lib/ffmpeg.ts)"]
        HLS_ROUTE["Dynamic HLS Engine (app/.../hls/route.ts)"]
        STREAM_ROUTE["Byte-Range Stream Engine (app/.../stream/route.ts)"]
        FFMPEG_PROC["FFmpeg Child Process (NVENC/VAAPI/QSV/AMF/CPU)"]
    end

    subgraph Clients ["Client Platforms"]
        BROWSER["Web Browser Client (React 19 / hls.js)"]
        ELECTRON["Desktop App (Electron 40 Shell)"]
        WEBOS["LG Smart TV (webOS Web App)"]
    end

    BOOT -->|Detects GPU Capability| CoreServer
    HTTP --> NEXT
    HTTP --> SIO
    NEXT --> HLS_ROUTE
    NEXT --> STREAM_ROUTE
    HLS_ROUTE --> PROBE
    PROBE --> FFMPEG_PROC
    DISK --> FFMPEG_PROC
    DISK --> STREAM_ROUTE
    FFMPEG_PROC -->|Writes .ts segments & playlist.m3u8| TMP
    TMP --> HLS_ROUTE
    HLS_ROUTE -->|Serves HLS Stream| Clients
    STREAM_ROUTE -->|HTTP 206 Partial Content| Clients
    SIO <-->|WebSocket Sync Ticks, Chat, Signaling| Clients
    NEXT <--> SQLITE
```

### 2.4 Media Ingestion, Indexing, and Artwork Workflow
1. **Directory Traversal** ([lib/scanner.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/scanner.ts)):
   - Recursive scan over configured paths stored in the `config` table (`media_paths`).
   - Hardcoded filter matching video extensions: `.mp4`, `.mkv`, `.avi`, `.mov`, `.m4v`, `.wmv`.
   - Errors on individual directory entries or missing drives are trapped gracefully without halting the scan.
2. **Identification & Metadata Resolution** ([lib/metadata-matcher.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/metadata-matcher.ts)):
   - File basenames are parsed using `guessit-js` to extract title, release year, season, and episode bounds.
   - Exact IMDB ID matching if present in filename; otherwise queries OMDb API (`https://www.omdbapi.com/`).
   - Fuzzy validation applies Levenshtein-based similarity matching requiring a score $\ge 0.65$ (`MINIMUM_TITLE_SIMILARITY`).
   - Secondary scrapers: TVMaze API (`api.tvmaze.com`) for show air dates and season summaries ([lib/tvmaze.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/tvmaze.ts)), and Fanart.tv (`@fanart-tv/api`) for high-resolution background backdrops ([lib/fanart.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/fanart.ts)).
3. **Database Insertion & Artwork Storage** ([lib/db.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/db.ts), [lib/paths.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/paths.ts)):
   - Media entries are upserted into `media_assets`, linked to `movies` or `tv_shows` and `episodes`, with initialized `playback_progress` records.
   - Remote artwork images are downloaded locally to disk:
     - Posters: `data/posters/{imdbID}.jpg`
     - Backdrops: `data/backdrops/{imdbID}.jpg`
     - Episode Thumbnails: `data/thumbnails/{filename}.jpg`
   - Files are served locally through `/api/static/{posters|backdrops|thumbnails}/{filename}` with immutable caching headers.

### 2.5 Ports, Config Files, and Startup Scripts
- **Default Port**: `2886` (configurable via `process.env.PORT`).
- **Electron Port Negotiation**: Starts at `2886` and dynamically increments if occupied (`findFreePort()` in [electron/main.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/electron/main.ts#L39)).
- **Config Storage**: `data/vidlock.db` (in `config` table) + Electron persistent store (`electron-store`).
- **Startup Commands** ([package.json](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/package.json#L10-L24)):
  - `npm run dev`: Executes `tsx server.ts` in development mode.
  - `npm run build`: Compiles production assets via `next build --webpack`.
  - `npm run start`: Runs compiled Next.js server via `tsx server.ts`.
  - `npm run electron:dev`: Rebuilds `better-sqlite3`, compiles TypeScript electron files (`tsconfig.electron.json`), and starts concurrently with `wait-on http://localhost:2886`.
  - `npm run electron:build`: Compiles Next.js fresh, builds Electron TypeScript, and runs `electron-builder`.

---

## 3. Streaming and Transcoding Pipeline

### 3.1 Streaming Decision Matrix
VidLock employs a hybrid streaming architecture determined by client container compatibility:
1. **Direct Range-Request Streaming** ([app/(main)/api/stream/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/stream/route.ts)):
   - Used for native web formats: `.mp4`, `.m4v`, `.mov`, `.webm` playing primary audio stream 0.
   - Implements full HTTP `206 Partial Content` with `Content-Range`, `Accept-Ranges: bytes`, chunked streaming (64 KB high-water mark), and 416 range error enforcement.
2. **Dynamic Live HLS Transcoding** ([app/(main)/api/hls/[mediaId]/[audioTrack]/[start]/[file]/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/hls/%5BmediaId%5D/%5BaudioTrack%5D/%5Bstart%5D/%5Bfile%5D/route.ts)):
   - Triggered automatically when:
     - Media format is non-native: `.mkv`, `.avi`, `.wmv`.
     - User selects a secondary audio track (`audioTrack > 0`), even within an `.mp4` container.
     - 10-bit color profile requires downsampling to 8-bit NV12.

### 3.2 HLS Generation, Segments, and Playlist Specs
- **Segment Duration**: 3 seconds (`-hls_time 3`).
- **Playlist Type**: `event` (`-hls_playlist_type event`), allowing progressive appending of newly transcoded segments while maintaining seekability.
- **Segment Naming**: `seg_%03d.ts` inside isolated directory: `os.tmpdir()/vidlock-cache/{mediaId}_{audioTrack}_{startSec}/`.
- **Keyframe Forcing**: `-force_key_frames expr:gte(t,n_forced*3)` enforces GOP keyframe alignment every 3 seconds for precise seeking without player stall.
- **Client Polling**:
  - Playlist polling: Client waits up to 10 seconds (50 attempts $\times$ 200 ms) for `playlist.m3u8` to generate.
  - Segment polling: For requested `.ts` chunks, route polls up to 10 seconds (20 attempts $\times$ 500 ms) before yielding HTTP 503 (`Retry-After: 2`).

### 3.3 Hardware Acceleration Detection ([lib/gpu-detect.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/gpu-detect.ts))
Executed once at server startup via `detectBestEncoder()` with results cached in `globalThis.__gpuCapability`:
1. **Nvidia NVENC**: Probes `h264_nvenc` with `-hwaccel cuda`.
2. **AMD Radeon AMF**: Probes `h264_amf` (Windows AMD GPUs).
3. **Linux VAAPI**: Inspects `/dev/dri/renderD128`, then `/dev/dri/renderD129`. Probes `h264_vaapi` with `-init_hw_device vaapi=va:{device}` and `-filter_hw_device va`.
4. **Intel Quick Sync (QSV)**: Probes `h264_qsv` with `-hwaccel qsv`.
5. **CPU Fallback**: `libx264` software encoding if hardware tests fail or time out (10s threshold).

### 3.4 Exact FFmpeg Command Structures
*Extracted directly from [buildHlsArgs()](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/hls/%5BmediaId%5D/%5BaudioTrack%5D/%5Bstart%5D/%5Bfile%5D/route.ts#L80-L165):*

#### Hardware Decode & Encode (VAAPI)
```bash
ffmpeg -hide_banner \
  -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi \
  -ss {startSec} -i "{filepath}" \
  -map 0:V:0 -map 0:a:{trackNum} \
  -vf "scale_vaapi=w=-2:h=-2:format=nv12" \
  -c:v h264_vaapi -qp 26 -profile:v main -level:v 4.1 \
  -force_key_frames "expr:gte(t,n_forced*3)" \
  [-af "aresample=48000" -ar 48000 -ac 2] \
  -c:a aac -b:a 128k [-strict experimental] \
  -sn -f hls -hls_time 3 -hls_playlist_type event \
  -hls_segment_filename "{outDir}/seg_%03d.ts" \
  "{outDir}/playlist.m3u8"
```

#### Hardware Decode & Encode (NVENC)
```bash
ffmpeg -hide_banner \
  -hwaccel cuda -hwaccel_output_format cuda \
  -ss {startSec} -i "{filepath}" \
  -map 0:V:0 -map 0:a:{trackNum} \
  -c:v h264_nvenc -preset p4 -rc vbr -cq 26 \
  -force_key_frames "expr:gte(t,n_forced*3)" \
  [-af "aresample=48000" -ar 48000 -ac 2] \
  -c:a aac -b:a 128k [-strict experimental] \
  -sn -f hls -hls_time 3 -hls_playlist_type event \
  -hls_segment_filename "{outDir}/seg_%03d.ts" \
  "{outDir}/playlist.m3u8"
```

#### Hardware Decode & Encode (Intel QSV)
```bash
ffmpeg -hide_banner \
  -hwaccel qsv -hwaccel_output_format qsv \
  -ss {startSec} -i "{filepath}" \
  -map 0:V:0 -map 0:a:{trackNum} \
  -c:v h264_qsv -preset medium -global_quality 26 \
  -force_key_frames "expr:gte(t,n_forced*3)" \
  [-af "aresample=48000" -ar 48000 -ac 2] \
  -c:a aac -b:a 128k [-strict experimental] \
  -sn -f hls -hls_time 3 -hls_playlist_type event \
  -hls_segment_filename "{outDir}/seg_%03d.ts" \
  "{outDir}/playlist.m3u8"
```

#### Software CPU Fallback (libx264)
```bash
ffmpeg -hide_banner \
  -ss {startSec} -i "{filepath}" \
  -map 0:V:0 -map 0:a:{trackNum} \
  [-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"] \
  -c:v libx264 -preset ultrafast -crf 26 \
  -force_key_frames "expr:gte(t,n_forced*3)" \
  [-af "aresample=48000" -ar 48000 -ac 2] \
  -c:a aac -b:a 128k [-strict experimental] \
  -sn -f hls -hls_time 3 -hls_playlist_type event \
  -hls_segment_filename "{outDir}/seg_%03d.ts" \
  "{outDir}/playlist.m3u8"
```

### 3.5 10-Bit Color and Surround Audio Handling
- **10-Bit Detection**: Probe using `ffprobe -v quiet -print_format json -show_streams`. Checks if `pix_fmt` contains `10le`, `10be`, or profile contains `10`.
- **GPU 10-bit Conversion**: Under VAAPI, full hardware decode processes HEVC Main10, while `scale_vaapi=w=-2:h=-2:format=nv12` executes high-speed surface conversion directly in GPU VRAM to 8-bit NV12 before encoding.
- **Surround Sound Resampling**: Audio codecs matching `eac3`, `ac3`, `dts`, `dts-hd`, `truehd` trigger audio resampling: `-af aresample=48000 -ar 48000 -ac 2 -strict experimental` downmixing multi-channel audio to standard stereo 128 kbps AAC.

### 3.6 Caching, Concurrency, and Process Cleanup
- **Startup & Shutdown Purge**: Server startup and `SIGINT`/`SIGTERM` handlers completely purge `os.tmpdir()/vidlock-cache`.
- **Inactive Eviction**: Background interval runs every 60 seconds. Active transcodes whose `lastAccessed` timestamp exceeds 10 minutes (600,000 ms) are killed via `SIGTERM`, removed from `activeTranscodes`, and their directory is purged via `fs.rmSync(dir, { recursive: true, force: true })`.
- **Concurrent Party Handling**: Distinct seek positions spawn discrete stream keys (`${mediaId}_${audioTrack}_${startSec}`) allowing watch party guests with slight network divergence to retain temporary unique segments without race-condition locking.

---

## 4. Every Page and Screen

### 4.1 Home Page (`/`)
- **URL**: `http://localhost:2886/`
- **Purpose**: Central discovery hub showcasing continue-watching resume items, featured hero banners, latest series, and genre carousels.
- **Layout**: Full-width borderless hero section followed by vertical stack container (`px-5 md:px-10 lg:px-14 pb-32 space-y-16 -mt-10`).
- **UI Elements & Copy**:
  - **Hero Slider** ([components/Home/HeroFeatured.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Home/HeroFeatured.tsx)):
    - Embla carousel rotating up to 5 featured titles.
    - Large typography with two-tone gradient title, overview summary clamp, runtime, release year, and genres badge.
    - Primary CTA: White pill button with `Play` icon and label `"Play"`.
    - Secondary CTA: Translucent glass pill button with `Info` icon and label `"More Info"` (navigates to detail page).
    - Dot navigation indicator displaying active index.
  - **Continue Watching Row** ([components/Home/ContinueWatchingList.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Home/ContinueWatchingList.tsx)):
    - Section header: `"Continue Watching"`.
    - Horizontal scrollable row of wide landscape cards (16:9).
    - Progress indicator: Bottom progress bar overlay in Netflix Red (`#E50914`).
    - Quick-resume overlay button appearing on card hover.
  - **Series Row** ([components/Home/SeriesRow.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Home/SeriesRow.tsx)):
    - Section header: `"TV Shows & Series"`.
    - Standard vertical poster aspect ratio (`2/3`).
  - **Genre Rows** ([components/Home/MiniMoviesList.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Home/MiniMoviesList.tsx)):
    - Dynamic carousels for: `Action`, `Comedy`, `Sci-Fi`, `Horror`, `Drama`, `Animation`, `Romance`, `Thriller`.
  - **Empty / Onboarding State**:
    - When 0 media files are indexed, displays Hero Onboarding Card: `"Welcome to VidLock"` with subtitle `"No media detected in library. Configure your media storage paths in Settings to get started."` and primary CTA button `"Go to Settings"`.

### 4.2 Movies Library (`/movies`)
- **URL**: `/movies`
- **Purpose**: Complete catalog grid of all indexed stand-alone films with instant filtering and sorting.
- **Layout**: Top header with filter pills and sort dropdown; multi-column responsive grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7`).
- **Interactive Controls**:
  - **Genre Filter Bar** ([components/GenreFilter.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/GenreFilter.tsx)): Horizontal scrolling list of pills (`All`, `Action`, `Comedy`, etc.).
  - **Sort Dropdown** ([components/SortDropdown.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/SortDropdown.tsx)): Options: `Title (A-Z)`, `Title (Z-A)`, `Year (Newest)`, `Year (Oldest)`, `Rating (Highest)`.
  - **Batch Selection Mode**: When activated via `"Select"` button, enables multi-select checkboxes for batch grouping.

### 4.3 Movie Detail Screen (`/movies/[slug]`)
- **URL**: `/movies/{slug}` (e.g. `/movies/inception-2010`)
- **Purpose**: Cinematic pre-playback overview with full backdrop ambient glow, technical details, trailer preview, and watch party launcher.
- **Layout**: Full-screen backdrop image with bottom vignette gradient overlay, left-aligned metadata column, right-aligned dynamic trailer preview.
- **UI Elements & Exact Actions**:
  - **Back Navigation**: Circular glass icon button `< ArrowLeft` calling `router.back()`.
  - **Title**: Split two-tone title (first half white, second half red/violet gradient).
  - **Badges**: Year (`Calendar` icon), Runtime in minutes (`Clock` icon), IMDB Rating with star (`Star` icon), HDD Offline indicator if unmounted.
  - **Action Group**:
    - Primary Button: Solid white pill, `Play` icon, label `"Play Movie"` $\rightarrow$ navigates to `/player/{mediaId}`.
    - Watch Party Button: Glass pill, `Users` icon, label `"Watch Party"` $\rightarrow$ opens `CreateRoomModal`.
    - Favorite Toggle: Heart icon button invoking `/api/toggle-favorite`.
    - Edit Title Pencil: Visible if `enableEditMode` is true in settings $\rightarrow$ triggers `EditTitleModal`.
    - Play on PC Dropdown: Menu showing external local players (e.g., VLC, MPC-HC) invoking `/api/play-local`.
  - **Auto-Trailer Inline**: Inline video player generating random 30-second clips from the movie using `#t={timestamp}`.

### 4.4 TV Shows Library (`/shows`)
- **URL**: `/shows`
- **Purpose**: Filterable, searchable directory of all indexed television series grouped by title.
- **Layout**: Matches movies grid with dedicated episode count badges overlaying show cards.

### 4.5 TV Show Detail & Season Browser (`/shows/[slug]`)
- **URL**: `/shows/{slug}`
- **Purpose**: Multi-season episode hierarchy browser with episode synopsis, individual thumbnails, and progress tracking per episode.
- **Layout**: Top show hero overview, horizontal season tabs (`Season 1`, `Season 2`), vertical episode card list.
- **UI Elements**:
  - **Season Picker Tabs**: Horizontal pill group indicating active season; updates episode list without page reloads.
  - **Episode Cards**:
    - Left: 16:9 thumbnail preview ([components/EpisodeThumbnail.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/EpisodeThumbnail.tsx)) with custom camera capture button if thumbnail editor is launched.
    - Center: Episode number and title (`S01E01 — Pilot`), overview synopsis, runtime.
    - Right: Play button, Watch Party button per episode, Play on PC menu.

### 4.6 Online Discover Screen (`/discover`)
- **URL**: `/discover`
- **Purpose**: Browse trending movies and shows from 2embed public APIs with remote streaming capabilities.
- **Layout**: Sub-navigation toggle (`Trending Movies`, `Trending TV`), time window filter (`Today`, `This Week`), responsive media poster grid.
- **UI Elements**:
  - Cards include `"Online"` badge with globe icon. Clicking opens detail screen with embed player options.

### 4.7 Favorites Screen (`/favorites`)
- **URL**: `/favorites`
- **Purpose**: Filtered collection of media items where `playback_progress.is_favorite = 1`.
- **Empty State**: Displays heart icon, text `"No favorites yet"`, and prompt `"Click the heart icon on any movie or show to save it here."`.

### 4.8 Search Screen (`/search`)
- **URL**: `/search`
- **Purpose**: Instant live-search interface matching titles, actors, genres, and filenames.
- **Keyboard Shortcut**: `Ctrl + K` or `Cmd + K` from anywhere in the app opens search automatically.
- **UI Elements**: Large search input with clear `X` button, live results counter, search query suggestions, instant grid results.

### 4.9 Settings Screen (`/settings`)
- **URL**: `/settings`
- **Purpose**: Primary administrative panel protected by `AdminPinGate`.
- **Layout**: Multi-section vertical form with auto-save debouncing (650 ms timer).
- **Sections**:
  1. **Hardware Acceleration**: Displays detected GPU encoder badge (`Nvidia NVENC`, `VAAPI`, `Intel Quick Sync`, `AMD Radeon AMF`, or `CPU (libx264)`).
  2. **Media Folders**: List of paths with `FolderPicker` integration, remove buttons, and `"Add Folder"` button.
  3. **Library Management**: Scan button with live progress (`Scanning...`, current file, percentage), `"Wipe Database"` destructive button.
  4. **Appearance & Background**: Background mode radio (`Default Glass`, `Dominant Color`, `Custom Wallpaper`), Blur slider (0–40px), Dim slider (0–90%), wallpaper file upload.
  5. **Toggles**:
     - `"Show Offline Media"` (toggle switch)
     - `"Show 'Play on PC' Buttons"` (toggle switch)
     - `"Enable Auto-Trailer Backgrounds"` (toggle switch)
     - `"Show Online Discover Tab"` (toggle switch)
     - `"Enable Edit Mode (Pencil Icons)"` (toggle switch)
  6. **Security & PIN**: Enable/disable PIN toggle, 4–6 digit numeric PIN setter.
  7. **External Players**: Custom launcher configuration for local binaries (VLC, MPV, MPC-HC) with argument templating.
  8. **API Keys**: Form inputs for `OMDb API Key`, `Fanart.tv API Key`, and `OpenSubtitles API Key`.

### 4.10 Admin Unmatched Files Screen (`/admin/unmatched`)
- **URL**: `/admin/unmatched`
- **Purpose**: Review media files that failed automatic confidence scoring ($\text{score} < 0.65$).
- **Features**: List of unmatched files, manual search input against OMDb, one-click manual match confirmation, and database metadata rewrite.

---

## 5. Custom Video Player (Deep Dive)

The custom video player is implemented across [MediaPlayer.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/MediaPlayer.tsx), [usePlayer.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/usePlayer.ts), and supporting control components.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [←] Title — S01E02                                                    │
│                                                                        │
│                                                                        │
│                          [   SPINNER   ]                               │
│                                                                        │
│                                                                        │
│                 [ Yellow / White Subtitle Text ]                       │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ──●───────────────────────────────────────────────── 14:22 / 52:10 │ │
│ │ [▶] [↺ 10] [↻ 10] [🔊 ──●──]               [CC] [AUDIO] [📺] [⛶]   │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Controls, Positioning, and Icons
1. **Top Bar** (Floating header gradient):
   - Back Button: Circular glass pill, `< ArrowLeft`, navigates `router.back()`.
   - Title Header: White font, truncated title with Season/Episode numbering (`{title} — S01E02`).
2. **Center Video Stage**:
   - Primary HTML5 `<video>` element (`w-full h-full object-contain`).
   - Double-tap/Double-click skip zones (left 50% rewinds 10s, right 50% skips 10s).
   - Buffering Indicator: Centered spinning ring (`w-14 h-14 border-[3px] border-white/30 border-t-white rounded-full animate-spin`).
   - Resume Toast: Centered top pill (`Resuming from 12:45`) auto-dismissing after 3,000 ms.
   - Subtitle Overlay: Custom text rendered inside `bg-black/70 px-5 py-2 rounded` supporting variable size (`small`: 0.85rem, `medium`: 1.1rem, `large`: 1.4rem) and color (`white`: `#ffffff`, `yellow`: `#f3f315`).
3. **Desktop Bottom Controls** (Floating Pill Container):
   - Positioned `bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl px-6 py-4 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10`.
   - **Progress Scrubber** ([components/Player/ProgressBar.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/ProgressBar.tsx)):
     - Height: `5px`, expanding to `7px` on hover.
     - Layers: Background track (`bg-white/20`), Buffered track (`bg-white/40`), Played track (`bg-[#E50914]`), Scrubber knob (`w-[14px] h-[14px] bg-[#E50914] rounded-full`).
     - Hover Timestamp & Thumbnail: Floating tooltip rendering frame thumbnail via `/api/thumbnail?id={mediaId}&time={hoverTime}` alongside `mm:ss` timestamp badge.
   - **Play / Pause Button**: Circular white button (`w-12 h-12 bg-white text-black`), toggles `Play` / `Pause` icons.
   - **Skip Rewind / Forward**: Grouped pill container (`bg-white/5 border border-white/10`) with `SkipBack` (10s) and `SkipForward` (10s).
   - **Volume Scrubber** ([components/Player/VolumeControl.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/VolumeControl.tsx)): Speaker icon toggles mute; horizontal slider controls volume range `0.0` to `1.0`. Value persisted in `localStorage('vidlock_volume')`.
   - **Time Display**: Monospace font `tabular-nums` showing `{currentTime} / {duration}`.
   - **Subtitle Selector** (`Subtitles` icon): Opens menu to pick embedded subtitle streams, toggle appearance (small/med/large, white/yellow), or search OpenSubtitles on the fly.
   - **Audio Track Selector** (`Volume2` icon): Shows available audio channels; switching triggers live audio stream switch and brief spinner `"Switching audio..."`.
   - **Cast Button** (`CastButton.tsx`): Google Cast SDK sender trigger.
   - **Fullscreen Toggle**: `Maximize` / `Minimize` icons invoking `containerRef.requestFullscreen()`.

### 5.2 Mobile & Responsive Control Modes
- **Mobile Portrait**: Stacked layout with scrub bar on top, prominent centered circular play button (`w-14 h-14`), and large touch targets.
- **Mobile Landscape**: Ultra-compact single horizontal strip maximizing video display area.

### 5.3 Keyboard Shortcuts & Remote Mappings
| Key | Action | Implementation Reference |
| :--- | :--- | :--- |
| `Space` or `k` | Toggle Play / Pause | [NetflixPlayer.tsx:L213](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L213) |
| `ArrowLeft` | Skip backward 10 seconds | [NetflixPlayer.tsx:L218](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L218) |
| `ArrowRight` | Skip forward 10 seconds | [NetflixPlayer.tsx:L222](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L222) |
| `ArrowUp` | Volume up +10% | [NetflixPlayer.tsx:L226](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L226) |
| `ArrowDown` | Volume down -10% | [NetflixPlayer.tsx:L230](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L230) |
| `m` | Toggle Mute | [NetflixPlayer.tsx:L234](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L234) |
| `f` | Toggle Fullscreen | [NetflixPlayer.tsx:L238](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L238) |
| `c` | Cycle Subtitle track on/off | [NetflixPlayer.tsx:L242](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L242) |
| `v` | Toggle Voice Chat Mic Mute | [watch/[roomCode]/page.tsx:L67](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/watch/%5BroomCode%5D/page.tsx#L67) |
| `Escape` | Close active menus or exit player | [NetflixPlayer.tsx:L248](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/NetflixPlayer.tsx#L248) |

### 5.4 Control Auto-Hide Mechanics
- Auto-hide timer triggers after **3,000 ms** of inactivity (`resetControlsTimer` in [usePlayer.ts:L284](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/usePlayer.ts#L284)).
- Mouse movement over container resets timer and restores `opacity-100`.
- Cursor style switches to `cursor: none` when controls are hidden.
- Special Desktop Left Edge Zone: Left 50px boundary (`[data-controls]` strip) instantly hides controls when entered to prevent accidental overlay display.

### 5.5 Playback Position Persistence & Error Recovery
- **Continuous Progress Saver**: Runs every 5,000 ms while playing, emitting `PUT /api/watch-progress` with `{ id, currentTime, duration }` ([usePlayer.ts:L91](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/usePlayer.ts#L91)).
- **Watched Threshold**: Database marks `is_watched = 1` once current progress exceeds 90% of total duration.
- **HLS Error Recovery**: Listens on `Hls.Events.ERROR`. Automatic retry handles `NETWORK_ERROR` via `hls.startLoad()` and `MEDIA_ERROR` via `hls.recoverMediaError()`.

---

## 6. Watch Party System

Watch parties are managed in real-time via Socket.IO in [server.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts) and consumed by [useWatchParty.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/hooks/useWatchParty.ts) and [watch/[roomCode]/page.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/watch/%5BroomCode%5D/page.tsx).

### 6.1 Lifecycle Flow: Room Creation, Knock-to-Join, & QR Sharing
1. **Creation**:
   - Host clicks `"Watch Party"` on any media card $\rightarrow$ opens `CreateRoomModal.tsx`.
   - Host inputs display name $\rightarrow$ emits `create-room` with `{ mediaId, hostName }`.
   - Server generates a unique 6-character alphanumeric room code (e.g. `K9X2B7`) excluding ambiguous characters (`0, 1, I, O`).
   - Host is redirected to `/watch/{ROOM_CODE}`.
2. **Lobby & Knock-to-Join Flow**:
   - If room status is `'waiting'`, guests joining via `/join/{ROOM_CODE}` enter directly.
   - If room status is `'started'` (movie in progress), knock-to-join is enforced:
     - Guest emits `join-room`. Socket is marked `isPending = true`.
     - Host receives `join-requested` toast notification with guest name, Approve button, and Decline button.
     - Guest client transitions to `PENDING` screen showing a pulsing hourglass and message `"Waiting for host to admit you..."`.
     - Knock times out after **30 seconds**; guest receives `join-declined` with reason `'timeout'`.
     - Host approval emits `approve-join`, adds guest to room, and sends current projected playback state.
3. **Sharing**:
   - Modal generates shareable URL (e.g. `http://192.168.1.100:2886/join/K9X2B7`) with interactive SVG QR code generated via `qrcode`.

### 6.2 Full Socket.IO Event Reference
| Event Name | Direction | Payload Structure | Handler File & Line |
| :--- | :--- | :--- | :--- |
| `ping` | Client $\rightarrow$ Server | `void` | [server.ts:L279](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L279) |
| `pong` | Server $\rightarrow$ Client | `timestamp: number` | [server.ts:L280](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L280) |
| `create-room` | Client $\rightarrow$ Server | `{ mediaId: number, hostName: string }` | [server.ts:L284](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L284) |
| `get-room-info` | Client $\rightarrow$ Server | `{ roomCode: string }` | [server.ts:L311](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L311) |
| `list-rooms` | Client $\rightarrow$ Server | `{}` | [server.ts:L325](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L325) |
| `join-room` | Client $\rightarrow$ Server | `{ roomCode: string, guestName: string }` | [server.ts:L339](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L339) |
| `rejoin-room` | Client $\rightarrow$ Server | `{ roomCode: string, name: string }` | [server.ts:L439](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L439) |
| `member-ready` | Client $\rightarrow$ Server | `{ roomCode: string }` | [server.ts:L521](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L521) |
| `playback-event` | Client $\rightarrow$ Server | `{ roomCode: string, type: 'play'\|'pause'\|'seek', currentTime: number }` | [server.ts:L527](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L527) |
| `playback-sync` | Server $\rightarrow$ Client | `{ type: string, currentTime: number, serverTime: number, playAtServerTime: number }` | [server.ts:L546](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L546) |
| `sync-tick` | Server $\rightarrow$ Client | `{ isPlaying: boolean, currentTime: number, serverTime: number }` | [server.ts:L129](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L129) |
| `waiting-for-ready` | Server $\rightarrow$ Client | `{ members: PublicMember[] }` | [server.ts:L171](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L171) |
| `member-ready-update` | Server $\rightarrow$ Client | `{ members: PublicMember[] }` | [server.ts:L198](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L198) |
| `all-ready` | Server $\rightarrow$ Client | `{ state: PlaybackState, members: PublicMember[] }` | [server.ts:L226](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L226) |
| `party-started` | Bidirectional | `{ roomCode: string }` | [server.ts:L580](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L580) |
| `approve-join` | Client $\rightarrow$ Server | `{ roomCode: string, requestId: string }` | [server.ts:L594](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L594) |
| `decline-join` | Client $\rightarrow$ Server | `{ roomCode: string, requestId: string }` | [server.ts:L652](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L652) |
| `cancel-join-request` | Client $\rightarrow$ Server | `{ roomCode: string }` | [server.ts:L677](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L677) |
| `chat-message` | Client $\rightarrow$ Server | `{ roomCode: string, text: string }` | [server.ts:L562](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L562) |
| `new-message` | Server $\rightarrow$ Client | `ChatMessage` | [server.ts:L576](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L576) |
| `member-joined` | Server $\rightarrow$ Client | `{ name: string, members: PublicMember[] }` | [server.ts:L407](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L407) |
| `member-left` | Server $\rightarrow$ Client | `{ name: string, members: PublicMember[] }` | [server.ts:L823](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L823) |
| `host-changed` | Server $\rightarrow$ Client | `{ newHostName: string, members: PublicMember[] }` | [server.ts:L806](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L806) |
| `you-are-host` | Server $\rightarrow$ Client | `{ members: PublicMember[] }` | [server.ts:L801](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L801) |
| `webrtc-offer` | Relayed P2P | `{ targetSocketId: string, offer: any }` | [server.ts:L698](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L698) |
| `webrtc-answer` | Relayed P2P | `{ targetSocketId: string, answer: any }` | [server.ts:L706](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L706) |
| `webrtc-ice-candidate` | Relayed P2P | `{ targetSocketId: string, candidate: any }` | [server.ts:L713](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L713) |
| `voice-joined` | Client $\rightarrow$ Server | `{ roomCode: string }` | [server.ts:L720](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L720) |
| `voice-left` | Client $\rightarrow$ Server | `{ roomCode: string }` | [server.ts:L728](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L728) |
| `voice-mute-changed` | Bidirectional | `{ roomCode: string, isMuted: boolean }` | [server.ts:L736](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L736) |
| `voice-speaking` | Bidirectional | `{ roomCode: string, isSpeaking: boolean }` | [server.ts:L744](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts#L744) |

### 6.3 Synchronization Algorithm & Drift Correction
- **Projected Time**: Server evaluates current playback location without requiring continuous ticks:
  $$\text{projectedTime} = \text{currentTime} + \frac{\text{Date.now()} - \text{updatedAt}}{1000}$$
- **Heartbeat Interval**: `startSyncHeartbeat()` emits `sync-tick` every **10 seconds** to active guests.
- **Scheduled Playback**: Play/Pause commands from host calculate `playAtServerTime = now + 300ms`. Clients execute playback at `delay = playAtServerTime - getServerTime()` for millisecond-accurate simultaneous start across network latencies.
- **Client Drift Thresholds** ([watch/[roomCode]/page.tsx:L401-L418](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/watch/%5BroomCode%5D/page.tsx#L401-L418)):
  - **$\Delta < 2.0\text{ seconds}$**: Minor network jitter; tolerated silently without interruption.
  - **$2.0\text{s} \le \Delta \le 15.0\text{ seconds}$**: Hard Snap. Client snaps `video.currentTime` directly to `relativeTarget = currentTime - offset` inside current buffer.
  - **$\Delta > 15.0\text{ seconds}$**: Out-of-bounds drift. Client aborts current segment stream and initiates a full HLS transcode restart seek (`playerSeekRef.current(currentTime)`).

### 6.4 Ready-Check Protocol (Post-Seek Barrier)
1. Host performs seek $\rightarrow$ server pauses room and executes `startReadyCheck()`.
2. Host is marked `ready = true`; all guests are marked `ready = false`.
3. Server emits `waiting-for-ready` with full membership roster.
4. Clients display `SyncOverlay.tsx` (`"Syncing with room..."` spinner with member ready indicators).
5. When guest buffers target position, guest client emits `member-ready`.
6. Once all guests report ready, or upon a **15-second safety timeout** (`readyTimeout`), server sets `isPlaying = true` and broadcasts `all-ready`.

### 6.5 WebRTC Mesh Voice Chat ([hooks/useVoiceChat.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/hooks/useVoiceChat.ts))
- **Topology**: Full peer-to-peer WebRTC mesh (every connected participant creates an `RTCPeerConnection` to every other participant).
- **STUN / TURN Relay**: Dynamically loaded via `/api/turn-config` querying Metered.ca STUN/TURN relays over ports 80 and 443 (UDP & TCP).
- **Audio Processing**:
  - Web Audio API pipeline (`AudioContext`, `createAnalyser()`, FFT size 512).
  - VAD (Voice Activity Detection): Checks frequency bins every 100 ms against threshold (average amplitude $> 12$).
  - Emits `voice-speaking` to render animated speaking glow rings around user avatar.
- **Mute Controls**: Toggle button or `V` keyboard shortcut enables/disables microphone track (`track.enabled = !isMuted`).

---

## 7. TV Experience (LG webOS & TV Browser)

VidLock provides two dedicated smart TV modalities: an App Router web view (`/tv`) and a pre-packaged LG webOS IPK application.

### 7.1 Routes and Packaging
- **Web App Route**: `/tv` ([app/(tv)/tv/page.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28tv%29/tv/page.tsx)) and `/tv/play/[id]` ([app/(tv)/tv/play/[id]/page.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28tv%29/tv/play/%5Bid%5D/page.tsx)).
- **webOS Application Package**: [application/webos-app/](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/application/webos-app/)
  - Package ID: `com.manish6523.vidlock`
  - Version: `1.0.0`
  - Manifest: `appinfo.json` configured for resolution `1920x1080` with `disableBackHistoryAPI: true`.
  - Artifact IPK: `com.manish6523.vidlock_1.0.0_all.ipk` (1.3 MB).

### 7.2 Spatial Navigation & D-Pad Remote Mapping
The TV interface completely replaces pointer interactions with an absolute grid coordinate state machine (`focusPos: { row, col }`):
- **Row 0 (Header Navigation)**: 3 columns (`All`, `Movies`, `Shows`).
- **Row 1+ (Content Grid)**: 6 columns per row (`COLS_PER_ROW = 6`).
- **Key Code Mappings**:
  - `ArrowUp` / `ArrowDown`: Move vertically between navigation bar and content grid.
  - `ArrowLeft` / `ArrowRight`: Move horizontally between cards or navigation tabs.
  - `Enter` / `Return`: Select navigation tab or launch media item.
  - `Backspace` / `Escape` / `XF86Back` / `keyCode 461` (LG Magic Remote Back): Return to `/tv` grid.

### 7.3 TV CORS Middleware Bridge ([tv-cors.cjs](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/tv-cors.cjs))
Because packaged webOS apps execute from `file://` origins, standard browsers send `Origin: null`. VidLock intercepts every server request:
- Whitelists origins defined in `process.env.VIDLOCK_TV_ORIGINS` (defaults to `'null'`).
- Permits read endpoints: `/api/media`, `/api/recently-added`, `/api/continue-watching`, `/api/stream`, `/api/hls/*`.
- Permits write endpoints: `/api/watch-progress` (`PUT`).
- Adds headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: GET, HEAD, PUT, OPTIONS`, `Access-Control-Expose-Headers: Content-Range, Accept-Ranges, Content-Length`.

---

## 8. Library and Content Features

### 8.1 Scanning Engine & Watch Folders
- Scans paths configured in `config.media_paths` (defaults to user's `Videos` directory on Windows).
- Traverses folders recursively, filtering out non-video files.
- Drive Disconnection Safety: When an external drive is unmounted, media items are preserved in SQLite but updated to `available = 0`, causing cards to render in grayscale with an `"Offline"` badge.

### 8.2 Metadata Enrichment Hierarchy
1. Parse filename with `guessit-js`.
2. Query OMDb API (`omdbapi.com`) using IMDB ID or Title + Year.
3. Fallback to TVMaze API (`api.tvmaze.com`) for television episode titles and descriptions.
4. Query Fanart.tv API (`webservice.fanart.tv`) for high-resolution backdrops.
5. Extract local episode thumbnails using FFmpeg if online art is unavailable.

### 8.3 Manual Title & Artwork Editor ([components/EditTitleModal.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/EditTitleModal.tsx))
When Edit Mode is enabled, users can:
- Manually edit Title, Year, Rating, Overview, and Genres.
- Paste custom image URLs or drag-and-drop local images for Posters and Backdrops.
- Query online artwork options from OMDb and Fanart.tv with like counters.

### 8.4 Group as Series Modal ([components/GroupAsSeriesModal.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/GroupAsSeriesModal.tsx))
Allows users to select arbitrary video files and group them into a structured TV Show:
- Uses `@dnd-kit` drag-and-drop reordering.
- Add and delete seasons (`Season 1`, `Season 2`).
- Drag episodes across seasons, re-number episodes, and assign custom episode names.
- Submits structured payload to `/api/group-as-series`.

---

## 9. Security and Access Control

### 9.1 PIN Protection Architecture
- **Storage**: PIN is stored in SQLite `config` table as `admin_pin_hash` hashed using SHA-256 (`crypto.createHash('sha256').update(pin).digest('hex')`).
- **Activation**: Controlled by `config.admin_pin_enabled` (`true` / `false`).
- **Authentication Token**:
  - Successful PIN verification (`/api/admin/verify-pin`) generates a signed HMAC-SHA256 session token.
  - Secret key: `admin_pin_hash`.
  - Format: `${expires}.${signature}` where `expires = Date.now() + 3600000` (1 hour).
  - Cookie: `vidlock_admin`, `httpOnly: true`, `sameSite: strict`, `path: /`, `maxAge: 3600`.
- **Validation**: [lib/admin-session.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/admin-session.ts) validates cookie using `crypto.timingSafeEqual` against constant-time timing attacks.

### 9.2 Exposed Endpoints & Risks
- **Admin Endpoints**: `/api/config`, `/api/scan`, `/api/clear-db`, `/api/admin/*` check `isAdmin(request)`.
- **Open Endpoints**: Media streaming (`/api/stream`, `/api/hls/*`) and socket connections do NOT require PIN authentication by default, allowing seamless playback across local smart TVs without complex cookie injection.
- **Network Exposure Recommendation**: If exposed over Cloudflare Tunnel or public WAN, an external access proxy (e.g. Cloudflare Access, reverse proxy basic auth) must be placed in front of VidLock.

---

## 10. Design System and UX Details

### 10.1 Color Palette & Oklch Variables
*Extracted directly from [app/(main)/globals.css](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/globals.css):*

| Token Name | Oklch / Hex Specification | Usage in UI |
| :--- | :--- | :--- |
| `--background` | `oklch(0.08 0.015 280)` | Deep obsidian base surface |
| `--foreground` | `oklch(0.95 0.01 280)` | Pure crisp white typography |
| `--card` | `oklch(0.12 0.015 280)` | Glass cards, panel backings |
| `--primary` | `oklch(0.65 0.22 280)` | Vivid violet brand accent |
| `--primary-foreground` | `oklch(0.98 0 0)` | White text on primary buttons |
| `--destructive` | `oklch(0.6 0.22 25)` | Coral red error badges and delete buttons |
| `Netflix Red` | `#E50914` | Player progress scrubber, play accents |
| `--border` | `oklch(1 0 0 / 8%)` | Subtle glass panel borders |
| `--color-surface-glass`| `rgba(255, 255, 255, 0.04)` | Ultra-sheer backdrop layers |
| `--color-border-glass` | `rgba(255, 255, 255, 0.08)` | Ambient glass stroke boundaries |

### 10.2 Typography & Spacing Scale
- **Font Sans**: `"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif`.
- **Font Mono**: `"Cascadia Code", "SFMono-Regular", Consolas, monospace` (used for timestamps, timecodes, room codes).
- **Border Radius**:
  - `--radius-sm`: `0.375rem` (6px)
  - `--radius-md`: `0.5rem` (8px)
  - `--radius-lg`: `0.625rem` (10px)
  - `--radius-xl`: `0.875rem` (14px)
  - `--radius-2xl`: `1.125rem` (18px)
  - `--radius-3xl`: `1.375rem` (22px)

### 10.3 Toast Notifications ([components/Toast.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Toast.tsx))
- **Position**: Fixed bottom-right (`bottom-6 right-6 z-[9999]`).
- **Capacity**: Maximum 3 concurrent toasts (FIFO queue).
- **Auto-Dismiss**: Exactly 3,000 ms.
- **Variants**:
  - `success`: `bg-emerald-500/10 border-emerald-500/20 text-emerald-400`
  - `error`: `bg-red-500/10 border-red-500/20 text-red-400`
  - `info`: `bg-violet-500/10 border-violet-500/20 text-violet-400`
  - `warning`: `bg-amber-500/10 border-amber-500/20 text-amber-400`

---

## 11. User Journeys

### 11.1 First-Time Setup
1. User installs VidLock via installer (`.exe`, `.dmg`, `.deb`) or clones repo and runs `npm run dev`.
2. User opens `http://localhost:2886`.
3. System boots with 0 indexed items; displays Hero Onboarding Card.
4. User clicks `"Go to Settings"`.
5. Under **Media Folders**, user selects folder containing movies or series.
6. User clicks `"Scan Library"`. Background job walks directory, probes media, scrapes metadata, and populates SQLite.
7. User returns to `/` to view populated library.

### 11.2 Watching a Movie (Single User)
1. User scrolls through catalog or presses `Ctrl+K` to search for a title.
2. User clicks poster $\rightarrow$ navigates to `/movies/{slug}`.
3. User reviews synopsis, rating, and runtime.
4. User clicks `"Play Movie"` $\rightarrow$ loads `/player/{id}`.
5. If file is native MP4, video streams immediately over HTTP range requests. If MKV/HEVC, FFmpeg spawns on-the-fly and HLS stream plays within 1–2 seconds.
6. User presses `Space` to pause, `ArrowRight` to skip forward 10s, `F` for fullscreen.
7. Playback progress auto-saves every 5 seconds.

### 11.3 Hosting a Watch Party
1. Host navigates to movie detail page and clicks `"Watch Party"`.
2. Host enters display name in modal and clicks `"Create Room"`.
3. Server generates 6-character room code; navigates host to `/watch/{roomCode}`.
4. Host clicks QR Code icon to share room link with friends.
5. Host clicks `"Start Party"` $\rightarrow$ room status changes to `'started'`.
6. Host presses play $\rightarrow$ server dispatches synchronized play timestamp to all connected guests.

### 11.4 Joining a Watch Party as a Guest
1. Guest navigates to `/join/{roomCode}` or scans QR code.
2. If party has already started, guest enters name and clicks `"Request to Join"`.
3. Host receives toast: `"{Name} wants to join the party"`; clicks `"Approve"`.
4. Guest client transitions into `/watch/{roomCode}` and immediately seeks to host's projected playback timestamp.
5. Guest presses `V` to unmute WebRTC voice chat and talk with friends.

---

## 12. Settings and Configuration

| Key Name | Storage | Default Value | Valid Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `media_paths` | `config` table | `["~/Videos"]` | Array of path strings | Root directories scanned for video files |
| `last_scan` | `config` table | `null` | ISO 8601 Timestamp | Timestamp when library was last indexed |
| `show_offline_media` | `config` table | `"true"` | `"true"`, `"false"` | Whether unmounted drive assets appear in grid |
| `show_play_on_pc` | `config` table | `"true"` | `"true"`, `"false"` | Show external local player launcher menu |
| `enable_auto_trailer_bg` | `config` table | `"true"` | `"true"`, `"false"` | Play background trailer previews on detail screens |
| `show_discover_tab` | `config` table | `"true"` | `"true"`, `"false"` | Enable online catalog tab in navbar |
| `enable_edit_mode` | `config` table | `"false"` | `"true"`, `"false"` | Display pencil icons for editing metadata |
| `admin_pin_enabled` | `config` table | `"false"` | `"true"`, `"false"` | Protect settings with PIN gate |
| `admin_pin_hash` | `config` table | `null` | 64-char hex SHA-256 | Hash of the 4–6 digit security PIN |
| `custom_video_players` | `config` table | `[]` | JSON array of objects | External player paths (VLC, MPV, MPC-HC) |
| `omdb_api_key` | `config` table | `""` | Alphanumeric API key | OMDb API authentication key |
| `fanart_api_key` | `config` table | `""` | Alphanumeric API key | Fanart.tv API key |
| `opensubtitles_api_key`| `config` table | `""` | Alphanumeric API key | OpenSubtitles REST API key |
| `bg_mode` | `localStorage` | `"default"` | `"default"`, `"color"`, `"custom"` | Wallpaper backdrop mode |
| `bg_blur` | `localStorage` | `20` | Integer `0`–`40` | Backdrop CSS blur filter (px) |
| `bg_dim` | `localStorage` | `40` | Integer `0`–`90` | Backdrop dimming black overlay (%) |
| `vidlock_volume` | `localStorage` | `1.0` | Float `0.0`–`1.0` | Persisted audio volume level |
| `vidlock_muted` | `localStorage` | `false` | Boolean | Persisted audio mute state |

---

## 13. API Reference

| Method | Endpoint Path | Query / Body Params | Auth Required | File Implementation |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/media` | `?id=`, `?type=`, `?search=`, `?stats=` | No | [app/(main)/api/media/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/media/route.ts) |
| `GET` | `/api/stream` | `?id={mediaId}` | No | [app/(main)/api/stream/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/stream/route.ts) |
| `GET` | `/api/hls/[mediaId]/[audioTrack]/[start]/[file]`| Route params | No | [app/.../hls/.../route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/hls/%5BmediaId%5D/%5BaudioTrack%5D/%5Bstart%5D/%5Bfile%5D/route.ts) |
| `GET` | `/api/continue-watching` | None | No | [app/(main)/api/continue-watching/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/continue-watching/route.ts) |
| `GET` | `/api/recently-added` | None | No | [app/(main)/api/recently-added/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/recently-added/route.ts) |
| `GET` | `/api/favorites` | `?limit=` | No | [app/(main)/api/favorites/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/favorites/route.ts) |
| `POST` | `/api/toggle-favorite` | `{ id: number }` | No | [app/(main)/api/toggle-favorite/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/toggle-favorite/route.ts) |
| `PUT` | `/api/watch-progress` | `{ id: number, currentTime: number, duration: number }` | No | [app/(main)/api/watch-progress/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/watch-progress/route.ts) |
| `GET` | `/api/audio-tracks` | `?id={mediaId}` | No | [app/(main)/api/audio-tracks/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/audio-tracks/route.ts) |
| `GET` | `/api/subtitles` | `?id={mediaId}` | No | [app/(main)/api/subtitles/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/subtitles/route.ts) |
| `GET` | `/api/thumbnail` | `?id={mediaId}&time={seconds}` | No | [app/(main)/api/thumbnail/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/thumbnail/route.ts) |
| `GET` | `/api/turn-config` | None | No | [app/(main)/api/turn-config/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/turn-config/route.ts) |
| `GET` | `/api/config` | None | No | [app/(main)/api/config/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/config/route.ts) |
| `POST` | `/api/config` | JSON config updates | Yes (`isAdmin`) | [app/(main)/api/config/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/config/route.ts) |
| `POST` | `/api/scan` | None | Yes (`isAdmin`) | [app/(main)/api/scan/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/scan/route.ts) |
| `POST` | `/api/clear-db` | None | Yes (`isAdmin`) | [app/(main)/api/clear-db/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/clear-db/route.ts) |
| `POST` | `/api/admin/verify-pin` | `{ pin: string }` | No | [app/(main)/api/admin/verify-pin/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/admin/verify-pin/route.ts) |
| `GET` | `/api/admin/pin-status` | None | No | [app/(main)/api/admin/pin-status/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/admin/pin-status/route.ts) |
| `POST` | `/api/play-local` | `{ id: number, playerPath: string }` | No | [app/(main)/api/play-local/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/play-local/route.ts) |
| `GET` | `/api/shuffle` | `?type=movie\|show\|both` | No | [app/(main)/api/shuffle/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/shuffle/route.ts) |

---

## 14. Feature Inventory Table

| Feature Area | Specific Capability | Status | Implementation Files | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Transcoding** | Auto GPU Encoder Detection | Done | `lib/gpu-detect.ts` | NVENC, VAAPI, QSV, AMF, CPU |
| **Transcoding** | Live HLS Chunk Generator | Done | `api/hls/.../route.ts` | 3s segment length, event playlist |
| **Transcoding** | 10-Bit HEVC to 8-Bit Downsampling | Done | `api/hls/.../route.ts` | Hardware scale on VAAPI VRAM |
| **Transcoding** | Multi-channel Surround Downmix | Done | `api/hls/.../route.ts` | Resamples EAC3/DTS/AC3 to stereo AAC |
| **Watch Party** | Real-time Room Sync | Done | `server.ts`, `useWatchParty.ts` | Projected state + 10s sync tick |
| **Watch Party** | Drift Detection & Snapping | Done | `watch/[roomCode]/page.tsx` | <2s ignore, 2–15s snap, >15s seek |
| **Watch Party** | Post-Seek Ready Barrier | Done | `server.ts` | 15s timeout with member ready checklist |
| **Watch Party** | Knock-to-Join Flow | Done | `server.ts`, `join/[roomCode]` | 30s timeout on pending requests |
| **Voice Chat** | Mesh WebRTC Voice | Done | `hooks/useVoiceChat.ts` | P2P with Metered.ca STUN/TURN |
| **Voice Chat** | Voice Activity Detection (VAD) | Done | `hooks/useVoiceChat.ts` | FFT 512, animated ring indicator |
| **Player** | Custom Video Scrubber | Done | `ProgressBar.tsx` | Live thumbnail preview on hover |
| **Player** | Audio Track Switching | Done | `AudioMenu.tsx`, `usePlayer.ts` | Triggers dynamic HLS audio map |
| **Player** | Subtitle Search & Download | Done | `SubtitleMenu.tsx`, `opensubtitles.ts` | In-player search & save |
| **Player** | Double-Click Seek Zones | Done | `MediaPlayer.tsx` | 10s rewind / forward on side clicks |
| **Library** | Recursive Media Scanner | Done | `scanner.ts`, `api/scan` | Preserves offline disk entries |
| **Library** | Fuzzy Metadata Matcher | Done | `metadata-matcher.ts` | Levenshtein $\ge 0.65$ threshold |
| **Library** | Drag-and-Drop Series Grouping | Done | `GroupAsSeriesModal.tsx` | Powered by `@dnd-kit` |
| **Library** | Live Episode Thumbnail Capture | Done | `ThumbnailEditor.tsx` | Captures video frame to disk |
| **TV Experience**| Spatial D-Pad Navigation | Done | `tv/TVBrowser.tsx` | Coordinate focus state machine |
| **TV Experience**| Packaged webOS App | Done | `application/webos-app/` | `com.manish6523.vidlock` IPK |
| **Security** | Admin PIN Protection | Done | `AdminPinGate.tsx`, `admin-session.ts` | SHA-256 hash + HMAC cookie |
| **Desktop** | Packaged Electron App | Done | `electron/main.ts` | Tray, background server, updater |
| **Online** | 2embed Catalog Scraper | Partial | `lib/2embed.ts`, `discover/` | Dependent on external 2embed API |
| **Casting** | Google Cast Integration | Partial | `CastButton.tsx`, `layout.tsx` | Requires valid Cast receiver ID |
| **Setup Route**| First-Time Setup Wizard | Incomplete | `app/(main)/setup/` | Empty folder; wizard built into Home |

---

## 15. Known Bugs, Limitations, and Tech Debt

1. **Unused Setup Directory (`(incomplete)`)**:
   - `app/(main)/setup` is an empty folder in the repository. Onboarding was integrated directly into `HomeContent.tsx` / `HeroFeatured.tsx` but the empty directory remains.
2. **Audio Track Switch Latency**:
   - Switching audio tracks on an `.mp4` file forces a switch to the HLS transcoding pipeline (`needsTranscode = true`), causing a 2–3 second buffering delay while FFmpeg initializes.
3. **P2P WebRTC Mesh Scalability Limit**:
   - Because WebRTC voice uses a mesh topology ($N \times (N - 1)$ connections), watch party voice chat performance degrades beyond 4–6 participants.
4. **No Server-Side Transcode Quality Ladder**:
   - Transcoding produces a single resolution output stream matched to source resolution (`-qp 26` / `-crf 26`). There is no multi-bitrate ladder (720p, 480p) for bandwidth-constrained remote connections.
5. **OpenSubtitles Query Rate Limits**:
   - Subtitle searching relies on OpenSubtitles.com REST API. Without a personal API key configured in Settings, searches fail with missing key errors.
6. **TV Player Controls Simplicity**:
   - While `TVBrowser.tsx` has full D-pad grid focus, `TVPlayer.tsx` is a barebones HTML video wrapper that lacks the advanced subtitle and audio menus present in `NetflixPlayer.tsx`.
7. **Single Active Transcode per Client Slot**:
   - Rapid seeking on an HLS stream kills the prior FFmpeg process before spawning a new one. On slower CPUs, rapid repeated scrubbing can cause segment 503 timeouts.

---

## 16. Marketing-Ready Highlights

1. **"Instant Hardware-Accelerated Transcoding"**: Automatically leverages Nvidia NVENC, Intel Quick Sync, and Linux VAAPI to transcode heavy MKVs and 10-bit HEVC video on-the-fly with near-zero CPU usage.  
   *Demo Scenario: Play a 4K 10-bit HEVC MKV movie on a low-powered laptop browser; observe immediate playback with GPU hardware decode active.*
2. **"Synchronized Watch Parties with Sub-Second Precision"**: Watch movies simultaneously with friends worldwide featuring automatic drift compensation and post-seek synchronized resumes.  
   *Demo Scenario: Open two browser windows side by side; pause on one window and watch the second window halt within 300 ms.*
3. **"Built-In WebRTC Mesh Voice Chat"**: Talk with your friends during movie night directly in the browser with Voice Activity Detection and zero external software required.  
   *Demo Scenario: Join a watch party, hit the `V` key, speak into your mic, and watch the green speaking ring pulse around your avatar.*
4. **"Zero-Cloud, Pure Local Sovereignty"**: Your media, watched history, passwords, and metadata remain strictly on your own physical hardware—no accounts, no subscriptions, no tracking.  
   *Demo Scenario: Disconnect the host PC from the public internet; watch entire library and playback pipeline continue operating flawlessly over local Wi-Fi.*
5. **"Graceful Offline Disk Handling"**: Unplug an external USB hard drive without breaking your database; media remains indexed with elegant grayscale offline badges until reconnected.  
   *Demo Scenario: Eject an external USB drive; refresh the home screen to see the media card clearly labeled 'Offline' without database corruption.*
6. **"Dynamic Subtitle Matcher & In-Player Downloader"**: Search, download, and sync subtitles directly from inside the video player without leaving your couch.  
   *Demo Scenario: Open Subtitle menu during playback, search 'Spanish', click download, and see subtitles appear immediately on screen.*
7. **"Living Room Native on LG Smart TVs"**: Install the native webOS IPK on your LG TV for seamless Magic Remote D-pad navigation and living room streaming.  
   *Demo Scenario: Navigate the TV browser using only remote control arrow keys; select a show and launch playback smoothly.*
8. **"Drag-and-Drop Episode & Season Re-Organizer"**: Seamlessly transform loose, disorganized video files into structured, multi-season TV series with custom names.  
   *Demo Scenario: Select 3 disparate video clips, open 'Group as Series', drag them into 'Season 1', and create a unified series page instantly.*
9. **"Dynamic Ambient Glassmorphism UI"**: A sleek, Netflix-grade interface featuring ambient background lighting that extracts colors dynamically from active movie posters.  
   *Demo Scenario: Hover over different movie posters on the home screen; watch the entire background subtly tint to match each film's palette.*
10. **"Floating Scrub Bar with Frame Previews"**: Hover over the playback progress bar to see instant video frame thumbnails and exact timestamps before seeking.  
    *Demo Scenario: Move the mouse across the progress scrubber to see fluid live thumbnail previews generated on-the-fly.*

---

## 17. Verification Audit Trail

All data in this specification has been verified by directly analyzing the source code:
- Package versions: [package.json](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/package.json)
- Transcoding flags & hardware probes: [lib/gpu-detect.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/gpu-detect.ts), [app/(main)/api/hls/[mediaId]/[audioTrack]/[start]/[file]/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/hls/%5BmediaId%5D/%5BaudioTrack%5D/%5Bstart%5D/%5Bfile%5D/route.ts)
- Sockets, synchronization ticks, ready check: [server.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/server.ts), [app/(main)/watch/[roomCode]/page.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/watch/%5BroomCode%5D/page.tsx)
- WebRTC mesh voice chat: [hooks/useVoiceChat.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/hooks/useVoiceChat.ts), [app/(main)/api/turn-config/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/turn-config/route.ts)
- Custom player & gestures: [components/Player/MediaPlayer.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/MediaPlayer.tsx), [components/Player/usePlayer.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/usePlayer.ts), [components/Player/ProgressBar.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Player/ProgressBar.tsx)
- Smart TV webOS package: [application/webos-app/appinfo.json](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/application/webos-app/appinfo.json), [app/(tv)/tv/TVBrowser.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28tv%29/tv/TVBrowser.tsx), [tv-cors.cjs](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/tv-cors.cjs)
- Database schema & migrations: [lib/db.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/db.ts), [db/schema.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/db/schema.ts)
- Security & PIN authentication: [lib/admin-session.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/lib/admin-session.ts), [app/(main)/api/admin/verify-pin/route.ts](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/api/admin/verify-pin/route.ts), [components/AdminPinGate.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/AdminPinGate.tsx)
- Design tokens & glassmorphism: [app/(main)/globals.css](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/app/%28main%29/globals.css), [components/Toast.tsx](file:///c:/Users/krish/OneDrive/Documents/code%20Manish/local-media-server-main/components/Toast.tsx)

*Zero `.md` documentation files were read or referenced in the production of this specification.*
