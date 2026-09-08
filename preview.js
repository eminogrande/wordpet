/* preview.js - self-check + eyeball render.  node preview.js [out.png]
   Asserts determinism, then writes a contact sheet PNG. */
var zlib = require('zlib'), fs = require('fs'), assert = require('assert');
var PP = require('./pixelpet.js');

/* ---- self-check: same words -> identical pixels, different words -> different ---- */
var a = PP.render(PP.traitsFor('green-elephant-hat'), 0, false);
var b = PP.render(PP.traitsFor('  GREEN / Elephant__HAT  '), 0, false);
assert.deepStrictEqual(a, b, 'normalisation must not change the avatar');
var c = PP.render(PP.traitsFor('green-elephant-cat'), 0, false);
assert.notDeepStrictEqual(a, c, 'different words must give a different avatar');
assert.strictEqual(PP.traitsFor('blue-panda').fingerprint, PP.traitsFor('blue-panda').fingerprint);
/* collision smoke test over a decent word space */
var seen = new Set(), adj = ['blue','green','red','tiny','giant','sleepy','angry','lucky','void','neon','rusty','golden'];
var noun = ['panda','crow','penguin','fox','slug','moth','otter','yak','newt','crab','bat','ram'];
var verb = ['diving','jumping','singing','hiding','running','dreaming'];
for (var i = 0; i < adj.length; i++) for (var j = 0; j < noun.length; j++) for (var k = 0; k < verb.length; k++)
  seen.add(PP.traitsFor(adj[i] + '-' + verb[k] + '-' + noun[j]).fingerprint);
assert.strictEqual(seen.size, adj.length * noun.length * verb.length, 'fingerprints must be unique');
console.log('self-check ok (' + seen.size + ' unique fingerprints)');

/* ---- tiny PNG encoder ---- */
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

/* ---- contact sheet ---- */
var words = [];
for (var q = 0; q < adj.length; q++) words.push(adj[q] + '-' + verb[q % verb.length] + '-' + noun[q]);
words = words.concat(['green-elephant-hat', 'blue-jumping-penguin', 'diving-crow', 'blue-panda',
  'silent-wolf', 'happy-toaster', 'cto-nuri-com', 'seven-red-moons',
  'wandering-mushroom', 'brave-little-goose', 'quantum-tapir', 'midnight-koi',
  'salty-sea-dog', 'paper-tiger', 'electric-hamster', 'old-stone-frog',
  'nine-lives', 'pocket-dragon', 'rainy-tuesday', 'hex-badger']);

var COLS = 8, SC = 5, CELL = PP.W * SC, ROWS = Math.ceil(words.length / COLS);
var IW = COLS * CELL, IH = ROWS * CELL;
var img = Buffer.alloc(IW * IH * 3, 0x1a);

words.forEach(function (word, n) {
  var t = PP.traitsFor(word), buf = PP.render(t, n % 4, false);
  var ox = (n % COLS) * CELL, oy = Math.floor(n / COLS) * CELL, bg = rgbOf(t.col.bg);
  for (var y = 0; y < PP.H; y++) for (var x = 0; x < PP.W; x++) {
    var v = buf[y * PP.W + x], px = v ? rgbOf(v) : bg;
    for (var sy = 0; sy < SC; sy++) for (var sx = 0; sx < SC; sx++) {
      var o = ((oy + y * SC + sy) * IW + (ox + x * SC + sx)) * 3;
      img[o] = px[0]; img[o + 1] = px[1]; img[o + 2] = px[2];
    }
  }
});

var out = process.argv[2] || 'preview.png';
fs.writeFileSync(out, png(IW, IH, img));
console.log('wrote ' + out + ' (' + IW + 'x' + IH + ', ' + words.length + ' pets)');
