'use strict';
var fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
var serverRoot = process.env.VIDLOCK_SERVER_SOURCE;
if (!serverRoot) { throw new Error('Set VIDLOCK_SERVER_SOURCE to your server checkout (uses its installed acorn).'); }
var acorn = require(path.join(serverRoot, 'node_modules/acorn'));
['app.js', 'adapter.js', 'focus.js', 'vendor/socket.io.min.js'].forEach(function (name) {
  acorn.parse(fs.readFileSync(path.join(__dirname, '../webos-app', name), 'utf8'), { ecmaVersion: 5 });
  console.log('ES5 parsed: ' + name);
});
var context = { window: {} }; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../webos-app/adapter.js'), 'utf8'), context);
var api = context.window.VidLockAPI;
assert.equal(api.paths.detail(42), '/api/media?id=42');
assert.equal(api.paths.hls(42, 1, 91.8), '/api/hls/42/1/91/playlist.m3u8');
assert.equal(JSON.stringify(api.progressBody(42, 90, 3600)), JSON.stringify({ id: 42, currentTime: 90, duration: 3600 }));
assert.equal(api.progress({ watch_progress: 90, runtime: 60 }).duration, 3600);
assert.equal(api.progress({ watch_progress: 90, runtime: 60 }).position, 90);
assert.equal(api.preferDirect({ container: 'mp4', videoCodec: 'h264', audioCodec: 'aac' }), true);
assert.equal(api.preferDirect({ container: 'mp4', videoCodec: 'av1', audioCodec: 'aac' }), false);
assert.equal(api.preferDirect({ container: 'mp4', videoCodec: 'h264', audioCodec: 'dts' }), false);
assert.equal(api.playbackPayload('ABC123', 1, 'seek', 20).type, 'seek');
assert.equal(api.chatPayload('ABC123', 'hi').text, 'hi');
var items = [{ id: 1, type: 'show', title: 'Show', season: 2, episode_start: 1 }, { id: 2, type: 'show', title: 'Show', season: 1, episode_start: 2 }, { id: 3, type: 'movie', title: 'Show' }];
assert.equal(api.group(items).length, 2); assert.equal(api.episodes(items[0], items)[0].id, 2);
var cors = require('../server-support/tv-cors.cjs');
function response() { return { headers: {}, setHeader: function (k, v) { this.headers[k] = v; }, end: function () { this.ended = true; } }; }
var res = response();
assert.equal(cors({ url: '/api/watch-progress', method: 'OPTIONS', headers: { origin: 'null', 'access-control-request-method': 'PUT' } }, res), true);
assert.equal(res.statusCode, 204);
res = response(); cors({ url: '/api/admin/verify-pin', method: 'GET', headers: { origin: 'null' } }, res); assert.equal(Object.keys(res.headers).length, 0);
res = response(); cors({ url: '/api/media', method: 'GET', headers: { origin: 'https://other.example' } }, res); assert.equal(Object.keys(res.headers).length, 0);
console.log('Adapter and scoped CORS checks passed.');
