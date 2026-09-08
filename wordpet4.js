/* wordpet4.js - v4.  Same three-way rule as v3, four more slots, and a scene.
   Needs wordpet2.js and wordpet3.js loaded first; both are unchanged.

   New over v3:
     scene        a place behind the pet, the only trait that still reads at 24px
     worn         scarf, tie, medal, bell, necklace, backpack, in a named colour
     two hands    both hands hold something instead of one
     companion    a small creature on the ground beside the pet
     outlines     hats and shoes get an edge against the coat so they stop blending in

   Identity space goes from v3's 46,559,232 to about 2.6e12, which is why the
   three-way rule no longer has to cost security.  The seal is still there.
*/
(function (root) {
'use strict';

var node = (typeof module !== 'undefined' && module.exports);
var V2 = node ? require('./wordpet2.js') : root.Wordpet2;
var V3 = node ? require('./wordpet3.js') : root.Wordpet3;
if (!V2 || !V3) throw new Error('wordpet4 needs wordpet2 and wordpet3 loaded first');

var W = 64, H = 64, OX = 8, OY = 12;          /* the 48x48 pet sits at this offset */
var CX = 23.5 + OX;                           /* v2's mirror axis, shifted into the bigger frame */
var NONE = V3.NONE;

/* shared vocabulary comes from v3, so the three views cannot drift apart */
var COLOURS = V3.COLOURS, SPECIES = V3.SPECIES, HATS = V3.HATS,
    EYES = V3.EYES, SHOES = V3.SHOES, ITEMS = V3.ITEMS;

var WORN = [
  { w: 'nothing worn', e: NONE },
  { w: 'scarf',    e: '🧣' },
  { w: 'tie',      e: '👔' },
  { w: 'medal',    e: '🏅' },
  { w: 'bell',     e: '🔔' },
  { w: 'necklace', e: '📿' },
  { w: 'backpack', e: '🎒' }
];
var COMPANIONS = [
  { w: 'alone',     e: NONE },
  { w: 'bee',       e: '🐝' },
  { w: 'butterfly', e: '🦋' },
  { w: 'snail',     e: '🐌' },
  { w: 'frog',      e: '🐸' },
  { w: 'ladybug',   e: '🐞' },
  { w: 'bird',      e: '🐦' },
  { w: 'crab',      e: '🦀' }
];
var SCENES = [
  { w: 'on a plain background', e: NONE },
  { w: 'in the snow',    e: '❄️' },
  { w: 'at night',       e: '🌙' },
  { w: 'in the forest',  e: '🌲' },
  { w: 'on the beach',   e: '🏖️' },
  { w: 'in the rain',    e: '🌧️' },
  { w: 'in the desert',  e: '🏜️' },
  { w: 'in space',       e: '🌌' }
];

/* the seal still names nothing: exclude every trait emoji, v4's included */
var TRAIT_EMOJI = {};
[COLOURS, SPECIES, HATS, EYES, SHOES, ITEMS, WORN, COMPANIONS, SCENES].forEach(function (l) {
  l.forEach(function (o) { TRAIT_EMOJI[o.e] = true; });
});
var SEAL_POOL = V2.EMOJI.filter(function (e) { return !TRAIT_EMOJI[e]; });

var SLOTS = ['creature', 'hat', 'worn', 'eyes', 'shoes', 'hands', 'companion', 'scene'];

/* ============================== traits ============================== */

function normalize(s) { return V2.normalize(s); }

function traitsFor(input) {
  var name = normalize(input), d = V2.sha256(name), i;
  var hex = '';
  for (i = 0; i < d.length; i++) hex += (d[i] < 16 ? '0' : '') + d[i].toString(16);
  function F(k) { return (d[k * 2] << 8) | d[k * 2 + 1]; }

  var t = {
    version: 4, name: name, fingerprint: hex,
    colour: F(0) % COLOURS.length,
    species: F(1) % SPECIES.length,
    hat: F(2) % HATS.length,
    hatColour: F(3) % COLOURS.length,
    worn: F(4) % WORN.length,
    wornColour: F(5) % COLOURS.length,
    eyes: F(6) % EYES.length,
    shoes: F(7) % SHOES.length,
    shoeColour: F(8) % COLOURS.length,
    item1: F(12) % ITEMS.length,
    item2: F(13) % ITEMS.length,
    companion: F(14) % COMPANIONS.length,
    scene: F(15) % SCENES.length
  };

  var v2sp = V2.SPECIES[SPECIES[t.species].v2];
  if (v2sp.limb === 1 || v2sp.sits) t.shoes = 0;      /* no feet, so never shoes */
  if (v2sp.limb === 2) { t.item1 = 0; t.item2 = 0; }  /* wings hold nothing */
  if (t.item1 === 0) t.item2 = 0;                     /* keeps "holding nothing" unambiguous */

  var pool = SEAL_POOL.slice();
  t.seal = [];
  for (i = 0; i < 3; i++) t.seal.push(pool.splice(F(9 + i) % pool.length, 1)[0]);

  t.words = {
    colour: COLOURS[t.colour].w, species: SPECIES[t.species].w,
    hat: HATS[t.hat].w, hatColour: COLOURS[t.hatColour].w,
    worn: WORN[t.worn].w, wornColour: COLOURS[t.wornColour].w,
    eyes: EYES[t.eyes].w,
    shoes: SHOES[t.shoes].w, shoeColour: COLOURS[t.shoeColour].w,
    item1: ITEMS[t.item1].w, item2: ITEMS[t.item2].w,
    companion: COMPANIONS[t.companion].w, scene: SCENES[t.scene].w
  };
  t.col = V2.paletteFor(COLOURS[t.colour].v2, COLOURS[t.hatColour].v2, COLOURS[t.shoeColour].v2);
  t.wornCol = V2.paletteFor(COLOURS[t.wornColour].v2, COLOURS[t.wornColour].v2, COLOURS[t.wornColour].v2);
  t.petName = cap(t.words.colour) + ' ' + cap(t.words.species);
  t.segments = segmentsOf(t);
  t.phrase = t.segments.map(function (s) { return s.text; }).join('');
  t.emojiGroups = emojiGroupsOf(t);
  t.emojiLine = t.emojiGroups.map(function (g) { return g.emoji; }).join(' ');
  /* the short form is what people say day to day */
  t.shortPhrase = t.petName + (t.hat ? ' in the ' + t.words.hatColour + ' ' + t.words.hat : '')
                + (t.scene ? ', ' + t.words.scene : '');
  return t;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ============================== the three views ============================== */

function segmentsOf(t) {
  var w = t.words, seg = [];
  function lit(x) { seg.push({ text: x, trait: false }); }
  function slot(x, s) { seg.push({ text: x, trait: true, slot: s }); }
  lit('the ');
  slot(w.colour, 'creature'); lit(' '); slot(w.species, 'creature');
  lit(', ');
  if (t.hat === 0) slot('no hat', 'hat'); else { slot(w.hatColour, 'hat'); lit(' '); slot(w.hat, 'hat'); }
  lit(', ');
  if (t.worn === 0) slot('nothing worn', 'worn'); else { slot(w.wornColour, 'worn'); lit(' '); slot(w.worn, 'worn'); }
  lit(', '); slot(w.eyes, 'eyes');
  lit(', ');
  if (t.shoes === 0) slot('bare feet', 'shoes'); else { slot(w.shoeColour, 'shoes'); lit(' '); slot(w.shoes, 'shoes'); }
  lit(', holding ');
  if (t.item1 === 0) slot('nothing', 'hands');
  else {
    lit(art(w.item1)); slot(w.item1, 'hands');
    if (t.item2 !== 0) { lit(' and ' + art(w.item2)); slot(w.item2, 'hands'); }
  }
  lit(', ');
  if (t.companion === 0) slot('alone', 'companion');
  else { lit('with ' + art(w.companion)); slot(w.companion, 'companion'); }
  lit(', '); slot(w.scene, 'scene');
  return seg;
}
function art(word) { return 'aeiou'.indexOf(word.charAt(0)) >= 0 ? 'an ' : 'a '; }

function emojiGroupsOf(t) {
  var w = t.words;
  return [
    { slot: 'creature', emoji: COLOURS[t.colour].e + SPECIES[t.species].e,
      says: w.colour + ' ' + w.species },
    { slot: 'hat', emoji: t.hat === 0 ? NONE : COLOURS[t.hatColour].e + HATS[t.hat].e,
      says: t.hat === 0 ? 'no hat' : w.hatColour + ' ' + w.hat },
    { slot: 'worn', emoji: t.worn === 0 ? NONE : COLOURS[t.wornColour].e + WORN[t.worn].e,
      says: t.worn === 0 ? 'nothing worn' : w.wornColour + ' ' + w.worn },
    { slot: 'eyes', emoji: EYES[t.eyes].e, says: w.eyes },
    { slot: 'shoes', emoji: t.shoes === 0 ? NONE : COLOURS[t.shoeColour].e + SHOES[t.shoes].e,
      says: t.shoes === 0 ? 'bare feet' : w.shoeColour + ' ' + w.shoes },
    { slot: 'hands', emoji: t.item1 === 0 ? NONE : ITEMS[t.item1].e + (t.item2 ? ITEMS[t.item2].e : ''),
      says: t.item1 === 0 ? 'holding nothing'
          : 'holding ' + w.item1 + (t.item2 ? ' and ' + w.item2 : '') },
    { slot: 'companion', emoji: t.companion === 0 ? NONE : COMPANIONS[t.companion].e,
      says: t.companion === 0 ? 'alone' : 'with a ' + w.companion },
    { slot: 'scene', emoji: t.scene === 0 ? NONE : SCENES[t.scene].e, says: w.scene }
  ];
}

/* ============================== reading it back ============================== */

function eat(str, list) {
  var best = -1, bestLen = -1;
  for (var i = 0; i < list.length; i++) {
    var e = list[i].e;
    if (e && str.slice(0, e.length) === e && e.length > bestLen) { best = i; bestLen = e.length; }
  }
  return best < 0 ? null : { index: best, rest: str.slice(bestLen) };
}
function pair(group, list, out, cKey, vKey) {
  if (group === NONE) { out[vKey] = 0; out[cKey] = null; return true; }
  var r = eat(group, COLOURS); if (!r) return false;
  out[cKey] = r.index;
  r = eat(r.rest, list); if (!r || r.rest !== '' || r.index === 0) return false;
  out[vKey] = r.index; return true;
}
function parseEmoji(line) {
  var g = String(line).trim().split(/\s+/);
  if (g.length !== 8) return null;
  var out = {}, r;
  r = eat(g[0], COLOURS); if (!r) return null; out.colour = r.index;
  r = eat(r.rest, SPECIES); if (!r || r.rest !== '') return null; out.species = r.index;
  if (!pair(g[1], HATS, out, 'hatColour', 'hat')) return null;
  if (!pair(g[2], WORN, out, 'wornColour', 'worn')) return null;
  r = eat(g[3], EYES); if (!r || r.rest !== '') return null; out.eyes = r.index;
  if (!pair(g[4], SHOES, out, 'shoeColour', 'shoes')) return null;
  if (g[5] === NONE) { out.item1 = 0; out.item2 = 0; }
  else {
    r = eat(g[5], ITEMS); if (!r || r.index === 0) return null; out.item1 = r.index;
    if (r.rest === '') out.item2 = 0;
    else { r = eat(r.rest, ITEMS); if (!r || r.rest !== '' || r.index === 0) return null; out.item2 = r.index; }
  }
  if (g[6] === NONE) out.companion = 0;
  else { r = eat(g[6], COMPANIONS); if (!r || r.rest !== '' || r.index === 0) return null; out.companion = r.index; }
  if (g[7] === NONE) out.scene = 0;
  else { r = eat(g[7], SCENES); if (!r || r.rest !== '' || r.index === 0) return null; out.scene = r.index; }
  return out;
}

function wordIndex(list, word) {
  for (var i = 0; i < list.length; i++) if (list[i].w === word) return i;
  return -1;
}
function parsePhrase(phrase) {
  var s = String(phrase).trim();
  if (s.indexOf('the ') !== 0) return null;
  var b = s.slice(4).split(', ');
  if (b.length !== 8) return null;
  var out = {}, m;

  m = b[0].split(' ');
  out.colour = wordIndex(COLOURS, m[0]); out.species = wordIndex(SPECIES, m.slice(1).join(' '));
  if (!splitPair(b[1], 'no hat', HATS, out, 'hatColour', 'hat')) return null;
  if (!splitPair(b[2], 'nothing worn', WORN, out, 'wornColour', 'worn')) return null;
  out.eyes = wordIndex(EYES, b[3]);
  if (!splitPair(b[4], 'bare feet', SHOES, out, 'shoeColour', 'shoes')) return null;

  m = b[5].replace(/^holding /, '');
  if (m === 'nothing') { out.item1 = 0; out.item2 = 0; }
  else {
    var hands = m.split(' and ');
    out.item1 = wordIndex(ITEMS, hands[0].replace(/^(an |a )/, ''));
    out.item2 = hands.length > 1 ? wordIndex(ITEMS, hands[1].replace(/^(an |a )/, '')) : 0;
    if (out.item1 === 0) return null;
  }
  out.companion = b[6] === 'alone' ? 0 : wordIndex(COMPANIONS, b[6].replace(/^with (an |a )/, ''));
  out.scene = wordIndex(SCENES, b[7]);

  for (var k in out) if (out[k] === -1) return null;
  return out;
}
function splitPair(part, noneWord, list, out, cKey, vKey) {
  if (part === noneWord) { out[vKey] = 0; out[cKey] = null; return true; }
  var m = part.split(' ');
  out[cKey] = wordIndex(COLOURS, m[0]);
  out[vKey] = wordIndex(list, m.slice(1).join(' '));
  return out[cKey] !== -1 && out[vKey] > 0;
}

/* ============================== raster ============================== */

function P(b, x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  b[y * W + x] = c;
}
function G(b, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return null;
  return b[y * W + x];
}
function ell(b, cx, cy, rx, ry, c) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.03) P(b, x, y, c);
    }
}
function rect(b, x0, y0, x1, y1, c) {
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) P(b, x, y, c);
}
function line(b, x0, y0, x1, y1, c, th) {
  th = th || 1;
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3 + 1;
  for (var i = 0; i <= n; i++) {
    var x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    if (th <= 1) P(b, x, y, c); else ell(b, x, y, th / 2, th / 2, c);
  }
}
function tri(b, ax, ay, dirY, h, c, slope) {
  for (var i = 0; i < h; i++) {
    var y = ay + dirY * i, hw = Math.round(i * slope);
    for (var x = ax - hw; x <= ax + hw; x++) P(b, x, y, c);
  }
}
function outlineLayer(b, col) {
  var snap = b.slice();
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    if (snap[y * W + x] !== null) continue;
    if (G(snap, x - 1, y) || G(snap, x + 1, y) || G(snap, x, y - 1) || G(snap, x, y + 1))
      b[y * W + x] = col;
  }
}

