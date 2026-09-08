/* pixelpet.js - deterministic pixel pet avatars from words.
   Same words in  ->  byte-identical avatar out. No randomness, no clock, no locale. */
(function (root) {
'use strict';

var W = 32, H = 32;
var CX = 15.5;                 /* mirror axis: x maps to 31-x */

/* ---------------- deterministic core ---------------- */

function normalize(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function fnv(str, seed) {
  var h = seed >>> 0;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/* 128 bits of seed derived from the word string */
function seedsOf(name) {
  return [fnv(name, 2166136261), fnv(name + '~1', 1013904223),
          fnv('~2' + name, 2654435761), fnv(name + '|' + name, 40503)];
}
function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = ((c << 21) | (c >>> 11));
    d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
  if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
  function f(v) { var n = Math.round((v + m) * 255); n = n < 0 ? 0 : n > 255 ? 255 : n; return (n < 16 ? '0' : '') + n.toString(16); }
  return '#' + f(r) + f(g) + f(b);
}

/* ---------------- trait tables ---------------- */

var NAMES = {
  body: ['round', 'egg', 'pear', 'chunky', 'slim'],
  ear: ['plain head', 'cat ears', 'bunny ears', 'horns', 'antennae', 'mouse ears', 'spikes', 'floppy ears'],
  eye: ['beads', 'big eyes', 'sleepy', 'wide eyes', 'sharp', 'sparkle', 'goggles', 'cyclops'],
  mouth: ['smile', 'grin', 'oh', 'beak', 'whisker mouth', 'tongue out'],
  hat: ['bare head', 'cap', 'top hat', 'beanie', 'crown', 'wizard hat', 'headband', 'halo'],
  arm: ['arms down', 'waving', 'arms up', 'wings'],
  item: ['empty handed', 'flower', 'wand', 'balloon', 'sword', 'mug'],
  leg: ['stubby legs', 'long legs', 'no legs', 'paws'],
  wear: ['bare', 'scarf', 'collar', 'cape', 'bow tie'],
  pattern: ['plain coat', 'belly patch', 'spots', 'stripes'],
  tail: ['no tail', 'curl tail', 'puff tail', 'long tail'],
  behavior: ['bob', 'hop', 'sway', 'float', 'wiggle', 'march']
};

var BODY = [
  { rx: 5.8, ry: 4.6, cy: 21.2 },
  { rx: 4.9, ry: 5.2, cy: 21.0 },
  { rx: 6.0, ry: 4.6, cy: 21.4 },
  { rx: 6.4, ry: 4.3, cy: 21.2 },
  { rx: 4.3, ry: 4.8, cy: 21.2 }
];
var HCY = 11.6, HRX = 7.6, HRY = 6.2;   /* head, always wider than the body */
var LEGY = 27.6;                        /* leg centre */

function traitsFor(input) {
  var name = normalize(input);
  var s = seedsOf(name), r = sfc32(s[0], s[1], s[2], s[3]), i;
  for (i = 0; i < 20; i++) r();
  function pick(n) { return Math.floor(r() * n); }

  var hue = pick(360);
  var shift = [150, 180, 210, 120, -45, 45, 90][pick(7)];
  var t = {
    name: name,
    fingerprint: s.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join(''),
    hue: hue,
    body: pick(5), ear: pick(8), eye: pick(8), mouth: pick(6), hat: pick(8),
    arm: pick(4), item: pick(6), leg: pick(4), wear: pick(5), pattern: pick(4),
    tail: pick(4), behavior: pick(6), shift: shift
  };
  t.muzzle = r() < 0.35;
  t.blush = r() < 0.40;
  /* a raised arm would put the held item through the face; keep hands down instead */
  if (t.item > 0 && (t.arm === 1 || t.arm === 2)) t.arm = 0;
  if (t.arm === 3) t.item = 0;                       /* wings cannot hold things */
  t.col = {
    body: hsl(hue, 62, 58), light: hsl(hue, 60, 72), dark: hsl(hue, 55, 44),
    out: hsl(hue, 55, 13), pale: hsl(hue, 45, 89),
    acc: hsl(hue + shift, 68, 56), accD: hsl(hue + shift, 66, 38), accL: hsl(hue + shift, 70, 76),
    eye: hsl(hue, 45, 10), white: '#ffffff', gold: '#f5c542', bone: '#f2e6cf',
    steel: '#c9d2dc', pink: '#ff7fa8', bg: hsl(hue, 30, 93)
  };
  t.label = [NAMES.hat[t.hat], NAMES.ear[t.ear], NAMES.eye[t.eye], NAMES.mouth[t.mouth],
             NAMES.arm[t.arm], NAMES.item[t.item], NAMES.leg[t.leg], NAMES.tail[t.tail],
             NAMES.wear[t.wear], NAMES.pattern[t.pattern], NAMES.body[t.body], NAMES.behavior[t.behavior]];
  return t;
}

/* ---------------- raster helpers ---------------- */

function P(b, x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  b[y * W + x] = c;
}
function S(b, x, y, c) { P(b, x, y, c); P(b, W - 1 - Math.round(x), y, c); }
function G(b, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return null;
  return b[y * W + x];
}
function only(b, x, y, c, want) { if (G(b, x, y) === want) P(b, x, y, c); }

function ell(b, cx, cy, rx, ry, c) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.04) P(b, x, y, c);
    }
}
/* ellipse with its own 1px outline, so limbs read separately from the body */
function ellO(b, cx, cy, rx, ry, fill, out) {
  ell(b, cx, cy, rx + 0.9, ry + 0.9, out); ell(b, cx, cy, rx, ry, fill);
}
function ellS(b, cx, cy, rx, ry, c) { ell(b, cx, cy, rx, ry, c); ell(b, W - 1 - cx, cy, rx, ry, c); }
function rect(b, x0, y0, x1, y1, c) {
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) P(b, x, y, c);
}
function rectS(b, x0, y0, x1, y1, c) {
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) S(b, x, y, c);
}
/* triangle, apex at (ax,ay), widening by `slope` per row toward dirY */
function tri(b, ax, ay, dirY, h, c, mirror, slope) {
  slope = slope == null ? 0.75 : slope;
  for (var i = 0; i < h; i++) {
    var y = ay + dirY * i, hw = Math.round(i * slope);
    for (var x = ax - hw; x <= ax + hw; x++) { if (mirror) S(b, x, y, c); else P(b, x, y, c); }
  }
}
function line(b, x0, y0, x1, y1, c, th) {
  th = th || 1;
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3 + 1;
  for (var i = 0; i <= n; i++) {
    var x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    if (th <= 1) P(b, x, y, c); else ell(b, x, y, th / 2, th / 2, c);
  }
}
/* The curl tail is stored as literal pixels rather than swept with sin/cos:
   trig is not bit-identical across JS engines, and the avatar must be. */
