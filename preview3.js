/* preview3.js - v3 contact sheet.  node preview3.js */
var zlib = require('zlib'), fs = require('fs');
var V3 = require('./wordpet3.js');

var T = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(ty, d) { var l = Buffer.alloc(4); l.writeUInt32BE(d.length, 0); var b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); var c = Buffer.alloc(4); c.writeUInt32BE(crc32(b), 0); return Buffer.concat([l, b, c]); }
function png(w, h, rgb) {
  var raw = Buffer.alloc((w * 3 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  var i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', i), chunk('IDAT', zlib.deflateSync(raw, {level:9})), chunk('IEND', Buffer.alloc(0))]);
}
function rgbOf(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }

var names = ['emino', 'nuri', 'alice', 'bob', 'satoshi', 'grace', 'walter', 'zoe',
  'blue-panda', 'diving-crow', 'quantum-tapir', 'midnight-koi', '0x758a', 'eminö', 'carol', 'trent',
  'heidi', 'ivan', 'judy', 'mallory', 'oscar', 'peggy', 'victor', 'frank'];
var SC = 4, COLS = 8, CELL = V3.W * SC, ROWS = Math.ceil(names.length / COLS);
var IW = COLS * CELL, IH = ROWS * CELL, img = Buffer.alloc(IW * IH * 3, 0x18);
names.forEach(function (n, k) {
  var t = V3.traitsFor(n), buf = V3.render(t, 0, false);
  var ox = (k % COLS) * CELL, oy = Math.floor(k / COLS) * CELL, bg = [236, 232, 226];
  for (var y = 0; y < V3.H; y++) for (var x = 0; x < V3.W; x++) {
    var v = buf[y * V3.W + x], px = v ? rgbOf(v) : bg;
    for (var sy = 0; sy < SC; sy++) for (var sx = 0; sx < SC; sx++) {
      var o = ((oy + y * SC + sy) * IW + (ox + x * SC + sx)) * 3;
      img[o] = px[0]; img[o+1] = px[1]; img[o+2] = px[2];
    }
  }
});
fs.writeFileSync('preview3.png', png(IW, IH, img));
console.log('wrote preview3.png');
names.slice(0, 10).forEach(function (n) {
  var t = V3.traitsFor(n);
  console.log('  ' + n.padEnd(14) + t.emojiLine.padEnd(24) + ' seal ' + t.seal.join('') + '\n' + ' '.repeat(16) + t.phrase);
});
