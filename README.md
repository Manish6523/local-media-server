# VidLock

A self-hosted, **fully local, Netflix-style** media library and player.
Point it at a folder of movies and shows, hit scan, and get a clean browsing UI, hardware-accelerated streaming, subtitles, watch progress, favorites, and synced **LAN watch parties** — all from one Node process on your own machine.

No cloud. No accounts. No internet required after the initial metadata fetch.

---

## Features

- **Library scanner** — recursively walks a local folder and an optional external HDD, parses filenames into title / season / episode, and enriches them with posters, backdrops, plot, rating, year, and genres.
- **Movies & Shows browsers** — sortable grids (rating, year, recently added, A→Z), genre filtering, dedup by series, season tabs, episode lists.
- **Player** — HTML5 + HLS.js, range-streaming for MP4, on-the-fly FFmpeg transcoding for `.mkv` / `.avi` / `.wmv` / 10-bit HEVC. Hardware-accelerated via NVENC → VAAPI → QSV → CPU fallback (autodetected at boot).
- **Subtitles** — external `.srt` (auto-converted to WebVTT) and `.vtt`, embedded tracks via FFmpeg, with size and color controls.
- **Multi audio tracks** — switch between dubs/commentaries on the fly.
- **Continue watching** — per-file watch progress, auto-marks watched at ≥90%, next-episode prefetch.
- **Favorites** — star anything, dedicated page.
- **Watch Party** — host a room with a 6-character code, anyone on your LAN can join via URL or QR code. Host controls play/pause/seek; everyone stays in sync with NTP-style clock correction and a ready-check protocol. In-room chat included.
- **TV / webOS mode** — LG webOS and NetCast browsers auto-redirect to a lightweight `/tv` UI.
- **Admin PIN** — optional SHA-256-gated lock for settings and edit actions.
- **Custom titles & posters** — fix any metadata the parser got wrong, override poster/backdrop with your own image URL.

For deep architecture, API routes, internals, and extension points, see [DOCUMENTATION.md](./DOCUMENTATION.md).

---

## Requirements

- **Node.js 20+**
- **FFmpeg + ffprobe** on your `PATH` (required for transcoding, audio/subtitle probing, and GPU detection)
- **Build tools** for `better-sqlite3` to compile native bindings:
  - Debian/Ubuntu: `sudo apt install build-essential python3`
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: `npm install --global windows-build-tools`
- An **OMDB API key** (free, instant)
- A **Fanart.tv API key** (free, optional — without it, only OMDB posters show up)

OS support: Linux is the primary target (VAAPI device paths assume `/dev/dri/renderD12{8,9}`). macOS and Windows work fine on NVENC or CPU fallback.

---

## Getting API keys

### 1. OMDB (required)

OMDB provides plot, rating, year, runtime, genres, and posters.

1. Go to **<https://www.omdbapi.com/apikey.aspx>**
2. Pick the **FREE** tier (1,000 requests/day — plenty for a personal library).
3. Enter your email; OMDB will email you the key — click the verification link.
4. Copy the key (looks like `90a745e1`) — this goes into `OMDB_API_KEY`.

VidLock caches every successful OMDB response in SQLite forever. Once your library is scanned, you'll basically never hit the API again.

### 2. Fanart.tv (optional, recommended)

Fanart.tv provides high-resolution backdrops, used for the hero carousel and detail page backgrounds.

1. Create a free account at **<https://fanart.tv/register/>**
2. Go to **<https://fanart.tv/get-an-api-key/>** (requires login).
3. Request a **Personal API key** — it's instant.
4. Copy the key (a 32-character hex string) — this goes into `FANART_TV_API_KEY`.

Without this, the app still works — you just won't get nice backdrops, only OMDB posters.

---

## Installation

```bash
git clone <repo-url> vidlock
cd vidlock
npm install
```

`npm install` will compile `better-sqlite3`. If it fails, install the build tools listed above and retry.

---

## Configuration

Create `.env.local` in the project root:

```dotenv
OMDB_API_KEY=your_omdb_key_here
FANART_TV_API_KEY=your_fanart_key_here
LOCAL_MEDIA_PATH=/path/to/your/media/
HDD_PATH=/run/media/<user>/HDD/
```

| Variable | Required | What it does |
| --- | --- | --- |
| `OMDB_API_KEY` | yes | Fetches plot/rating/year/poster from OMDB. |
| `FANART_TV_API_KEY` | no | Fetches backdrops from Fanart.tv. Omit to skip backdrops. |
| `LOCAL_MEDIA_PATH` | yes | Your primary media folder. Scanned recursively. |
| `HDD_PATH` | no | An external/secondary path (e.g. an HDD mount). If unplugged at scan time, items from this path are flagged `available=0` instead of deleted. |

Both paths are **also** stored in the SQLite `config` table — you can change them later in **Settings** without touching `.env.local`.

`PORT` defaults to `3000`. Override with `PORT=4000 npm start` if needed.

---

## Running

```bash
npm run dev      # development: tsx server.ts (clears terminal first)
npm run build    # production build: next build
npm start        # production: NODE_ENV=production tsx server.ts
npm run lint     # eslint
```

> The app uses a **custom Node server** (`server.ts`) to mount Socket.IO and serve `public/posters/*` and `public/backdrops/*` directly. Don't run `next start` — always use `npm start`, otherwise posters added after `next build` won't be served.

Open <http://localhost:3000>.

---

## First-run walkthrough

1. Start the server: `npm run dev`.
2. Open <http://localhost:3000>.
3. Go to **Settings**:
   - Set **Local Path** (e.g. `/home/me/media/`).
   - Optionally set **HDD Path**.
   - Click **Save**, then **Scan now**.