var CURL = [24,19,25,19,26,19,24,20,25,20,26,20,27,20,25,21,26,21,27,21,28,21,
  26,22,27,22,28,22,20,23,21,23,27,23,28,23,20,24,21,24,22,24,26,24,27,24,28,24,
  20,25,21,25,22,25,23,25,25,25,26,25,27,25,28,25,21,26,22,26,23,26,24,26,25,26,
  26,26,27,26,22,27,23,27,24,27,25,27,26,27];
function curl(b, dy, c) {
  for (var i = 0; i < CURL.length; i += 2) P(b, CURL[i], CURL[i + 1] + dy, c);
}

/* ---------------- the pet ---------------- */

function render(t, phase, blink) {
  var b = new Array(W * H).fill(null), c = t.col;
  var B = BODY[t.body], brx = B.rx, bry = B.ry, bcy = B.cy;
  if (t.leg === 2) { bry += 1.5; bcy += 1.3; }
  var sw = [0, 1, 0, -1][phase & 3];
  var x, y, i;

  /* --- tail (behind everything) --- */
  if (t.tail === 1) curl(b, sw, c.dark);
  else if (t.tail === 2) { ell(b, 25, 24 - sw, 3.2, 3.2, c.dark); ell(b, 25, 24 - sw, 1.7, 1.7, c.pale); }
  else if (t.tail === 3) { line(b, 21, 25, 29, 17 - sw, c.dark, 2.4); ell(b, 29, 17 - sw, 1.7, 1.7, c.acc); }

  /* --- cape (behind) --- */
  if (t.wear === 3) {
    for (y = 18; y <= 27; y++) {
      var hw = 4 + (y - 18) * 0.8 + Math.abs(sw) * 0.4;
      for (x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) P(b, x, y, c.accD);
    }
  }

  /* --- ears / head furniture (behind head) --- */
  if (t.ear === 1) { tri(b, 10, 2, 1, 6, c.body, true, 0.62); tri(b, 10, 4, 1, 4, c.pale, true, 0.45); }
  else if (t.ear === 2) { rectS(b, 11, 1, 13, 8, c.body); rectS(b, 12, 3, 12, 7, c.pale); }
  else if (t.ear === 3) { tri(b, 9, 2, 1, 5, c.bone, true, 0.6); }
  else if (t.ear === 4) { rectS(b, 13, 2, 13, 7, c.dark); ellS(b, 13, 1, 1.7, 1.7, c.acc); }
  else if (t.ear === 5) { ellS(b, 8, 6, 3.4, 3.4, c.body); ellS(b, 8, 6, 1.9, 1.9, c.pale); }
  else if (t.ear === 6) { tri(b, 9, 2, 1, 4, c.acc, true, 0.7); tri(b, 13, 1, 1, 4, c.acc, true, 0.7); }
  else if (t.ear === 7) { ellS(b, 6, 13, 2.4, 4.2, c.dark); }

  /* --- legs (behind the body, alternating with the phase) --- */
  if (t.leg !== 2) {
    var pairs = [[12.5, sw > 0 ? 0 : 1], [18.5, sw > 0 ? 1 : 0]];
    for (i = 0; i < pairs.length; i++) {
      var lx = pairs[i][0], d = pairs[i][1];
      if (t.leg === 0) ellO(b, lx, LEGY - d, 1.9, 2.2, c.dark, c.out);
      else if (t.leg === 1) { ellO(b, lx, LEGY - 0.4 - d, 1.4, 3.0, c.dark, c.out); ell(b, lx - 0.4, LEGY + 2.2 - d, 2.2, 1.1, c.dark); }
      else { ellO(b, lx, LEGY - 0.4 - d, 1.9, 2.0, c.dark, c.out); ell(b, lx, LEGY + 1.8 - d, 2.4, 1.3, c.pale); }
    }
  }

  /* --- body --- */
  ell(b, CX, bcy, brx, bry, c.body);
  if (t.body === 2) ell(b, CX, bcy + 1.7, brx + 0.7, bry - 1.7, c.body);
  rect(b, 13, 15, 18, Math.round(bcy), c.body);            /* neck fill */

  /* --- coat pattern (repaints body pixels only) --- */
  if (t.pattern === 1) ell(b, CX, bcy + 1.3, brx * 0.62, bry * 0.66, c.pale);
  else if (t.pattern === 2) {
    var spots = [[13, bcy - 1], [18, bcy + 1], [15, bcy + 3], [12, bcy + 2]];
    for (i = 0; i < spots.length; i++) {
      var sx = spots[i][0], sy = spots[i][1];
      for (y = sy - 1; y <= sy + 1; y++) for (x = sx - 1; x <= sx + 1; x++)
        if ((x - sx) * (x - sx) + (y - sy) * (y - sy) <= 2) only(b, x, y, c.dark, c.body);
    }
  } else if (t.pattern === 3) {
    for (y = Math.round(bcy) - 3; y <= Math.round(bcy) + 4; y += 3)
      for (x = 6; x < 26; x++) only(b, x, y, c.dark, c.body);
  }

  /* --- arms + hands --- */
  var hands = [];
  for (var side = -1; side <= 1; side += 2) {
    var ax = CX + side * (brx + 0.9), ay = bcy - 0.5, hx, hy;
    if (t.arm === 0) { var dy = sw * side * 0.9; ellO(b, ax, ay + 1 + dy, 1.3, 2.6, c.body, c.out); hx = ax; hy = ay + 3.4 + dy; }
    else if (t.arm === 1) {
      if (side > 0) { ellO(b, ax + 0.4, ay - 2, 1.3, 2.8, c.body, c.out); hx = ax + 0.8 + sw * 0.9; hy = ay - 4.9; }
      else { ellO(b, ax, ay + 1, 1.3, 2.6, c.body, c.out); hx = ax; hy = ay + 3.4; }
    } else if (t.arm === 2) { ellO(b, ax + side * 0.4, ay - 2 + sw * 0.6, 1.3, 2.8, c.body, c.out); hx = ax + side * 0.7; hy = ay - 4.7 + sw * 0.6; }
    else {
      var fl = Math.abs(sw) * 0.8;
      ellO(b, ax + side * 1.9, ay + 0.4 - fl, 2.4, 3.6 - fl, c.acc, c.out);
      ell(b, ax + side * 1.9, ay + 1.4 - fl, 1.2, 2.0, c.accL);
      hx = ax + side * 0.2; hy = ay + 3.2;
    }
    ellO(b, hx, hy, 1.4, 1.4, t.arm === 3 ? c.accD : c.dark, c.out);
    hands.push([hx, hy]);
  }

  /* --- head --- */
  ell(b, CX, HCY, HRX, HRY, c.body);
  if (t.muzzle) ell(b, CX, 15.4, 3.8, 2.4, c.pale);

  /* --- eyes --- */
  var ey = 12;
  if (blink) { rectS(b, 10, ey, 12, ey, c.eye); S(b, 9, ey - 1, c.eye); S(b, 13, ey - 1, c.eye); }
  else if (t.eye === 0) { rectS(b, 11, ey - 1, 12, ey + 1, c.eye); }
  else if (t.eye === 1) { ellS(b, 11, ey, 2.5, 3.0, c.white); ellS(b, 11, ey + 0.5, 1.6, 2.0, c.eye); S(b, 10, ey - 1, c.white); }
  else if (t.eye === 2) { rectS(b, 10, ey, 13, ey, c.eye); S(b, 9, ey - 1, c.eye); S(b, 10, ey - 1, c.eye); }
  else if (t.eye === 3) { ellS(b, 11, ey, 2.2, 2.6, c.white); ellS(b, 11, ey, 1.2, 1.4, c.eye); }
  else if (t.eye === 4) {
    S(b, 10, ey + 1, c.eye); S(b, 11, ey + 1, c.eye); S(b, 11, ey, c.eye); S(b, 12, ey, c.eye); S(b, 12, ey - 1, c.eye);
    S(b, 10, ey + 2, c.eye); S(b, 11, ey + 2, c.eye);
  }
  else if (t.eye === 5) {
    ellS(b, 11, ey, 2.3, 2.8, c.eye);
    S(b, 10, ey - 1, c.white); S(b, 11, ey - 1, c.white); S(b, 10, ey, c.white); S(b, 12, ey + 1, c.white);
  }
  else if (t.eye === 6) {
    ellS(b, 11, ey, 3.0, 3.0, c.steel); ellS(b, 11, ey, 2.0, 2.0, c.white); ellS(b, 11, ey, 1.0, 1.0, c.eye);
    rect(b, 14, ey, 17, ey, c.steel);
  }
  else { ell(b, CX, ey, 3.7, 3.7, c.white); ell(b, CX, ey + 0.4, 2.1, 2.3, c.eye); P(b, 14, ey - 1, c.white); P(b, 17, ey - 1, c.white); }

  if (t.blush) ellS(b, 9, 14.6, 1.6, 1.1, c.pink);

  /* --- mouth --- */
  var my = 15.8;
  if (t.mouth === 0) { P(b, 14, my, c.eye); P(b, 15, my + 1, c.eye); P(b, 16, my + 1, c.eye); P(b, 17, my, c.eye); }
  else if (t.mouth === 1) { rect(b, 13, my, 18, my + 2, c.eye); rect(b, 14, my, 17, my, c.white); }
  else if (t.mouth === 2) { ell(b, CX, my + 1, 1.5, 1.6, c.eye); }
  else if (t.mouth === 3) { tri(b, 15, my + 3, -1, 3, c.gold, true, 0.9); }
  else if (t.mouth === 4) {
    P(b, 13, my, c.eye); P(b, 14, my + 1, c.eye); P(b, 15, my, c.eye);
    P(b, 16, my, c.eye); P(b, 17, my + 1, c.eye); P(b, 18, my, c.eye);
  }
  else { rect(b, 14, my, 17, my, c.eye); rect(b, 15, my + 1, 16, my + 2, c.pink); }

  /* --- worn at the neck --- */
  if (t.wear === 1) { rectS(b, 10, 17, 15, 18, c.acc); rect(b, 19, 19, 20, 22 + sw, c.acc); }
  else if (t.wear === 2) { rectS(b, 11, 17, 15, 17, c.accD); rect(b, 15, 18, 16, 19, c.gold); }
  else if (t.wear === 3) { rectS(b, 11, 17, 15, 17, c.accD); ell(b, CX, 18, 1.4, 1.4, c.gold); }
  else if (t.wear === 4) { tri(b, 12, 17, 1, 3, c.acc, true, 0.8); rect(b, 15, 17, 16, 18, c.accD); }

  /* --- hat --- */
  if (t.hat === 1) { ell(b, CX, 5.4, 5.4, 3.3, c.acc); rect(b, 8, 6, 23, 7, c.accD); }
  else if (t.hat === 2) { rect(b, 11, 1, 20, 5, c.accD); rect(b, 11, 4, 20, 5, c.acc); rect(b, 7, 5, 24, 6, c.accD); }
  else if (t.hat === 3) { ell(b, CX, 6, 6.0, 4.2, c.acc); rect(b, 8, 6, 23, 7, c.accD); ell(b, CX, 2.2, 1.9, 1.9, c.pale); }
  else if (t.hat === 4) {
    rect(b, 11, 4, 20, 6, c.gold);
    tri(b, 12, 1, 1, 4, c.gold, false, 0.7); tri(b, 19, 1, 1, 4, c.gold, false, 0.7);
    tri(b, 15, 1, 1, 4, c.gold, false, 0.7); tri(b, 16, 1, 1, 4, c.gold, false, 0.7);
    P(b, 15, 5, c.acc); P(b, 16, 5, c.acc);
  }
  else if (t.hat === 5) {
    tri(b, 15, 1, 1, 7, c.accD, false, 0.75); tri(b, 16, 1, 1, 7, c.accD, false, 0.75);
    rect(b, 7, 6, 24, 7, c.acc); P(b, 15, 3, c.gold); P(b, 16, 4, c.gold);
  }
  else if (t.hat === 6) { rect(b, 8, 5, 23, 6, c.acc); tri(b, 24, 4, 1, 3, c.accL, false, 0.9); }
  else if (t.hat === 7) { var hy0 = 1 + (sw > 0 ? 1 : 0); ell(b, CX, hy0, 4.2, 1.7, c.gold); ell(b, CX, hy0, 2.5, 0.7, null); }

  /* --- held item, in the lowered right hand --- */
  if (t.item > 0) {
    var ix = hands[1][0], iy = hands[1][1];
    if (t.item === 1) { line(b, ix, iy, ix, iy - 3, c.dark, 1); ell(b, ix, iy - 4.6, 2.1, 2.1, c.accL); ell(b, ix, iy - 4.6, 0.9, 0.9, c.gold); }
    else if (t.item === 2) {
      line(b, ix, iy + 1, ix + 1, iy - 4, c.bone, 1);
      P(b, ix + 1, iy - 5, c.gold); P(b, ix, iy - 5, c.gold); P(b, ix + 2, iy - 5, c.gold);
      P(b, ix + 1, iy - 6, c.gold); P(b, ix + 1, iy - 4, c.gold);
    }
    else if (t.item === 3) { line(b, ix, iy, ix + 1, iy - 5, c.dark, 1); ell(b, ix + 1, iy - 8, 2.6, 3.0, c.acc); P(b, ix, iy - 9, c.white); }
    else if (t.item === 4) { line(b, ix, iy - 1, ix, iy - 8, c.steel, 1.6); rect(b, ix - 1, iy - 2, ix + 1, iy - 2, c.gold); }
    else { rect(b, ix - 1, iy - 4, ix + 1, iy - 1, c.pale); P(b, ix + 2, iy - 3, c.pale); rect(b, ix - 1, iy - 4, ix + 1, iy - 4, c.accD); }
  }

  /* --- top-light shading on the coat --- */
  var snap = b.slice();
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    if (snap[y * W + x] !== c.body) continue;
    if (G(snap, x, y - 3) === null) b[y * W + x] = c.light;
    else if (G(snap, x, y + 2) === null) b[y * W + x] = c.dark;
  }

  /* --- 1px outline around the whole silhouette --- */
  var snap2 = b.slice();
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    if (snap2[y * W + x] !== null) continue;
    if (G(snap2, x - 1, y) || G(snap2, x + 1, y) || G(snap2, x, y - 1) || G(snap2, x, y + 1))
      b[y * W + x] = c.out;
  }
  return b;
}

/* per-frame transform; f runs 0..1 through the behaviour cycle */
function motion(t, f) {
  var TAU = Math.PI * 2, s = Math.sin(f * TAU), o = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 }, u;
  switch (t.behavior) {
    case 0: o.dy = s * 1.5; break;
    case 1: u = Math.abs(s); o.dy = -u * 5; o.sy = 1 + u * 0.08; o.sx = 1 - u * 0.06; break;
    case 2: o.rot = s * 0.09; o.dy = -Math.abs(s); break;
    case 3: o.dy = s * 2.5; o.sx = 1 + s * 0.03; break;
    case 4: o.dx = s * 1.5; o.rot = s * 0.05; break;
    default: o.dy = -Math.abs(Math.sin(f * TAU * 2)) * 2; break;
  }
  return o;
}

var api = { W: W, H: H, normalize: normalize, traitsFor: traitsFor, render: render, motion: motion, NAMES: NAMES };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PixelPet = api;
})(typeof self !== 'undefined' ? self : this);
