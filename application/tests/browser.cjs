'use strict';
/* Development-only browser tests. Uses actual server.ts party handlers in an
   isolated in-memory server, fixture media, and a mocked video pipeline. */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm'), assert = require('assert');
const serverRoot = process.env.VIDLOCK_SERVER_SOURCE;
const runtime = process.env.VIDLOCK_NODE_MODULES;
if (!serverRoot || !runtime) throw new Error('Set VIDLOCK_SERVER_SOURCE and VIDLOCK_NODE_MODULES.');
const { chromium } = require(path.join(runtime, 'playwright'));
const { Server } = require(path.join(serverRoot, 'node_modules/socket.io'));
const { io: client } = require(path.join(serverRoot, 'node_modules/socket.io-client'));
const ts = require(path.join(serverRoot, 'node_modules/typescript'));
const root = path.resolve(__dirname, '..');
const media = Array.from({ length: 40 }, (_, n) => ({ id: n + 1, title: n < 2 ? 'The Long Way Home' : 'Collection ' + (n + 1),
  type: n < 2 ? 'show' : 'movie', year: 2024, season: 1, episode_start: n + 1, filename: 'Episode ' + (n + 1),
  genres: n % 2 ? 'Drama, Adventure' : 'Science Fiction, Drama', poster: '/posters/fixture.svg', backdrop: '/posters/fixture.svg',
  overview: 'A journey through distant places, unexpected friendships, and the stories that bring us home.',
  runtime: 60, exactDuration: 3600, watch_progress: n === 0 ? 120 : 0, available: 1 }));
