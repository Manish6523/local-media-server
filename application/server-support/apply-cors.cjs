'use strict';
/* Run against the explicitly selected server checkout; preserves originals. */
var fs = require('fs'), path = require('path');
var root = path.resolve(process.argv[2] || '');
if (!process.argv[2]) { throw new Error('Usage: node server-support/apply-cors.cjs SERVER_ROOT'); }
var names = ['server.ts', 'server.js'];
var updates = names.map(function (name) {
  var file = path.join(root, name), text = fs.readFileSync(file, 'utf8');
  if (text.indexOf('tv-cors.cjs') >= 0) { return null; }
  var anchor = name === 'server.ts' ? 'const httpServer = createServer((req, res) => {' : 'const httpServer = (0, http_1.createServer)((req, res) => {';
  if (text.indexOf(anchor) === -1 || text.indexOf(anchor) !== text.lastIndexOf(anchor)) { throw new Error('Unexpected server layout: ' + file); }
  if (fs.existsSync(file + '.before-tv-cors')) { throw new Error('Backup already exists: ' + file); }
  return { file: file, original: text, next: text.replace(anchor, anchor + '\n    if (require("./tv-cors.cjs")(req, res)) return;') };
});
var helper = path.join(root, 'tv-cors.cjs'), helperText = fs.readFileSync(path.join(__dirname, 'tv-cors.cjs'), 'utf8');
if (fs.existsSync(helper) && fs.readFileSync(helper, 'utf8') !== helperText) { throw new Error('Existing CORS helper differs; review manually.'); }
fs.writeFileSync(helper, helperText);
updates.forEach(function (update) {
  if (!update) { return; }
  fs.writeFileSync(update.file + '.before-tv-cors', update.original, { flag: 'wx' });
  fs.writeFileSync(update.file, update.next); console.log('Patched ' + update.file);
});