/* ============================== scene ============================== */

var SKY = ['', '#cfe4f2', '#1b2340', '#bcd9e8', '#bfe6f5', '#aab4c0', '#f6d9a0', '#0d0d1c'];
var LAND = ['', '#f2f7fb', '#2a3358', '#4b7a46', '#f0dfae', '#7d8794', '#e3b96f', '#1a1830'];
var HORIZON = 56;

function renderScene(t) {
  var b = new Array(W * H).fill(null), i, x, y;
  if (t.scene === 0) return b;
  var sky = SKY[t.scene], land = LAND[t.scene];
  rect(b, 0, 0, W - 1, HORIZON - 1, sky);
  rect(b, 0, HORIZON, W - 1, H - 1, land);

  if (t.scene === 1) {                               /* snow */
    for (i = 0; i < 14; i++) P(b, (i * 13 + 3) % W, (i * 17 + 5) % (HORIZON - 6), '#ffffff');
    for (i = 0; i < 5; i++) ell(b, i * 15 + 4, HORIZON + 2, 5, 2, '#ffffff');
  } else if (t.scene === 2) {                        /* night */
    for (i = 0; i < 20; i++) P(b, (i * 11 + 2) % W, (i * 23 + 3) % (HORIZON - 8), '#e8ecff');
    ell(b, 52, 10, 6, 6, '#f3e9c0'); ell(b, 49, 8, 5.4, 5.4, sky);
  } else if (t.scene === 3) {                        /* forest */
    for (i = 0; i < 6; i++) {
      var tx = i * 12 + 3, th = 12 + (i % 3) * 5;
      tri(b, tx, HORIZON - th, 1, th, '#2f5c34', 0.42);
      rect(b, tx - 1, HORIZON - 2, tx + 1, HORIZON, '#4a3722');
    }
  } else if (t.scene === 4) {                        /* beach */
    rect(b, 0, HORIZON - 8, W - 1, HORIZON - 1, '#5bbcd8');
    for (i = 0; i < 8; i++) rect(b, i * 9, HORIZON - 6 + (i % 2) * 2, i * 9 + 4, HORIZON - 6 + (i % 2) * 2, '#d8f2fb');
    ell(b, 55, 9, 5, 5, '#ffe27a');
  } else if (t.scene === 5) {                        /* rain */
    for (i = 0; i < 26; i++) {
      x = (i * 7 + 2) % W; y = (i * 19) % (HORIZON - 8);
      line(b, x, y, x - 2, y + 5, '#dbe6f2', 1);
    }
    ell(b, 14, 8, 9, 4, '#8e97a4'); ell(b, 24, 7, 7, 3.5, '#8e97a4');
  } else if (t.scene === 6) {                        /* desert */
    ell(b, 12, HORIZON + 3, 16, 7, '#d2a75c');
    ell(b, 50, HORIZON + 5, 18, 8, '#d2a75c');
    ell(b, 54, 10, 5, 5, '#f7a94b');
  } else if (t.scene === 7) {                        /* space */
    for (i = 0; i < 26; i++) P(b, (i * 9 + 4) % W, (i * 21 + 2) % (HORIZON - 4), i % 4 ? '#cfd4ff' : '#ffffff');
    ell(b, 12, 12, 7, 7, '#7a5cc4'); ell(b, 10, 10, 3, 3, '#9d7ee0');
  }
  return b;
}

