'use strict';
/* Narrow CORS bridge for the packaged TV app. HTTP auth is unchanged.
 * Configure exact origins with VIDLOCK_TV_ORIGINS; file:// apps send "null".
 * Do not expose an unauthenticated media server to the public internet. */
module.exports = function tvCors(req, res) {
  var path = (req.url || '').split('?')[0];
  var readable = /^\/api\/(recently-added|continue-watching|favorites|media|genres|media-info|subtitles|audio-tracks|subtitle-stream|subtitle-file|stream)$/.test(path) || /^\/api\/hls\//.test(path);
  var writable = path === '/api/watch-progress';
  if (!readable && !writable) { return false; }
  var allowed = (process.env.VIDLOCK_TV_ORIGINS || 'null').split(',').map(function (s) { return s.trim(); });
  var origin = req.headers.origin;
  if (!origin || allowed.indexOf(origin) === -1) { return false; }
  var method = req.method === 'OPTIONS' ? req.headers['access-control-request-method'] : req.method;
  var methods = writable ? ['PUT'] : ['GET', 'HEAD'];
  if (methods.indexOf(method) === -1) { return false; }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods.join(', ') + ', OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
  return false;
};
