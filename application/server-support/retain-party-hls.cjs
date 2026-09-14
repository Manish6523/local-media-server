'use strict';
var fs = require('fs'), path = require('path');
if (!process.argv[2]) throw new Error('Usage: node server-support/retain-party-hls.cjs SERVER_ROOT');
var file = path.join(path.resolve(process.argv[2]), 'app', '(main)', 'api', 'hls', '[mediaId]', '[audioTrack]', '[start]', '[file]', 'route.ts');
var source = fs.readFileSync(file, 'utf8');
var start = source.indexOf('      // Kill stale transcode for the same media/track at a different start position');
var end = source.indexOf('      if (!active && !fs.existsSync(requestedFilePath))', start);
if (source.indexOf('// Retain other start positions for concurrent party members.') !== -1) { console.log('HLS retention already patched'); process.exit(0); }
if (start < 0 || end < 0 || source.slice(start, end).indexOf('transcode.ffmpeg.kill("SIGTERM")') < 0) throw new Error('Unexpected HLS route; review manually.');
var next = source.slice(0, start) + '      // Retain other start positions for concurrent party members.\n      // The existing lastAccessed idle cleanup retires unused encoders.\n\n' + source.slice(end);
fs.writeFileSync(file + '.before-tv-party', source, { flag: 'wx' });
fs.writeFileSync(file, next);
console.log('Patched concurrent HLS retention: ' + file);
