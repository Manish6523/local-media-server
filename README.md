<p align="center">
  <img src="assets/withoutbg.png" width="220" alt="VidLock" />
</p>

<h1 align="center">VidLock</h1>
 
<p align="center">
  <em>No cloud. No accounts. No subscriptions. Just your media, beautifully presented.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Manish6523/local-media-server?style=flat-square&color=111111&label=stars" alt="GitHub Stars">
  <img src="https://img.shields.io/github/v/release/Manish6523/local-media-server?style=flat-square&color=111111&label=release" alt="Latest Release">
  <img src="https://img.shields.io/badge/Next.js-16-111111?style=flat-square&logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-111111?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/FFmpeg-Required-111111?style=flat-square&logo=ffmpeg" alt="FFmpeg">
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-111111?style=flat-square&logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT License">
</p>

<p align="center">
  <strong>Local-first &middot; Premium UI &middot; Hardware transcoding &middot; LAN watch parties</strong><br>
  <sub>
    A self-hosted, Netflix-style media server for your local movie and TV library.
    VidLock runs from a single Node.js process with no external database, Redis server,
    authentication provider, or cloud storage.
  </sub>
</p>

<p align="center">
  <a href="#-why-vidlock">Why VidLock?</a> &middot;
  <a href="#-features">Features</a> &middot;
  <a href="#-quick-start">Quick Start</a> &middot;
  <a href="#-watch-party">Watch Party</a> &middot;
  <a href="#-tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="assets/hero.png" alt="VidLock Dashboard" width="100%" />
</p>

https://github.com/user-attachments/assets/c1466194-9340-40f9-a5b9-6f6949c12d7d

---

## ✨ Why VidLock?

VidLock is built for people who want a polished streaming experience for video files they already own — without uploading their library to the cloud or maintaining a complicated media-server stack.

Point VidLock at your movie and TV folders, run a library scan, and it will:

* Recursively discover supported video files
* Parse movie, show, season, and episode information from filenames
* Fetch metadata from OMDB
* Fetch optional backdrops through Fanart.tv
* Cache metadata locally
* Download posters and backdrops locally
* Track watch progress and favorites
* Direct-play browser-compatible files
* Transcode unsupported formats with FFmpeg
* Synchronize playback across LAN devices with Watch Party

Everything lives on your machine.

Your media files stay where they already are, metadata is stored in SQLite, and downloaded artwork is cached locally.

> Internet access is only needed when VidLock needs to fetch external metadata or artwork.

---

## 🚀 Features

<table>
  <tr>
    <td width="50%">
      <h3>📚 Smart Local Library</h3>
      <p>
        VidLock recursively scans your configured local folders and optional external HDD,
        parses real-world media filenames, and converts them into structured movie and TV metadata.
      </p>
      <p>
        Known files are reused on later scans, helping reduce unnecessary metadata requests.
      </p>
    </td>
    <td width="50%">
      <img src="./assets/library.png" alt="VidLock Library" width="100%" />
    </td>
  </tr>

  <tr>
    <td width="50%">
      <img src="./assets/player.png" alt="VidLock Player" width="100%" />
    </td>
    <td width="50%">
      <h3>▶️ Cinematic Player</h3>
      <p>
        A custom HTML5 and HLS.js playback experience with direct streaming,
        on-the-fly transcoding, accurate seeking, subtitle support,
        audio-track switching, watch-progress tracking, and fullscreen playback.
      </p>
    </td>
  </tr>

  <tr>
    <td width="50%">
      <h3>🎉 LAN Watch Parties</h3>
      <p>
        Create a room, share its 6-character code or QR link, and watch together
        with other devices on the same network.
      </p>
      <p>
        VidLock synchronizes play, pause, and seek events using Socket.IO,
        server timestamps, network clock-offset estimation, drift correction,
        and a ready-check system after seeking.
      </p>
    </td>
    <td width="50%">
      <img src="./assets/watch-party.png" alt="VidLock Watch Party" width="100%" />
    </td>
  </tr>
</table>

### 💎 More Highlights

* **Hardware Acceleration**
  VidLock detects available FFmpeg encoders at startup and attempts:

  `NVENC → VAAPI → QSV → CPU`

* **Smart Direct Play**
  Browser-friendly media can be streamed directly using HTTP Range requests instead of being unnecessarily transcoded.

* **HLS Transcoding**
  Unsupported formats can be transcoded into HLS streams on demand.

* **10-bit HEVC Handling**
  The transcoding pipeline can detect 10-bit HEVC and handle the conversion required by supported GPU pipelines.

* **Multiple Audio Tracks**
  FFprobe discovers available audio streams and allows the player to switch tracks.

* **Subtitle Support**
  Supports external `.srt` / `.vtt` files as well as embedded subtitle streams extracted through FFmpeg.

