'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), EventEmitter = require('events');
const root = process.env.VIDLOCK_SERVER_SOURCE;
const ts = require(path.join(root, 'node_modules/typescript'));
const file = path.join(root, 'app/(main)/api/hls/[mediaId]/[audioTrack]/[start]/[file]/route.ts');
const source = fs.readFileSync(file, 'utf8') + '\nexport const testRegistry = activeTranscodes;';
let cleanup, kills = 0;
const mockFs = { existsSync() { return true; }, statSync() { return { size: 20 }; }, createReadStream() { return new EventEmitter(); } };
const moduleObject = { exports: {} };
const mocks = {
  'next/server': { NextResponse: class { constructor(body, options) { this.status = options.status; } } },
  child_process: { spawn() { throw new Error('Unexpected transcode spawn'); }, execSync() { throw new Error('Unexpected probe'); } },
  fs: mockFs, path: path, os: {}, '@/lib/db': { getMediaById() { return { available: 1, filepath: '/fixture.mp4' }; } },
  '@/lib/gpu-detect': {}, '@/lib/ffmpeg': {}, '@/lib/paths': { PATHS: { hlsCache: '/fixture-cache' } }
};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText,
  { exports: moduleObject.exports, require(name) { if (!(name in mocks)) throw new Error(name); return mocks[name]; }, console: { log() {}, error() {} },
    setInterval(fn) { cleanup = fn; }, ReadableStream: class {}, Date, Uint8Array, setTimeout });
const mod = moduleObject.exports;
mod.testRegistry.set('1_0_0', { ffmpeg: { kill() { kills++; } }, lastAccessed: Date.now(), dir: '/fixture-cache' });
mod.GET({}, { params: Promise.resolve({ mediaId: '1', audioTrack: '0', start: '100', file: 'playlist.m3u8' }) }).then(response => {
  assert.equal(response.status, 200); assert.equal(kills, 0, 'Active party member retained');
  mod.testRegistry.get('1_0_0').lastAccessed = Date.now() - 11 * 60 * 1000;
  cleanup(); assert.equal(kills, 1, 'Idle encoder still cleaned');
  console.log('PASS: concurrent HLS start retains active encoder; idle cleanup still kills expired encoder.');
}).catch(error => { console.error(error); process.exitCode = 1; });