/* ============================== extras drawn over the pet ============================== */

function drawWorn(b, t, a, sw) {
  if (t.worn === 0) return;
  var c = t.wornCol, ny = a.headCy + a.hy - 0.5 + OY, nx = CX;
  var half = Math.max(4, a.hr * 0.62);
  switch (t.worn) {
    case 1:                                              /* scarf */
      rect(b, nx - half, ny, nx + half, ny + 1.6, c.body);
      rect(b, nx + half - 3, ny + 2, nx + half - 1, ny + 6 + sw, c.dark);
      break;
    case 2:                                              /* tie */
      tri(b, Math.round(nx), ny + 1, 1, 3, c.body, 0.9);
      rect(b, nx - 1.4, ny + 3, nx + 1.4, ny + 8, c.body);
      rect(b, nx - 2.4, ny - 0.4, nx + 2.4, ny + 0.6, c.dark);
      break;
    case 3:                                              /* medal */
      line(b, nx - 3, ny, nx, ny + 4, c.dark, 1.4);
      line(b, nx + 3, ny, nx, ny + 4, c.dark, 1.4);
      ell(b, nx, ny + 6, 3, 3, '#f5c542'); ell(b, nx, ny + 6, 1.3, 1.3, c.body);
      break;
    case 4:                                              /* bell on a collar */
      rect(b, nx - half, ny, nx + half, ny + 1.4, c.body);
      ell(b, nx, ny + 4, 2.6, 2.6, '#f5c542'); P(b, nx, ny + 6, '#7a5a12');
      break;
    case 5:                                              /* necklace */
      for (var i = -4; i <= 4; i++) P(b, nx + i, ny + 2 + Math.abs(i) * 0.5, c.body);
      ell(b, nx, ny + 5.5, 1.8, 1.8, c.body);
      break;
    default:                                             /* backpack */
      rect(b, nx + a.bw - 1, a.bcy - 3 + OY, nx + a.bw + 4, a.bcy + 4 + OY, c.body);
      rect(b, nx + a.bw - 1, a.bcy - 1 + OY, nx + a.bw + 4, a.bcy + OY, c.dark);
      line(b, nx - 3, ny + 1, nx + 3, ny + 5, c.dark, 1.6);
      break;
  }
}