* **Continue Watching**
  Playback progress is stored per media file and updated while watching.

* **Automatic Watched State**
  Media is automatically marked watched after reaching at least 90% playback progress.

* **Favorites**
  Favorite movies and episodes and access them through a dedicated Favorites page.

* **Offline HDD Handling**
  If an external drive is disconnected, VidLock can mark its media unavailable instead of immediately removing the library entries.

* **TV / webOS Mode**
  LG webOS and NetCast browsers can automatically enter the lightweight `/tv` interface.

* **Admin PIN**
  Protect settings and selected editing actions using an optional PIN.

* **QR Sharing**
  Generate a QR code pointing to VidLock's LAN address for easier access from phones and other devices.

---

## 🎉 Watch Party

VidLock includes real-time LAN co-watching powered by Socket.IO.

### How it works

```text
Host creates room
        │
        ▼
6-character room code
        │
        ▼
Guests join from /join/<roomCode>
        │
        ▼
Host starts the party
        │
        ▼
All clients open /watch/<roomCode>
        │
        ▼
Play / Pause / Seek synchronized
```

### Synchronization

When a client connects, VidLock performs multiple ping/pong measurements to estimate the difference between the client's clock and the server's clock.

Playback events can then include a server timestamp so clients schedule playback against a common time reference.

During playback, the server also sends synchronization heartbeats.

### Seek Ready Check

Seeking introduces an additional synchronization step:

```text
Host seeks
   ↓
Playback pauses
   ↓
Guests buffer new position
   ↓
Each guest reports READY
   ↓
Server waits for everyone
   ↓
Playback resumes
```

A timeout prevents a slow or disconnected client from blocking the room indefinitely.

### Party Features

* 6-character room codes
* QR-code joining
* Host-controlled playback
* Play / pause synchronization
* Seek synchronization
* Network clock-offset estimation
* Playback heartbeat
* Buffer ready-check
* Host transfer after disconnect
* Member list
* In-room chat
* Reconnection support

---

## ⚡ Quick Start

### Requirements

Before installing VidLock, make sure you have:

* **Node.js 20+**
* **FFmpeg**
* **ffprobe**
* Platform build tools if required by `better-sqlite3`
* An **OMDB API key**
* Optionally, a **Fanart.tv API key**

### 1. Clone the repository

```bash
git clone https://github.com/Manish6523/local-media-server.git
cd local-media-server
```

### 2. Install dependencies

```bash
npm install
```

`better-sqlite3` uses native bindings and may require platform build tools during installation.

For Debian / Ubuntu:

```bash
sudo apt install build-essential python3
```

### 3. Configure environment variables

Create:

```text
.env.local
```

Example:

```dotenv
OMDB_API_KEY=your_omdb_key_here
FANART_TV_API_KEY=your_fanart_key_here

LOCAL_MEDIA_PATH=/path/to/your/media/
HDD_PATH=/path/to/optional/external/drive/
```

`FANART_TV_API_KEY` and `HDD_PATH` are optional depending on the features you want to use.

### 4. Start VidLock

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

Then open:

```text
http://localhost:3000
```

---

## ⚙️ First Run

After starting VidLock:

1. Open `http://localhost:3000`
2. Go to **Settings**
3. Configure your local media folder
4. Optionally configure an external HDD folder
5. Save the settings
6. Click **Scan now**
7. Return to the home page

VidLock will scan your folders, parse your filenames, fetch available metadata, cache artwork locally, and populate your Movies and Shows libraries.

---

## 📝 Filename Support

VidLock includes a filename parser designed around real-world media libraries.

Examples:

```text
Breaking.Bad.S01E01.mkv
The.Boys.S05E03.mkv
Attack.on.Titan.S04E10.mp4
Show.S02E03-05.mkv
Show.S03.E04.mkv
Show.S01-E05.mkv
02E01.mkv
E01.mkv
```

Common release tags such as resolution, codec, source, and release-group noise are stripped during parsing.

Files that don't match an episode pattern are treated as movies.

---

## 🎬 Streaming Architecture

VidLock chooses a playback strategy depending on the media format.

```text
Media File
    │
    ├── Browser compatible
    │       │
    │       └── HTTP Range Stream
    │
    └── Requires conversion
            │
            ├── HLS Transcode
            │
            └── Fragmented MP4 Transcode
                     │
                     ▼
                   FFmpeg
```

VidLock also uses FFprobe to inspect:

* Duration
* Video codec
* Audio streams
* Subtitle streams
* Container information
* 10-bit HEVC streams

---

## ⚡ Hardware Acceleration

At application startup, VidLock probes available FFmpeg encoders.

Detection order:

```text
NVIDIA NVENC
     ↓
Linux VAAPI
     ↓
Intel QSV
     ↓
CPU libx264
```

