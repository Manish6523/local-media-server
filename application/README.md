> This TV project lives in the server repository under `application/`.
> Run the commands below from `application/`. The server remains at the repository root.
> Package only `webos-app/`, never the entire repository.
> For future TV changes, edit this copy so Git tracks them alongside the server.

From the repository root:

```powershell
cd application
ares-package --no-minify ./webos-app
```

Generated IPK files and test previews are ignored by this folder's `.gitignore`.
Server and TV releases remain separate; a server restart does not install a new TV package.

# VidLock for LG webOS TV

A packaged 1920×1080 TV web app targeting webOS 3.x / Chromium 38. The app uses ES5 JavaScript, XMLHttpRequest, native HTML video, and a local Socket.IO 4.8.3 browser bundle. There is no React, Enact, bundler, iframe, or HTML scraping. LG identifies webOS 3.x as Chromium 38; the earlier 1.x/2.x packaged app engines are different and are not the compatibility target. [LG engine matrix](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine).

## Files and behavior

- `webos-app/appinfo.json`: application ID `com.manish6523.vidlock`, version `1.0.0`, resolution `1920x1080`.
- `index.html`, `app.js`, `styles.css`: setup, home, detail, player, and party dialogs in one document.
- `focus.js`: scoped spatial navigation, horizontal row ordering, geometric vertical movement, scroll reveal, pointer support, and focus restoration.
- `adapter.js`: the verified VidLock API and event contract, grouping, episode sorting, and playback selection.
- `vendor/socket.io.min.js`: pinned standalone client copied from your installed server dependencies, with its MIT license. Socket.IO documents this browser bundle and compatibility with 3.x/4.x servers. [Socket.IO installation](https://socket.io/docs/v4/client-installation/).
- `icon.png`, `largeIcon.png`: packaged application icons.

The server address is stored under `vidlock_server_url`. Use the server computer's LAN address, such as `http://192.168.1.100:2886`; `localhost` on the TV refers to the TV itself.

Home loads five JSON endpoints concurrently. Each failure is displayed with Retry while successful sections remain usable. Posters load near the viewport, and rows initially render up to 30 cards with a Show more button. Hero items rotate every eight seconds except while hero focus, a modal, or app backgrounding pauses rotation. Continue Watching uses `watch_progress` in seconds and `runtime * 60` for its approximate total; playing a title obtains `exactDuration` from the server. A progress bar cannot be calculated when duration is absent, so the card still shows elapsed time.

## Your actual server contract

The implementation was checked against `local-media-server-main/server.ts` and `app/(main)/api` in the local checkout you supplied. Some requested URLs do not exist in that version:

| Operation | Existing server contract used by the app |
| --- | --- |
| Home collections | GET `/api/recently-added`, `/api/continue-watching`, `/api/favorites` → arrays |
| Full library | GET `/api/media` → flat media/episode array |
| Genre names | GET `/api/genres` → string array |
| Detail and exact duration | GET `/api/media?id=123` → media object with `exactDuration` |
| Progress | PUT `/api/watch-progress` with `{id, currentTime, duration}` |
| Native HLS | `/api/hls/123/0/120/playlist.m3u8` |
| Direct file | `/api/stream?id=123` with range requests |
| Codec probe | GET `/api/media-info?id=123` |
| Audio | GET `/api/audio-tracks?id=123` → `{index, label, language, codec}[]` |
| Subtitles | GET `/api/subtitles?id=123` → `{label, language, url}[]` |

`GET /api/media/[id]` is absent: that route implements metadata editing via PUT. `/api/media` ignores `grouped` and `genre` query parameters. The TV therefore groups shows by `omdb_id` or title and filters the returned JSON by genre. Seasons and episodes are assembled from the flat show entries using `season`, `episode_start`, and `episode_end`. The HLS handler starts encoding only for `playlist.m3u8`; using `master.m3u8` would fail. These differences are handled in the client instead of adding duplicate server endpoints.

Progress is saved every 15 seconds, on player exit, pause, and backgrounding. A local retry record survives network failures. The server deliberately ignores positions below five seconds and marks entries watched at 90%; the TV preserves that behavior. Hard power loss can lose the most recent interval.

## Remote controls

| Context | Controls |
| --- | --- |
| Home/detail/dialog | Arrows move focus; OK activates; Back returns/closes |
| Text field | OK opens editing/TV keyboard; OK or Back finishes editing; arrows then navigate |
| Player, controls hidden | OK toggles pause; Left/Right seek −/+10 seconds; Up opens controls |
| Player controls | Arrows navigate buttons; OK activates a button; Close controls returns to transport shortcuts |
| Player Back, keycode 461 | Saves progress, releases video, leaves the party if present, returns to detail |
| Blue, keycode 406 | Toggles party text chat |
| Desktop testing | Escape substitutes for Back |

Audio selection reloads native HLS with the API's zero-based audio index at the same absolute position. HLS `/start/` creates a fresh relative media timeline, so the player adds that offset exactly once for resume, seeking, sync, and progress. Seeking outside the current native seekable range requests a new HLS URL. Track selection preserves play/pause intent.

Subtitles use the returned WebVTT endpoints, rendered as plain text against absolute file time. This avoids native `<track>` becoming misaligned after a nonzero HLS restart. Styling, WebVTT positioning/regions, and bitmap subtitle formats are not implemented; PGS/DVD subtitles require a server conversion/burn-in path. No subtitle HTML is injected into the page.

## Watch parties

Choose Watch Party on Home, enter your name, then select a title to create a room or enter a six-character room code to join. The server generates the code. Share the displayed code with phone/web clients. A host chooses Start watching; guests wait in the lobby. The TV supports late join approval, rejection, cancellation, reconnect, host transfer, buffering readiness, and chat. A show party is tied to one playable episode ID, matching the server.

The client uses the server's exact payloads:

```js
socket.emit('create-room', {mediaId: 123, hostName: 'TV-1234'}, callback);
socket.emit('join-room', {roomCode: 'ABC234', guestName: 'TV-1234'}, callback);
socket.emit('playback-event', {roomCode: 'ABC234', type: 'seek', currentTime: 120});
socket.emit('member-ready', {roomCode: 'ABC234'});
socket.emit('chat-message', {roomCode: 'ABC234', text: 'Hello'});
```

Playback comes from `playback-sync`, `sync-tick`, `waiting-for-ready`, and `all-ready`; chat arrives as `new-message`. Only the host emits playback commands. Remote changes never echo as new commands. Play scheduling uses the server's timestamps with a ping-derived clock offset, while periodic sync corrects drift above two seconds. This is event synchronization, not frame-accurate playback. There is no WebRTC or microphone access.

The server has no `leave-room` handler; leaving disconnects the socket so its existing disconnect cleanup runs. Reconnect uses `rejoin-room` with the same name and accepts the role returned by the server. If disconnect removed the last member, the server deleted the room and it cannot be restored. Use distinct member names because the server's rejoin lookup is name-based.

## Server changes applied with approval

Two small integration fixes were applied to the server checkout:

1. Both `server.ts` and the `server.js` used by `npm run dev` call `tv-cors.cjs`. It permits the packaged app's `Origin: null` on the TV's read endpoints and watch-progress PUT, and answers their preflights. It does not enable cross-origin admin writes. Existing socket CORS remains unchanged. Originals are saved as `server.ts.before-tv-cors` and `server.js.before-tv-cors`.
2. The HLS route no longer kills another active media/audio encoder simply because a different start position is requested. Other party clients may still need that encoder. The existing ten-minute idle cleanup remains; the original route is saved beside it as `route.ts.before-tv-party`. Multiple active start positions can consume more CPU/GPU capacity, so monitor the server during multi-client HLS testing.

Restart the server to load CORS changes. Production/Electron builds must rebuild the Next routes and include `tv-cors.cjs` alongside the server entry point. No running server was restarted and no existing deployment was rebuilt by this task. Reapplication scripts are in `server-support`; they check their anchors and preserve originals. Restore backups only after reviewing any later edits.

For desktop HTTP testing, add the exact test origin to the server's environment before starting it, for example:

```powershell
$env:VIDLOCK_TV_ORIGINS = 'null,http://localhost:8080'
```

Inspect the actual Origin on your TV; add that exact value if it differs. An allowed opaque `null` origin does not identify a particular TV, so CORS is not authentication. The existing server is a trusted-LAN application. Do not expose its unauthenticated APIs publicly.

## Package and sideload

Install the current unified CLI on your PC if it is missing:

```powershell
npm install -g @webos-tools/cli
ares -V
ares-config --profile tv
```

This is PC deployment tooling; the application itself has no build step. Use LG's current CLI instead of mixing deprecated OSE/TV CLI installations. [LG CLI installation](https://webostv.developer.lge.com/develop/tools/cli-installation).

From this project's root, package the app with source preserved for debugging:

```powershell
ares-package --no-minify ./webos-app
```

The expected output is `com.manish6523.vidlock_1.0.0_all.ipk`. For a release package, run `ares-package ./webos-app`. Only `webos-app` goes into the IPK; tests and server-support files do not. [LG packaging guide](https://webostv.developer.lge.com/develop/tools/webos-tv-cli-dev-guide).

On the TV, install Developer Mode from LG Apps/Content Store, open it, sign in with your LG Developer account, and enable Dev Mode Status. The TV reboots. Open Developer Mode again and turn on Key Server. Find the TV's IP in its network connection details or your router's device list. Keep the PC and TV on the same reachable LAN.

Run the following and choose **add** in the interactive setup:

```powershell
ares-setup-device
```

Use device name `myTV`, the TV's IP, port `9922`, SSH user `prisoner`, and no password. Then fetch its key:

```powershell
ares-setup-device --list
ares-novacom --device myTV --getkey
```

Enter the case-sensitive passphrase displayed by Developer Mode. Extend the remaining Developer Mode session before expiry; disabling Developer Mode removes sideloaded development apps. [LG Developer Mode instructions](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app).

Install and run:

```powershell
ares-install --device myTV ./com.manish6523.vidlock_1.0.0_all.ipk
ares-launch --device myTV com.manish6523.vidlock
ares-inspect --device myTV --app com.manish6523.vidlock --open
```

If opening the inspector automatically fails, omit `--open` and open the returned inspector URL. `ares-inspect` supplies a browser inspector, not a streaming terminal log. On a very old engine, a modern DevTools frontend can have compatibility problems; use the inspector URL/frontend furnished by the compatible LG tooling. [LG CLI command reference](https://webostv.developer.lge.com/develop/tools/cli-dev-guide).

## Native media compatibility

You do not need hls.js for the native webOS HLS path: the TV media pipeline accepts HLS via `video.src`. Desktop Chrome's behavior is not representative of that pipeline. Keep the URL ending in `.m3u8` and serve a valid HLS MIME type. LG documents HLS support and native media transport selection. [Streaming protocols](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm), [mediaOption reference](https://webostv.developer.lge.com/develop/guides/mediaoption-parameter).

| Media | TV playback policy |
| --- | --- |
| MP4/MOV, H.264 8-bit + AAC-LC | Best initial direct-stream candidate; still check profile, level, resolution and bitrate |
| MKV with H.264 or HEVC; MP4/TS with HEVC | Listed by LG, but qualify on the actual model and HTTP media pipeline before enabling automatic direct play |
| AC-3/E-AC-3, DTS | Container and model dependent; do not infer support across all LG generations |
| AV1, H.264 Hi10P, unsupported profiles, TrueHD | Do not assume native support on this old target; use a compatible conversion path |

LG's webOS 3.0 table lists H.264 Full HD up to 1080p60, level 4.2 and 40 Mbps; UHD support depends on the TV model. It also lists HEVC Main/Main10 and numerous legacy formats, but explicitly qualifies playback constraints. A file extension or `canPlayType()` result alone is not a playback guarantee. [LG webOS 3.0 format table](https://webostv.developer.lge.com/develop/specifications/video-audio-30).

The automatic client policy is deliberately conservative: probe codec/container, try H.264 + AAC/MP3 in MP4/M4V/MOV directly, otherwise use HLS. Playback errors or initial direct-load timeout trigger HLS fallback. The probe lacks bit depth, level, bitrate, and profile, so even this rule needs TV qualification. Playback mode lets you manually test other files. Your existing `media-info.streamingTier` is desktop-oriented and is not trusted as a TV capability verdict.

You do not need VAAPI for every file. Direct streaming avoids encoding entirely. If codecs are compatible but the container is problematic, a separate remux route can copy video/audio. If only audio is incompatible, copy video and encode audio. Your current HLS handler always selects a video encoder; it does not implement those remux/audio-only optimizations. Extend the server pipeline when needed rather than assuming HLS implies transcoding or that current HLS already avoids it.

## Debug on the actual TV

In the inspector Console, inspect:

```js
navigator.userAgent;
localStorage.getItem('vidlock_server_url');
VidLock.state.screen;
VidLock.state.player && VidLock.state.player.video.error;
VidLock.state.player && VidLock.state.player.video.currentSrc;
VidLock.position();
VidLock.duration();
```

Network: check JSON status/body, PUT preflight and CORS, HLS playlist/segment responses, and direct stream `206`, `Content-Range`, `Content-Length`, and MIME type. Watch the server terminal for ffprobe/FFmpeg failures: hardware pipeline errors are not always visible in the web inspector. XHR errors include their endpoint; video errors log `[VidLock] Media error` with the native error code.

Test a small known-good H.264/AAC MP4, then native HLS, nonzero resume, seeks beyond buffered media, audio changes, and subtitle alignment. Finally test a phone and TV together, including a guest joining mid-playback, host transfer, network interruption, Back, and suspend/resume. A wrong server LAN IP, Windows firewall, Wi-Fi isolation, or an old TV's TLS/certificate support can look like an API failure.

LG's older native HLS has restrictions: alternate `EXT-X-MEDIA` tracks are unsupported through webOS 3.5, A/V segments must have matching durations, and discontinuity handling is limited. This app changes the server-selected audio stream instead of relying on an HLS alternate-audio selector. Avoid using `playbackRate` as the primary party synchronization mechanism. [LG streaming limitations](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm).

TV-only Luna service calls require LG's separately included `webOSTV.js`; this app does not need it for playback or network APIs. A guarded diagnostic pattern, after adding that library, is:

```js
if (window.webOS && webOS.service) {
  var serviceCall = webOS.service.request('luna://com.palm.systemservice', {
    method: 'time/getSystemTime',
    parameters: {},
    onSuccess: function (result) { console.log(result); },
    onFailure: function (error) { console.error(error.errorCode, error.errorText); }
  });
}
```

Luna is platform IPC, not an HTTP endpoint or a desktop-browser feature. Only call TV-documented services, handle permission/version errors, and cancel subscriptions when leaving a view. Do not copy root-only Homebrew or webOS OSE APIs into a normal TV package. [webOSTV.js service reference](https://webostv.developer.lge.com/develop/references/webostvjs-webos).

## Enact/Spotlight tradeoff

The assumption needs qualification: Enact is not categorically incapable of running on Chromium 38. Its CLI supports explicit browser targets and transpilation/polyfills, though browser APIs and individual UI libraries may need additional work. Current default browser targets do not promise Chrome 38 compatibility. A pinned, correctly targeted Enact build would need real-TV validation. [Enact build and browser support](https://enactjs.com/docs/developer-tools/cli/building-apps/).

For your no-build, ES5-only requirement, this custom focus manager is a good fit: small, inspectable, and under your control. Enact/Spotlight provides mature focus containers, component integration, accessibility conventions, and broader interaction behavior. The custom implementation means maintaining those behaviors yourself. ES5 syntax checks reduce one source of compatibility risk; they do not replace hardware testing.

## Validation and limits

`tests/check.cjs` parses all shipped JavaScript, including Socket.IO, with `ecmaVersion: 5` and verifies API mappings and scoped CORS. `tests/browser.cjs` runs a headless 1920×1080 browser against fixture media and your actual server.ts room handlers extracted into an isolated server. It covers configuration, rows, D-pad scrolling, hero focus pause, episodes, resume, seeking, audio offsets, subtitles, PUT progress, party creation/join/approval/chat/sync/readiness, and host-only controls. Video APIs are mocked: this suite does not test codecs or TV media decoding. `tests/hls-retention.cjs` checks concurrent encoder retention and idle cleanup using the actual patched route with mocked filesystem/process dependencies.

On this machine, the development-only test commands are:

```powershell
$env:VIDLOCK_SERVER_SOURCE = (Resolve-Path '..').Path
$env:VIDLOCK_NODE_MODULES = 'C:\Users\krish\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/check.cjs
node tests/hls-retention.cjs
node tests/browser.cjs
```

These paths are test dependencies only and are never referenced by the packaged app. The browser test defaults to installed Chrome; override `VIDLOCK_CHROME` if necessary. No real TV was connected, the ares CLI is not installed in this workspace environment, and no IPK or hardware playback validation has been performed.