/* Items are drawn here rather than by v2 so they can be outlined, but they must sit
   BESIDE the pet: anchored outward from the hand and capped in size, or they bury it. */
function drawItem(b, t, idx, hand, dir) {
  if (idx === 0) return;
  var c = t.col, ax = hand[0] + dir * 4.5, ay = hand[1] - 2, i;
  var gold = '#f5c542', steel = '#c6ced9', wood = '#9a6b43', leaf = '#4c9a52',
      red = '#d8443c', sky = '#79c0f0', pale = '#f3ead6', ink = '#2c2733';
  switch (idx) {
    case 1:  line(b, ax, ay + 4, ax, ay - 7, steel, 2.0);
             rect(b, ax - 2.6, ay + 1, ax + 2.6, ay + 1, gold);
             rect(b, ax - 0.8, ay + 3, ax + 0.8, ay + 5, wood); break;
    case 2:  /* the hook is what says umbrella rather than mushroom, so make it big */
             line(b, ax, ay + 4, ax, ay - 3, wood, 1.0);
             P(b, ax, ay + 5, wood); P(b, ax + 1, ay + 6, wood);
             P(b, ax + 2, ay + 6, wood); P(b, ax + 3, ay + 5, wood);
             rect(b, ax - 2, ay - 6, ax + 2, ay - 6, red);
             rect(b, ax - 4, ay - 5, ax + 4, ay - 5, red);
             rect(b, ax - 6, ay - 4, ax + 6, ay - 4, red);
             rect(b, ax - 2, ay - 5, ax + 2, ay - 4, pale);
             rect(b, ax - 6, ay - 3, ax - 5, ay - 3, red);
             rect(b, ax - 1, ay - 3, ax + 1, ay - 3, pale);
             rect(b, ax + 5, ay - 3, ax + 6, ay - 3, red); break;
    case 3:  line(b, ax, ay + 5, ax, ay - 1, leaf, 1.2); ell(b, ax - 2.2, ay + 1.6, 1.6, 1.1, leaf);
             ell(b, ax, ay - 3.4, 1.9, 1.9, '#f2839f'); ell(b, ax - 2.4, ay - 2.0, 1.5, 1.5, '#f2839f');
             ell(b, ax + 2.4, ay - 2.0, 1.5, 1.5, '#f2839f'); ell(b, ax - 1.4, ay - 5.4, 1.5, 1.5, '#f2839f');
             ell(b, ax + 1.4, ay - 5.4, 1.5, 1.5, '#f2839f'); ell(b, ax, ay - 3.4, 0.9, 0.9, gold); break;
    case 4:  line(b, ax, ay + 5, ax, ay - 1, ink, 1);
             ell(b, ax, ay - 5.0, 3.2, 3.6, red); P(b, ax - 1.2, ay - 6.4, '#ffffff'); break;
    case 5:  ell(b, ax, ay + 1, 3.8, 2.2, sky);
             for (i = 0; i < 3; i++) rect(b, ax + 3.6 + i, ay - 1.4 + i, ax + 3.6 + i, ay + 3.4 - i, sky);
             P(b, ax - 1.8, ay + 0.2, ink); break;
    case 6:  ell(b, ax, ay - 3.4, 2.4, 2.4, gold); ell(b, ax, ay - 3.4, 1.0, 1.0, null);
             rect(b, ax - 0.6, ay - 1, ax + 0.6, ay + 4, gold);
             rect(b, ax, ay + 1.4, ax + 2.0, ay + 1.4, gold);
             rect(b, ax, ay + 4, ax + 1.8, ay + 4, gold); break;
    case 7:  rect(b, ax - 3.6, ay - 3, ax + 3.6, ay + 3, '#3f7f86');
             rect(b, ax - 3.6, ay - 3, ax - 2.2, ay + 3, '#2b5a60');
             rect(b, ax - 1.2, ay - 1.4, ax + 2.6, ay - 1.4, '#ffffff');
             rect(b, ax - 1.2, ay + 0.6, ax + 2.6, ay + 0.6, '#ffffff'); break;
    case 8:  rect(b, ax - 2.4, ay - 2.6, ax + 1.6, ay + 2.6, pale);
             rect(b, ax - 2.4, ay - 2.6, ax + 1.6, ay - 1.6, '#a9542f');
             ell(b, ax + 3.4, ay + 0.2, 1.7, 1.7, pale); ell(b, ax + 3.4, ay + 0.2, 0.7, 0.7, null); break;
    case 9:  line(b, ax, ay + 4, ax, ay + 1, steel, 1.0);
             rect(b, ax - 2.4, ay - 3.4, ax + 2.4, ay + 0.6, '#e0483c');
             rect(b, ax - 1.4, ay - 2.6, ax + 1.4, ay - 0.2, '#ffd98a');
             rect(b, ax - 3, ay - 4.4, ax + 3, ay - 3.6, '#8d2f26'); break;
    case 10: line(b, ax, ay + 5, ax, ay - 1, wood, 1.8);
             rect(b, ax - 3.2, ay - 4.6, ax + 3.2, ay - 1.8, steel);
             rect(b, ax - 3.2, ay - 4.6, ax - 1.0, ay - 1.8, '#8e97a4'); break;
    case 11: ell(b, ax, ay + 1.6, 3.2, 4.0, wood); ell(b, ax, ay + 2.0, 1.2, 1.2, '#3a2a18');
             line(b, ax, ay - 2.2, ax, ay - 7, '#6f4a2c', 1.6);
             for (i = 0; i < 3; i++) P(b, ax - 1 + i, ay - 8, steel); break;
    case 12: ell(b, ax, ay - 2.6, 4.0, 4.0, '#e08a3c');
             line(b, ax - 3.6, ay - 2.6, ax + 3.6, ay - 2.6, '#9c5a20', 1);
             line(b, ax, ay - 6.4, ax, ay + 1.2, '#9c5a20', 1);
             line(b, ax, ay + 1.4, ax - dir, ay + 5, ink, 1); break;
    case 13: tri(b, Math.round(ax), ay + 5, -1, 5, '#c98d4e', 0.45);
             ell(b, ax, ay - 1.6, 2.9, 2.7, pale);
             ell(b, ax - 1.0, ay - 3.6, 2.1, 1.9, '#f0a6c0'); break;
    case 14: line(b, ax, ay + 5, ax, ay - 2, wood, 1.2);
             [[0,0],[-1,1],[1,1],[0,1],[0,2],[-2,1],[2,1],[0,-1]].forEach(function (p) {
               P(b, ax + p[0], ay - 4 + p[1], gold);
             }); break;
    default: ell(b, ax, ay, 3.8, 4.8, steel); ell(b, ax, ay, 2.3, 3.1, '#4a6fb5');
             ell(b, ax, ay, 0.9, 1.2, gold); break;
  }
}