const progress = [], traffic = [];
let server, io, browser;
const sockets = [];
function respond(res, status, type, body) { res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' }); res.end(body); }
function json(res, data) { respond(res, 200, 'application/json', JSON.stringify(data)); }
function ack(socket, event, data) { return new Promise(resolve => socket.emit(event, data, resolve)); }
async function poll(test, label) {
  for (let n = 0; n < 80; n++) { if (await test()) return; await new Promise(r => setTimeout(r, 50)); }
  throw new Error('Timed out: ' + label);
}
async function connect(base) {
  const socket = client(base); sockets.push(socket);
  await new Promise(resolve => socket.on('connect', resolve)); return socket;
}
async function main() {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    if (u.pathname.startsWith('/api/')) {
      if (u.pathname === '/api/watch-progress') {
        let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => { progress.push({ method: req.method, body: JSON.parse(body) }); json(res, { success: true }); }); return;
      }
      if (u.pathname === '/api/media') return json(res, u.searchParams.has('id') ? media.find(m => m.id === Number(u.searchParams.get('id'))) : media);
      if (u.pathname === '/api/recently-added') return json(res, media.slice(0, 6));
      if (u.pathname === '/api/continue-watching') return json(res, [media[0]]);
      if (u.pathname === '/api/favorites') return json(res, media.slice(4, 8));
      if (u.pathname === '/api/genres') return json(res, ['Drama', 'Adventure', 'Science Fiction']);
      if (u.pathname === '/api/media-info') return json(res, { container: 'mp4', videoCodec: 'h264', audioCodec: 'aac' });
      if (u.pathname === '/api/audio-tracks') return json(res, [{ index: 0, label: 'English' }, { index: 1, label: 'Hindi' }]);
      if (u.pathname === '/api/subtitles') return json(res, [{ label: 'English captions', url: '/api/subtitle-stream?id=1&track=2' }]);
      if (u.pathname === '/api/subtitle-stream') return respond(res, 200, 'text/vtt', 'WEBVTT\n\n00:02:00.000 --> 00:02:20.000\nHello <b>TV</b>\n');
      return respond(res, 404, 'text/plain', 'fixture route missing');
    }
    if (u.pathname === '/posters/fixture.svg') return respond(res, 200, 'image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g"><stop stop-color="#27565d"/><stop offset="1" stop-color="#a1764b"/></linearGradient></defs><path fill="url(#g)" d="M0 0h1200v800H0z"/><circle fill="#d8d0a0" cx="800" cy="240" r="120"/><path fill="#152a34" d="M0 800L400 200 650 600 1000 200 1200 800z"/></svg>');
    let file = path.resolve(root, 'webos-app', '.' + (u.pathname === '/' ? '/index.html' : u.pathname));
    if (!file.startsWith(path.join(root, 'webos-app') + path.sep) || !fs.existsSync(file)) return respond(res, 404, 'text/plain', 'missing');
    respond(res, 200, file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html', fs.readFileSync(file));
  });
  io = new Server(server, { cors: { origin: '*' } });
  io.on('connection', socket => socket.onAny((event, data) => traffic.push({ event, data })));
  // Execute precisely the room storage, ready logic, and event registrations
  // from the supplied server; never execute its Next startup or cache cleanup.
  const source = fs.readFileSync(path.join(serverRoot, 'server.ts'), 'utf8');
  const helpers = source.slice(source.indexOf('const rooms ='), source.indexOf('// ─── Boot'));
  const handlers = source.slice(source.indexOf('  io.on("connection"'), source.indexOf('  const PORT ='));
  assert(helpers && handlers, 'Server handler anchors must exist');
  const compiled = ts.transpileModule(helpers + '\n' + handlers, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(compiled, { io, console: { log() {}, warn() {} }, setTimeout, clearTimeout, setInterval, clearInterval });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.VIDLOCK_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    // Emulate only media behavior; no codec support is claimed by these tests.
    const proto = HTMLMediaElement.prototype;
    Object.defineProperty(proto, 'src', { get() { return this.getAttribute('data-test-src') || ''; }, set(value) { this.setAttribute('data-test-src', value); } });
    Object.defineProperty(proto, 'duration', { get() { return 3600; } });
    Object.defineProperty(proto, 'readyState', { get() { return 4; } });
    Object.defineProperty(proto, 'currentTime', { get() { return this._time || 0; }, set(t) { this._time = t; this.dispatchEvent(new Event('timeupdate')); setTimeout(() => this.dispatchEvent(new Event('seeked')), 0); } });
    Object.defineProperty(proto, 'paused', { get() { return !this._playing; } });
    Object.defineProperty(proto, 'seekable', { get() { return { length: 1, start() { return 0; }, end() { return 3600; } }; } });
    proto.load = function () { this._time = 0; if (this.getAttribute('data-test-src')) setTimeout(() => { this.dispatchEvent(new Event('loadedmetadata')); this.dispatchEvent(new Event('canplay')); }, 20); };
    proto.play = function () { this._playing = true; this.dispatchEvent(new Event('playing')); return Promise.resolve(); };
    proto.pause = function () { this._playing = false; };
  });
  await page.goto(base);
  await page.locator('input').fill(base); await page.getByRole('button', { name: 'Connect to library' }).click();
  await page.waitForSelector('.card');
  assert.equal(await page.evaluate(() => localStorage.getItem('vidlock_server_url')), base);
  assert.equal(await page.locator('.media-row').count(), 7);
  if (!process.env.VIDLOCK_PLAYER_UI_ONLY) {
  await page.evaluate(() => TVFocus.set(document.querySelector('[data-row="library"]')));
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  assert((await page.evaluate(() => TVFocus.current().parentNode.scrollLeft)) > 0, 'D-pad scrolls offscreen cards');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => TVFocus.current().getAttribute('data-row')), 'genre-0');
  }
  await page.evaluate(() => TVFocus.set(document.querySelector('.hero button')));
  const heroTitle = await page.locator('.hero h1').textContent();
  await page.waitForTimeout(8200);
  assert.equal(await page.locator('.hero h1').textContent(), heroTitle, 'Hero pauses on focus');
  await page.keyboard.press('Enter'); await page.waitForSelector('.episode');
  assert.equal(await page.locator('.episode').count(), 2);
  await page.getByRole('button', { name: 'Resume 0:02:00', exact: true }).click();
  await page.waitForSelector('video'); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => VidLock.position()), 120);
  await page.keyboard.press('ArrowRight'); assert.equal(await page.evaluate(() => VidLock.position()), 130);
  await page.keyboard.press('ArrowUp'); await page.getByRole('button', { name: 'Audio', exact: true }).click();
  await page.waitForTimeout(6200);
  assert.equal(await page.evaluate(() => TVFocus.current().closest('#modal') !== null), true, 'Player timer cannot steal popup focus');
  await page.screenshot({ path: path.join(root, 'tests/player-popup-preview.png') });
  await page.getByRole('button', { name: 'Hindi', exact: true }).click(); await page.waitForTimeout(100);
  assert((await page.locator('video').getAttribute('data-test-src')).endsWith('/api/hls/1/1/130/playlist.m3u8'));
  assert.equal(await page.evaluate(() => VidLock.position()), 130, 'HLS offset counted once');
  await page.getByRole('button', { name: 'Subtitles', exact: true }).click(); await page.getByRole('button', { name: 'English captions' }).click();
  await page.waitForTimeout(100); await page.evaluate(() => VidLock.state.player.video.dispatchEvent(new Event('timeupdate')));
  assert.equal(await page.locator('.captions').textContent(), 'Hello TV');
  await page.evaluate(() => TVFocus.set(document.querySelector('[aria-label="Close controls"]')));
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.player-overlay').isVisible(), false, 'Remote X hides controls without immediately reopening');
  await page.keyboard.press('ArrowUp');
  await page.screenshot({ path: path.join(root, 'tests/player-preview.png') });
  const stroke = await page.locator('.circle-btn .icon').first().evaluate(el => getComputedStyle(el).stroke);
  assert.equal(stroke, 'rgb(8, 9, 11)', 'Unfocused icons retain black stroke');
  await page.getByRole('button', { name: 'Close controls', exact: true }).click();
  assert.equal(await page.locator('.player-overlay').isVisible(), false, 'Pointer X hides controls');
  await page.keyboard.press('Escape'); await page.waitForSelector('.detail-top');
  await poll(() => progress.length > 0, 'progress save'); assert.equal(progress[0].method, 'PUT'); assert.equal(progress[0].body.currentTime, 130);
  // Host TV room, real protocol guest, chat, approvals, host-only playback.
  await page.getByRole('button', { name: 'Watch Party', exact: true }).last().click();
  await page.getByRole('button', { name: 'Create party for this title' }).click(); await page.waitForSelector('.room-code');
  const code = await page.locator('.room-code').textContent(); assert(/^[A-Z0-9]{6}$/.test(code));
  const guest = await connect(base); const joined = await ack(guest, 'join-room', { roomCode: code, guestName: 'Phone' }); assert.equal(joined.success, true);
  guest.on('playback-sync', data => { if (data.type === 'seek') setTimeout(() => guest.emit('member-ready', { roomCode: code }), 100); });
  await page.getByRole('button', { name: 'Start watching', exact: true }).click(); await page.waitForSelector('video');
  await poll(() => traffic.some(t => t.event === 'playback-event' && t.data.type === 'play'), 'host play emitted');
  await page.keyboard.press('ArrowRight');
  await poll(() => traffic.some(t => t.event === 'playback-event' && t.data.type === 'seek'), 'host seek emitted');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 406 })));
  await page.locator('#modal input').fill('Hello from TV'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.chat-log').textContent.indexOf('Hello from TV') >= 0);
  const late = await connect(base); const pending = await ack(late, 'join-room', { roomCode: code, guestName: 'Late friend' }); assert.equal(pending.status, 'pending');
  await page.getByRole('button', { name: 'Allow', exact: true }).waitFor();
  const approved = new Promise(resolve => late.once('join-approved', resolve));
  await page.getByRole('button', { name: 'Allow', exact: true }).click(); assert.equal((await approved).mediaId, 1);
  await page.keyboard.press('ArrowUp'); await page.getByRole('button', { name: 'Exit player', exact: true }).click(); await page.waitForSelector('.detail-top');
  guest.disconnect(); late.disconnect();
  // Join a web-hosted room as TV guest; verify it cannot emit host controls.
  const host = await connect(base); const created = await ack(host, 'create-room', { mediaId: 1, hostName: 'Web host' });
  await page.getByRole('button', { name: 'Watch Party', exact: true }).last().click();
  await page.locator('#modal input').nth(1).fill(created.roomCode);
  await page.getByRole('button', { name: 'Join room', exact: true }).click(); await page.waitForSelector('.room-code');
  host.emit('party-started', { roomCode: created.roomCode }); await page.waitForSelector('video'); await page.waitForTimeout(100);
  const count = traffic.filter(t => t.event === 'playback-event').length;
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  assert.equal(traffic.filter(t => t.event === 'playback-event').length, count, 'Guest cannot emit playback');
  host.emit('playback-event', { roomCode: created.roomCode, type: 'seek', currentTime: 300 });
  await poll(() => page.evaluate(() => VidLock.position() === 300), 'guest seek synchronization');
  await poll(() => traffic.some(t => t.event === 'member-ready' && t.data.roomCode === created.roomCode), 'guest readiness');
  await page.keyboard.press('Escape'); await page.waitForSelector('.detail-top');
  await page.getByRole('button', { name: 'Back to library' }).click(); await page.waitForSelector('.hero');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('hidden'));
  await page.screenshot({ path: path.join(root, 'tests/home-preview.png') });
  assert.deepEqual(errors, []);
  console.log('PASS: config, catalog, ' + (process.env.VIDLOCK_PLAYER_UI_ONLY ? 'home scrolling skipped, ' : 'D-pad scrolling, ') + 'hero focus pause, player close (remote/pointer), popup focus retention, icon stroke, episodes, resume, seek, audio HLS offset, subtitles, progress PUT, real server party create/join/approve/chat/sync/readiness/host-only controls.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  sockets.forEach(s => s.disconnect());
  if (browser) await browser.close();
  if (io) await new Promise(resolve => io.close(resolve));
  if (server && server.listening) await new Promise(resolve => server.close(resolve));
});
