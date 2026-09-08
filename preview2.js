/* preview2.js - v2 contact sheets.  node preview2.js
   Sheet A: one of every species, so silhouettes can be checked against their names.
   Sheet B: real usernames, the way the product would use it. */
var zlib = require('zlib'), fs = require('fs'), crypto = require('crypto'), assert = require('assert');
var V2 = require('./wordpet2.js');

/* the hash must be a real SHA-256, not something that merely looks like one */
['', 'a', 'emino', 'blue-panda', 'the quick brown fox jumps over the lazy dog',
 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(119)].forEach(function (s) {
  var mine = V2.sha256(s).map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
  assert.strictEqual(mine, crypto.createHash('sha256').update(s).digest('hex'), 'sha256 mismatch on ' + JSON.stringify(s));
});
console.log('sha256 matches node crypto on 9 inputs including block boundaries');

var T = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { var c = 0xFFFFFFFF; for (var i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  var body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgb) {
  var raw = Buffer.alloc((w * 3 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }

function sheet(file, cells, cols, scale) {
  var CELL = V2.W * scale, rows = Math.ceil(cells.length / cols);
  var IW = cols * CELL, IH = rows * CELL, img = Buffer.alloc(IW * IH * 3, 0x18);
  cells.forEach(function (cell, n) {
    var buf = cell.buf, ox = (n % cols) * CELL, oy = Math.floor(n / cols) * CELL, bg = cell.bg;
    for (var y = 0; y < V2.H; y++) for (var x = 0; x < V2.W; x++) {
      var v = buf[y * V2.W + x], px = v ? rgbOf(v) : bg;
      for (var sy = 0; sy < scale; sy++) for (var sx = 0; sx < scale; sx++) {
        var o = ((oy + y * scale + sy) * IW + (ox + x * scale + sx)) * 3;
        img[o] = px[0]; img[o + 1] = px[1]; img[o + 2] = px[2];
      }
    }
  });
  fs.writeFileSync(file, png(IW, IH, img));
  console.log('wrote ' + file + ' (' + IW + 'x' + IH + ', ' + cells.length + ' pets)');
}

/* Sheet A: force one of each species, everything else held quiet, to judge silhouettes */
var byName = {};
V2.SPECIES.forEach(function (s, i) { byName[s.n] = i; });
var speciesCells = V2.SPECIES.map(function (s, i) {
  var t = V2.traitsFor('sheet-' + s.n);
  t.species = i; t.hat = 0; t.item = 0; t.shoes = 0; t.pattern = 0; t.eyes = 0;
  t.colour = i % V2.COLOURS.length;
  var base = V2.COLOURS[t.colour];
  t.col.body = base ? undefined : undefined;
  t = Object.assign(V2.traitsFor('sheet-' + s.n), { species: i, hat: 0, item: 0, shoes: 0, pattern: 0, eyes: 0 });
  return { buf: V2.render(t, 0, false), bg: [236, 232, 226] };
});
sheet('preview2-species.png', speciesCells, 8, 4);
console.log('   ' + V2.SPECIES.map(function (s) { return s.n; }).join(', '));

/* Sheet B: usernames, full dress */
var names = ['emino', 'nuri', 'satoshi', 'alice', 'bob', 'carol', 'dave', 'erin',
  'frank', 'grace', 'heidi', 'ivan', 'judy', 'mallory', 'oscar', 'peggy',
  'trent', 'victor', 'walter', 'zoe', 'cto-nuri-com', 'green-elephant-hat',
  'blue-panda', 'diving-crow'];
sheet('preview2.png', names.map(function (n) {
  return { buf: V2.render(V2.traitsFor(n), 0, false), bg: [236, 232, 226] };
}), 8, 4);
names.slice(0, 8).forEach(function (n) {
  var t = V2.traitsFor(n);
  console.log('   ' + n.padEnd(20) + t.emoji.join('') + '  ' + t.petName + '  |  ' + t.phrase);
});