function drawCompanion(b, t, a, sw) {
  if (t.companion === 0) return;
  var flies = (t.companion === 1 || t.companion === 2 || t.companion === 6);
  var gx = 11, gy = flies ? 31 : 55;
  var black = '#241f2b', white = '#ffffff';
  switch (t.companion) {
    case 1: ell(b, gx, gy, 3.4, 2.6, '#f2c33d');                       /* bee */
            rect(b, gx - 1.4, gy - 2.6, gx - 0.4, gy + 2.6, black);
            rect(b, gx + 1.0, gy - 2.6, gx + 2.0, gy + 2.6, black);
            ell(b, gx - 1, gy - 4 - sw, 2.4, 1.4, '#e8f2ff');
            ell(b, gx + 2, gy - 4 + sw, 2.4, 1.4, '#e8f2ff'); break;
    case 2: ell(b, gx - 3, gy - 2 - sw, 3.0, 3.6, '#e86ea8');          /* butterfly */
            ell(b, gx + 3, gy - 2 + sw, 3.0, 3.6, '#e86ea8');
            ell(b, gx - 3, gy + 1.6, 2.2, 2.0, '#f7b3d2');
            ell(b, gx + 3, gy + 1.6, 2.2, 2.0, '#f7b3d2');
            rect(b, gx - 0.6, gy - 5, gx + 0.6, gy + 3, black); break;
    case 3: ell(b, gx - 3, gy + 2, 4.0, 1.8, '#d9c08d');               /* snail */
            ell(b, gx + 1, gy - 0.5, 3.6, 3.6, '#b5762f');
            ell(b, gx + 1, gy - 0.5, 1.8, 1.8, '#d9a05a');
            P(b, gx - 5, gy - 1, '#d9c08d'); P(b, gx - 5, gy - 2, '#d9c08d'); break;
    case 4: ell(b, gx, gy + 0.5, 4.0, 3.2, '#4fa84f');                 /* frog */
            ell(b, gx - 2, gy - 2.6, 1.9, 1.9, white); ell(b, gx + 2, gy - 2.6, 1.9, 1.9, white);
            P(b, gx - 2, gy - 2.6, black); P(b, gx + 2, gy - 2.6, black);
            rect(b, gx - 2, gy + 2, gx + 2, gy + 2, '#2f7a34'); break;
    case 5: ell(b, gx, gy, 3.6, 3.2, '#d43b34');                       /* ladybug */
            rect(b, gx - 0.5, gy - 3.2, gx + 0.5, gy + 3.2, black);
            ell(b, gx, gy - 3.4, 2.0, 1.6, black);
            P(b, gx - 2, gy - 0.4, black); P(b, gx + 2, gy + 1, black); break;
    case 6: ell(b, gx, gy, 3.4, 3.0, '#5b8fd4');                       /* bird */
            ell(b, gx - 1, gy - 3.2, 2.4, 2.2, '#5b8fd4');
            tri(b, Math.round(gx - 4), gy - 3, 0, 1, '#f2a33d', 0);
            P(b, gx - 4, gy - 3, '#f2a33d'); P(b, gx - 5, gy - 3, '#f2a33d');
            P(b, gx - 1, gy - 3.6, black);
            ell(b, gx + 1.4, gy + 0.4, 1.8, 1.2, '#3f6ba8'); break;
    default: ell(b, gx, gy + 0.5, 4.0, 2.6, '#e0562f');                /* crab */
            for (var s = -1; s <= 1; s += 2) {
              ell(b, gx + s * 5.4, gy - 1.6 - (s > 0 ? sw : -sw), 2.0, 1.8, '#e0562f');
              P(b, gx + s * 3.6, gy - 0.4, '#e0562f');
              rect(b, gx + s * 2.6, gy + 2.4, gx + s * 3.4, gy + 2.4, '#e0562f');
            }
            P(b, gx - 1.6, gy - 1.6, black); P(b, gx + 1.6, gy - 1.6, black); break;
  }
}