The first working encoder is cached and reused by the transcoding routes.

If no compatible hardware encoder is detected, VidLock falls back to CPU transcoding using `libx264`.

---

## 💾 Local-First Storage

VidLock does not require PostgreSQL, MongoDB, Redis, Firebase, Supabase, or an external database server.

Persistence uses:

```text
db/media.db
```

with:

* SQLite
* `better-sqlite3`
* Drizzle ORM
* WAL mode

The database stores:

* Media assets
* Movies
* TV shows
* Episodes
* Watch progress
* Watched status
* Favorites
* Configuration

Artwork is cached locally under:

```text
public/posters/
public/backdrops/
```

---

## 📺 TV / webOS Mode

VidLock includes a lightweight interface intended for television browsers.

Supported user-agent detection currently includes:

```text
Web0S
NetCast
```

When one of these browsers opens `/`, VidLock redirects it to:

```text
/tv
```

The TV interface uses a simplified layout better suited to constrained smart-TV browsers and remote-control navigation.

---

## 🔐 Admin PIN

VidLock can optionally protect administrative UI actions with a PIN.

The PIN is hashed using SHA-256 before being stored in the local configuration database.

After successful verification, the browser remains unlocked for the current session through `sessionStorage`.

> VidLock is designed for trusted local networks. The Admin PIN should not currently be treated as full authentication for safely exposing the server to the public internet.

---

## 🛠️ Tech Stack

### Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS 4
* Framer Motion
* shadcn/ui
* HLS.js

### Backend

* Custom Node.js HTTP server
* Next.js App Router
* Socket.IO
* FFmpeg
* ffprobe

### Database

* SQLite
* better-sqlite3
* Drizzle ORM
* WAL mode

### Metadata

* OMDB
* Fanart.tv
* TVMaze lookup for TVDB mapping

---

## 🏗️ Architecture

```text
                    ┌───────────────────────────────┐
                    │        VidLock Server         │
                    │       Single Node Process     │
                    └───────────────┬───────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼

      Next.js App Router      Socket.IO Server       FFmpeg / ffprobe
              │                     │                     │
              │                     │                     │
              ▼                     ▼                     ▼

        Web Interface         Watch Parties        Media Processing
              │
              ▼
       SQLite + Drizzle
              │
              ▼
          media.db
```

There is no separate:

* Database server
* Redis instance
* Authentication provider
* Media worker service
* Cloud media storage

---

## 📁 Local Data

VidLock creates and uses several local directories:

```text
db/media.db
public/posters/
public/backdrops/
```

Temporary HLS transcoding files are stored under:

```text
/tmp/filmaro-cache/
```

Temporary transcoding data is cleaned automatically during startup/shutdown and after idle periods.

---

## 🐛 Troubleshooting

| Issue                                     | Solution                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **`better-sqlite3` fails during install** | Install your platform's native build tools. On Debian/Ubuntu: `sudo apt install build-essential python3`. |
| **Scan finds 0 files**                    | Verify the configured media path and make sure your files use supported video extensions.                 |
| **Posters don't appear in production**    | Run `npm start`, which starts VidLock's custom server. Do not use bare `next start`.                      |
| **MKV playback is slow**                  | Check the server's GPU detection logs. VidLock may have fallen back to CPU transcoding.                   |
| **Watch Party drifts**                    | Refresh the affected guest client so its network clock offset is recalculated.                            |
| **External HDD media appears offline**    | Reconnect the HDD and scan the library again.                                                             |
| **Forgot Admin PIN**                      | Remove `admin_pin_hash` and `admin_pin_enabled` from the SQLite `config` table.                           |

---

## 📖 Documentation

VidLock includes detailed project and codebase documentation covering:

* Installation
* Environment configuration
* Filename parsing
* GPU acceleration
* Watch Party protocol
* TV mode
* SQLite schema
* API routes
* Player pipeline
* React components
* Socket.IO events
* Data-flow diagrams
* Extension points

See:

[DOCUMENTATION.md](./DOCUMENTATION.md)

---

## ⚠️ Network Security

VidLock is designed primarily for use on a **trusted local network**.

The current application does not provide full per-user authentication, and some administrative API routes are not protected server-side by the Admin PIN.

Do **not** expose VidLock directly to the public internet without adding an authentication and authorization layer.

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome.

If you're making changes to areas such as:

* Filename parsing
* FFmpeg transcoding
* GPU detection
* Watch Party synchronization
* TV compatibility

please test the affected workflow before submitting a pull request.

---

## 📄 License

VidLock is licensed under the **MIT License**.

---

<div align="center">

### Your media. Your hardware. Your network.

**No cloud. No accounts. No subscriptions.**

Built with ❤️ for local media collectors.

</div>