4. The scan walks both paths, parses filenames into structured metadata, fetches OMDB once per unique show/movie, downloads posters into `public/posters/` and backdrops into `public/backdrops/`, and writes everything to `db/media.db`.
5. Back to `/` — Home, Movies, Shows, and Favorites are populated.

Subsequent scans are incremental: known files with confirmed OMDB IDs are skipped, only new ones trigger metadata fetches.

### Filename tips

The parser handles most common naming patterns:

- `Show.S01E01.1080p.x265.mkv`
- `Show - S03 E04.mkv`
- `Show.S2E03-05.mkv` (multi-episode)
- `02E01 - Episode Title.mkv` (no S prefix)
- `01. Episode Title.mkv` (numbered prefix)
- `[03 - Hell's Paradise S02].mkv`
- Movies: anything without an episode pattern, e.g. `The Matrix (1999) 1080p.mkv`

Junk tags like `1080p`, `x265`, `BluRay`, `YIFY`, scene release groups, country codes (`US`, `UK`), and surrounding brackets are stripped automatically.

If the parser gets a title wrong, click **Edit title** on any card to override it.

---

## Watch Party (LAN co-watching)

1. On any movie or episode card, click **Start Watch Party**.
2. You'll get a 6-character room code (e.g. `K7QP9R`) and a QR code.
3. Share `http://<your-lan-ip>:3000/join/<code>` with anyone on the same network, or have them scan the QR.
4. Once everyone's in the lobby, the host clicks **Start** — all clients jump to `/watch/<code>` and start in sync.
5. The host controls play / pause / seek. After every seek, the server pauses everyone, waits up to 15s for each guest's video to finish buffering, then resumes everyone together.
6. There's a 200-char chat panel in the corner.

Clock sync uses an NTP-style handshake on connect: each client averages 5 round-trip ping/pongs to compute an offset against the server clock, so play events fire at the same wall-clock moment on all devices.

---

## TV / webOS mode

If you open the site on an LG webOS TV or other NetCast browser, the middleware (`proxy.ts`) automatically redirects you from `/` to `/tv`. The `/tv` route group is a stripped-down, remote-friendly UI designed for cursor navigation.

---

## Admin PIN (optional)

To lock down settings and edit actions:

1. Go to **Settings** → **Set Admin PIN**.
2. Enter a PIN. It's stored as a SHA-256 hash in the `config` table.
3. From then on, opening **Settings** or the **Edit title** modal prompts for the PIN.
4. Once verified, the PIN is remembered for that browser session (via `sessionStorage`).
5. Forgot it? Delete the `admin_pin_hash` and `admin_pin_enabled` rows from `db/media.db`'s `config` table.

> **Note:** The PIN gates the UI, not the API. If you're exposing VidLock beyond your LAN, you need to add real auth — see [DOCUMENTATION.md §26](./DOCUMENTATION.md#26-extending-vidlock).

---

## GPU acceleration

At boot, VidLock probes FFmpeg encoders in this order and uses the first that works:

1. **NVENC** (NVIDIA)
2. **VAAPI** (Intel/AMD on Linux, via `/dev/dri/renderD128` or `D129`)
3. **QSV** (Intel Quick Sync)
4. **libx264** (CPU fallback)

The detected encoder shows up in **Settings → System**, and every transcode job uses it automatically. 10-bit HEVC is detected via `ffprobe` and converted in-GPU on the VAAPI path.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `better-sqlite3` build error during install | Install platform build tools (see [Requirements](#requirements)) and retry `npm install`. |
| Scan finds 0 files | Check `LOCAL_MEDIA_PATH`. Use **Settings → Validate path** to see the video count. |
| Posters not showing in production | Make sure you used `npm start`, not `next start`. The custom server is required to serve files added to `public/` after build. |
| `.mkv` playback stalls or is super slow | GPU encoding probably fell back to CPU. Check `[GPU]` lines in the server log on startup. If you're on CPU with weak hardware, transcoding `1080p` HEVC in real time may not be feasible. |
| Watch party guests drift out of sync | NTP handshake happens once on connect — refresh the guest tab to recompute the offset. |
| HDD items missing | Plug in the drive, re-scan. Existing entries flip back to `available=1`. |
| Forgot the admin PIN | `sqlite3 db/media.db "DELETE FROM config WHERE key IN ('admin_pin_hash', 'admin_pin_enabled');"` |
| OMDB returns wrong movie | Click **Edit title** on the card and set the correct title — re-scan will re-fetch. |

---

## Project structure (short version)

```
vidlock/
├── server.ts              Custom Node HTTP server + Socket.IO + static poster serving
├── proxy.ts               Next middleware (webOS UA → /tv redirect)
├── app/(main)/            Main UI + all API routes
├── app/(tv)/tv/           Lightweight TV/webOS variant
├── components/            React UI (cards, player, watch party, shadcn primitives)
├── lib/                   db.ts, scanner.ts, parser.ts, omdb.ts, fanart.ts, gpu-detect.ts
├── hooks/useWatchParty.ts Socket-state hook for co-watching
├── db/media.db            SQLite database (WAL mode)
└── public/posters,backdrops/   Downloaded image cache (gitignored)
```

Full layout, internal API surface, schema, and event matrix in [DOCUMENTATION.md](./DOCUMENTATION.md).

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **Custom Node HTTP server** with **Socket.IO** for watch parties
- **SQLite** via **better-sqlite3** + **Drizzle ORM** (single file at `db/media.db`)
- **FFmpeg + ffprobe** for transcoding, probing, GPU detection
- **HLS.js** for browser playback of transcoded segments
- **Tailwind CSS 4** + **shadcn/ui** + **framer-motion**
- **OMDB API** for metadata, **Fanart.tv API** for backdrops

---

## License

Personal-use project. Add a `LICENSE` file before redistributing.