/* ============================== render ============================== */

function toV2(t) {
  return {
    species: SPECIES[t.species].v2, pattern: 0, eyes: EYES[t.eyes].v2,
    hat: HATS[t.hat].v2, shoes: SHOES[t.shoes].v2, item: 0, col: t.col
  };
}

/* pet layer only: transparent background, so the scene can stay still while the pet moves */
function render(t, phase, blink) {
  var b = new Array(W * H).fill(null);
  var inner = V2.render(toV2(t), phase, blink);
  var x, y, i;
  for (y = 0; y < V2.H; y++) for (x = 0; x < V2.W; x++) {
    var v = inner[y * V2.W + x];
    if (v) b[(y + OY) * W + (x + OX)] = v;
  }

  /* give hats and shoes an edge against the coat, so they stop blending into it */
  var c = t.col;
  var accent = {}, coat = {};
  [c.hat, c.hatD, c.hatL, c.shoe, c.shoeD].forEach(function (k) { accent[k] = 1; });
  [c.body, c.light, c.dark, c.pale].forEach(function (k) { coat[k] = 1; });
  var snap = b.slice();
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    if (!coat[snap[y * W + x]]) continue;
    if (accent[G(snap, x - 1, y)] || accent[G(snap, x + 1, y)] ||
        accent[G(snap, x, y - 1)] || accent[G(snap, x, y + 1)]) b[y * W + x] = c.out;
  }

  /* everything v4 adds goes on its own layer so it can be outlined as a group */
  var sw = [0, 1, 0, -1][phase & 3];
  var a = V2.anatomy(SPECIES[t.species].v2, sw);
  var extras = new Array(W * H).fill(null);
  drawWorn(extras, t, a, sw);
  if (t.item1) drawItem(extras, t, t.item1, [a.hands[1][0] + OX, a.hands[1][1] + OY], 1);
  if (t.item2) drawItem(extras, t, t.item2, [a.hands[0][0] + OX, a.hands[0][1] + OY], -1);
  drawCompanion(extras, t, a, sw);
  outlineLayer(extras, c.out);
  for (i = 0; i < extras.length; i++) if (extras[i]) b[i] = extras[i];
  return b;
}

/* scene behind, pet in front, for a still image */
function renderFull(t, phase, blink) {
  var bg = renderScene(t), fg = render(t, phase, blink);
  for (var i = 0; i < bg.length; i++) if (fg[i]) bg[i] = fg[i];
  return bg;
}

function motion(t, f) { return V2.motion({ move: 0 }, f); }

function spaceSize() {
  var footless = 0, wingless = 0;
  SPECIES.forEach(function (s) {
    var v = V2.SPECIES[s.v2];
    if (v.limb === 1 || v.sits) footless++;
    if (v.limb === 2) wingless++;
  });
  var hatOpts = 1 + (HATS.length - 1) * COLOURS.length;
  var wornOpts = 1 + (WORN.length - 1) * COLOURS.length;
  var shoeOpts = 1 + (SHOES.length - 1) * COLOURS.length;
  var n = ITEMS.length - 1;
  var handOpts = 1 + n + n * n;                     /* none, one item, or two */
  var perSpecies = 0;
  SPECIES.forEach(function (s) {
    var v = V2.SPECIES[s.v2];
    perSpecies += ((v.limb === 1 || v.sits) ? 1 : shoeOpts) * ((v.limb === 2) ? 1 : handOpts);
  });
  var identities = COLOURS.length * hatOpts * wornOpts * EYES.length *
                   COMPANIONS.length * SCENES.length * perSpecies;
  var p = SEAL_POOL.length;
  return { identities: identities, seals: p * (p - 1) * (p - 2), pool: p,
           footless: footless, wingless: wingless };
}

var api = {
  W: W, H: H, OX: OX, OY: OY, version: 4, NONE: NONE, SLOTS: SLOTS, HORIZON: HORIZON,
  normalize: normalize, traitsFor: traitsFor,
  render: render, renderScene: renderScene, renderFull: renderFull, motion: motion,
  segmentsOf: segmentsOf, emojiGroupsOf: emojiGroupsOf,
  parseEmoji: parseEmoji, parsePhrase: parsePhrase, spaceSize: spaceSize, toV2: toV2,
  COLOURS: COLOURS, SPECIES: SPECIES, HATS: HATS, EYES: EYES, SHOES: SHOES, ITEMS: ITEMS,
  WORN: WORN, COMPANIONS: COMPANIONS, SCENES: SCENES, SEAL_POOL: SEAL_POOL
};
if (node) module.exports = api; else root.Wordpet4 = api;
})(typeof self !== 'undefined' ? self : this);
