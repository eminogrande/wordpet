/* wordpet3.js - v3.  Picture, sentence and emoji all say the same thing.
   Needs wordpet2.js loaded first (it reuses that renderer; v2 itself is unchanged).

   The rule v3 enforces, and that test3.js proves by round-tripping both ways:
     everything visible in the drawing is named in the sentence,
     everything named in the sentence has exactly one emoji,
     and nothing appears in one of the three that is missing from the other two.

   Cost of that rule: the vocabulary shrinks to what can be drawn AND named AND
   given an unambiguous emoji, so the identity space drops from v2's 51 bits to
   about 26. The separate security seal below is what puts the bits back.
*/
(function (root) {
'use strict';

var V2 = (typeof module !== 'undefined' && module.exports) ? require('./wordpet2.js') : root.Wordpet2;
if (!V2) throw new Error('wordpet3 needs wordpet2 loaded first');

/* ---------------- vocabularies: word, emoji, and the v2 index it draws as ------------- */

var NONE = '🚫';               /* the "none" marker, whichever slot it lands in */

function idx(list, name) {
  for (var i = 0; i < list.length; i++) if (list[i] === name || (list[i] && list[i].n === name)) return i;
  throw new Error('no v2 entry named ' + name);
}
function colourIdx(name) { return idx(V2.COLOURS, name); }

/* 9 colours: every one has an unmistakable emoji circle */
var COLOURS = [
  { w: 'red',    e: '🔴' }, { w: 'orange', e: '🟠' },
  { w: 'yellow', e: '🟡' }, { w: 'green',  e: '🟢' },
  { w: 'blue',   e: '🔵' }, { w: 'purple', e: '🟣' },
  { w: 'brown',  e: '🟤' }, { w: 'black',  e: '⚫' },
  { w: 'white',  e: '⚪' }
];
COLOURS.forEach(function (c) { c.v2 = colourIdx(c.w); });

/* 32 species, each with its own dedicated emoji */
var SPECIES = [
  ['elephant', '🐘'], ['giraffe', '🦒'], ['penguin', '🐧'],
  ['cat', '🐱'], ['dog', '🐶'], ['rabbit', '🐰'],
  ['bear', '🐻'], ['mouse', '🐭'], ['fox', '🦊'],
  ['owl', '🦉'], ['duck', '🦆'], ['crocodile', '🐊'],
  ['turtle', '🐢'], ['pig', '🐷'], ['cow', '🐮'],
  ['sheep', '🐑'], ['horse', '🐴'], ['monkey', '🐵'],
  ['lion', '🦁'], ['tiger', '🐯'], ['panda', '🐼'],
  ['chicken', '🐔'], ['goat', '🐐'], ['llama', '🦙'],
  ['squirrel', '🐿️'], ['hedgehog', '🦔'], ['koala', '🐨'],
  ['flamingo', '🦩'], ['dragon', '🐲'], ['wolf', '🐺'],
  ['seal', '🦭'], ['kangaroo', '🦘']
].map(function (p) { return { w: p[0], e: p[1], v2: idx(V2.SPECIES, p[0]) }; });

/* 7 hats plus none.  Every one has an emoji that means that hat on every vendor. */
var HATS = [
  { w: 'no hat',       e: NONE,             v2: 0 },
  { w: 'cap',          e: '🧢',   v2: idx(V2.HATS, 'cap') },
  { w: 'top hat',      e: '🎩',   v2: idx(V2.HATS, 'top hat') },
  { w: 'crown',        e: '👑',   v2: idx(V2.HATS, 'crown') },
  { w: 'helmet',       e: '🪖',   v2: idx(V2.HATS, 'helmet') },
  { w: 'sun hat',      e: '👒',   v2: idx(V2.HATS, 'sun hat') },
  { w: 'bow',          e: '🎀',   v2: idx(V2.HATS, 'bow') },
  { w: 'flower crown', e: '🌸',   v2: idx(V2.HATS, 'flower crown') }
];

/* 6 eye states.  These are the weakest emoji in the set; see the note in the README. */
var EYES = [
  { w: 'open eyes',   e: '👁️', v2: idx(V2.EYES, 'open eyes') },
  { w: 'closed eyes', e: '😴',       v2: idx(V2.EYES, 'closed eyes') },
  { w: 'big eyes',    e: '👀',       v2: idx(V2.EYES, 'big eyes') },
  { w: 'winking',     e: '😉',       v2: idx(V2.EYES, 'winking') },
  { w: 'angry eyes',  e: '😠',       v2: idx(V2.EYES, 'angry eyes') },
  { w: 'glasses',     e: '👓',       v2: idx(V2.EYES, 'glasses') }
];

var SHOES = [
  { w: 'bare feet', e: NONE,           v2: 0 },
  { w: 'boots',     e: '👢', v2: idx(V2.SHOES, 'boots') },
  { w: 'sneakers',  e: '👟', v2: idx(V2.SHOES, 'sneakers') },
  { w: 'sandals',   e: '🩴', v2: idx(V2.SHOES, 'sandals') }
];

var ITEMS = [
  { w: 'nothing',   e: NONE,                 v2: 0 },
  { w: 'sword',     e: '🗡️', v2: idx(V2.ITEMS, 'sword') },
  { w: 'umbrella',  e: '☔',             v2: idx(V2.ITEMS, 'umbrella') },
  { w: 'flower',    e: '🌹',       v2: idx(V2.ITEMS, 'flower') },
  { w: 'balloon',   e: '🎈',       v2: idx(V2.ITEMS, 'balloon') },
  { w: 'fish',      e: '🐟',       v2: idx(V2.ITEMS, 'fish') },
  { w: 'key',       e: '🔑',       v2: idx(V2.ITEMS, 'key') },
  { w: 'book',      e: '📕',       v2: idx(V2.ITEMS, 'book') },
  { w: 'mug',       e: '☕',             v2: idx(V2.ITEMS, 'mug') },
  { w: 'lantern',   e: '🏮',       v2: idx(V2.ITEMS, 'lantern') },
  { w: 'hammer',    e: '🔨',       v2: idx(V2.ITEMS, 'hammer') },
  { w: 'guitar',    e: '🎸',       v2: idx(V2.ITEMS, 'guitar') },
  { w: 'kite',      e: '🪁',       v2: idx(V2.ITEMS, 'kite') },
  { w: 'ice cream', e: '🍦',       v2: idx(V2.ITEMS, 'ice cream') },
  { w: 'wand',      e: '✨',             v2: idx(V2.ITEMS, 'wand') },
  { w: 'shield',    e: '🛡️', v2: idx(V2.ITEMS, 'shield') }
];

/* the security seal never describes the pet, so its pool excludes every trait emoji */
var TRAIT_EMOJI = {};
[COLOURS, SPECIES, HATS, EYES, SHOES, ITEMS].forEach(function (list) {
  list.forEach(function (o) { TRAIT_EMOJI[o.e] = true; });
});
var SEAL_POOL = V2.EMOJI.filter(function (e) { return !TRAIT_EMOJI[e]; });

/* ---------------- traits ---------------- */

function normalize(s) { return V2.normalize(s); }

function traitsFor(input) {
  var name = normalize(input), d = V2.sha256(name), i;
  var hex = '';
  for (i = 0; i < d.length; i++) hex += (d[i] < 16 ? '0' : '') + d[i].toString(16);
  function F(k) { return (d[k * 2] << 8) | d[k * 2 + 1]; }

  var t = {
    version: 3,
    name: name,
    fingerprint: hex,
    colour: F(0) % COLOURS.length,
    species: F(1) % SPECIES.length,
    hat: F(2) % HATS.length,
    hatColour: F(3) % COLOURS.length,
    eyes: F(4) % EYES.length,
    shoes: F(5) % SHOES.length,
    shoeColour: F(6) % COLOURS.length,
    item: F(7) % ITEMS.length
  };
  /* a species with no drawn feet is never described as wearing shoes */
  if (V2.SPECIES[SPECIES[t.species].v2].limb === 1 || V2.SPECIES[SPECIES[t.species].v2].sits) t.shoes = 0;

  /* the seal: three distinct emoji from digest fields the sentence never reads */
  var pool = SEAL_POOL.slice();
  t.seal = [];
  for (i = 0; i < 3; i++) t.seal.push(pool.splice(F(9 + i) % pool.length, 1)[0]);

  t.words = {
    colour: COLOURS[t.colour].w, species: SPECIES[t.species].w,
    hat: HATS[t.hat].w, hatColour: COLOURS[t.hatColour].w,
    eyes: EYES[t.eyes].w,
    shoes: SHOES[t.shoes].w, shoeColour: COLOURS[t.shoeColour].w,
    item: ITEMS[t.item].w
  };
  t.col = V2.paletteFor(COLOURS[t.colour].v2, COLOURS[t.hatColour].v2, COLOURS[t.shoeColour].v2);
  t.petName = cap(t.words.colour) + ' ' + cap(t.words.species);
  t.segments = segmentsOf(t);
  t.phrase = t.segments.map(function (s) { return s.text; }).join('');
  t.emojiGroups = emojiGroupsOf(t);
  t.emojiLine = t.emojiGroups.map(function (g) { return g.emoji; }).join(' ');
  return t;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* the v2 renderer needs a v2-shaped object; v3 draws nothing v2 cannot draw */
function toV2(t) {
  return {
    species: SPECIES[t.species].v2,
    pattern: 0,                              /* no coat pattern: no emoji names one */
    eyes: EYES[t.eyes].v2,
    hat: HATS[t.hat].v2,
    shoes: SHOES[t.shoes].v2,
    item: ITEMS[t.item].v2,
    col: t.col
  };
}
function render(t, phase, blink) { return V2.render(toV2(t), phase, blink); }
/* one idle motion for everybody: a movement trait would be visible but unnamed */
function motion(t, f) { return V2.motion({ move: 0 }, f); }

/* ---------------- the three views, built from one list ---------------- */

var SLOTS = ['creature', 'hat', 'eyes', 'shoes', 'item'];

function segmentsOf(t) {
  var w = t.words, seg = [];
  function lit(x) { seg.push({ text: x, trait: false }); }
  function slot(x, s) { seg.push({ text: x, trait: true, slot: s }); }
  lit('the ');
  slot(w.colour, 'creature'); lit(' '); slot(w.species, 'creature');
  lit(', ');
  if (t.hat === 0) slot('no hat', 'hat');
  else { slot(w.hatColour, 'hat'); lit(' '); slot(w.hat, 'hat'); }
  lit(', '); slot(w.eyes, 'eyes');
  lit(', ');
  if (t.shoes === 0) slot('bare feet', 'shoes');
  else { slot(w.shoeColour, 'shoes'); lit(' '); slot(w.shoes, 'shoes'); }
  if (t.item === 0) { lit(', holding '); slot('nothing', 'item'); }
  else { lit(', holding ' + ('aeiou'.indexOf(w.item.charAt(0)) >= 0 ? 'an ' : 'a ')); slot(w.item, 'item'); }
  return seg;
}

/* five groups, one per slot, in the same order the sentence reads them */
function emojiGroupsOf(t) {
  return [
    { slot: 'creature', emoji: COLOURS[t.colour].e + SPECIES[t.species].e,
      says: t.words.colour + ' ' + t.words.species },
    { slot: 'hat', emoji: t.hat === 0 ? NONE : COLOURS[t.hatColour].e + HATS[t.hat].e,
      says: t.hat === 0 ? 'no hat' : t.words.hatColour + ' ' + t.words.hat },
    { slot: 'eyes', emoji: EYES[t.eyes].e, says: t.words.eyes },
    { slot: 'shoes', emoji: t.shoes === 0 ? NONE : COLOURS[t.shoeColour].e + SHOES[t.shoes].e,
      says: t.shoes === 0 ? 'bare feet' : t.words.shoeColour + ' ' + t.words.shoes },
    { slot: 'item', emoji: t.item === 0 ? NONE : ITEMS[t.item].e,
      says: t.item === 0 ? 'holding nothing' : 'holding ' + t.words.item }
  ];
}

/* ---------------- reading it back ---------------- */
/* These exist so the tests can prove the three views carry the same information.
   They are also what a support agent's tool would use to check a pasted line. */

function eat(str, list) {                    /* longest emoji prefix wins */
  var best = -1, bestLen = -1;
  for (var i = 0; i < list.length; i++) {
    var e = list[i].e;
    if (e && str.slice(0, e.length) === e && e.length > bestLen) { best = i; bestLen = e.length; }
  }
  if (best < 0) return null;
  return { index: best, rest: str.slice(bestLen) };
}
function parseEmoji(line) {
  var g = String(line).trim().split(/\s+/);
  if (g.length !== 5) return null;
  var out = {}, r;
  r = eat(g[0], COLOURS); if (!r) return null; out.colour = r.index;
  r = eat(r.rest, SPECIES); if (!r || r.rest !== '') return null; out.species = r.index;

  if (g[1] === NONE) { out.hat = 0; out.hatColour = null; }
  else {
    r = eat(g[1], COLOURS); if (!r) return null; out.hatColour = r.index;
    r = eat(r.rest, HATS); if (!r || r.rest !== '' || r.index === 0) return null; out.hat = r.index;
  }
  r = eat(g[2], EYES); if (!r || r.rest !== '') return null; out.eyes = r.index;

  if (g[3] === NONE) { out.shoes = 0; out.shoeColour = null; }
  else {
    r = eat(g[3], COLOURS); if (!r) return null; out.shoeColour = r.index;
    r = eat(r.rest, SHOES); if (!r || r.rest !== '' || r.index === 0) return null; out.shoes = r.index;
  }
  if (g[4] === NONE) out.item = 0;
  else { r = eat(g[4], ITEMS); if (!r || r.rest !== '' || r.index === 0) return null; out.item = r.index; }
  return out;
}

function parsePhrase(phrase) {
  var seg = String(phrase).trim();
  if (seg.indexOf('the ') !== 0) return null;
  var body = seg.slice(4).split(', ');
  if (body.length !== 5) return null;
  var out = {}, m;

  m = body[0].split(' ');
  out.colour = wordIndex(COLOURS, m[0]); out.species = wordIndex(SPECIES, m.slice(1).join(' '));

  if (body[1] === 'no hat') { out.hat = 0; out.hatColour = null; }
  else {
    m = body[1].split(' ');
    out.hatColour = wordIndex(COLOURS, m[0]); out.hat = wordIndex(HATS, m.slice(1).join(' '));
  }
  out.eyes = wordIndex(EYES, body[2]);

  if (body[3] === 'bare feet') { out.shoes = 0; out.shoeColour = null; }
  else {
    m = body[3].split(' ');
    out.shoeColour = wordIndex(COLOURS, m[0]); out.shoes = wordIndex(SHOES, m.slice(1).join(' '));
  }
  m = body[4].replace(/^holding (an |a )?/, '');
  out.item = wordIndex(ITEMS, m);

  for (var k in out) if (out[k] === -1) return null;
  return out;
}
function wordIndex(list, word) {
  for (var i = 0; i < list.length; i++) if (list[i].w === word) return i;
  return -1;
}

/* how many identities exist, counted rather than guessed */
function spaceSize() {
  var footless = SPECIES.filter(function (s) {
    var v = V2.SPECIES[s.v2]; return v.limb === 1 || v.sits;
  }).length;
  var hatOpts = 1 + (HATS.length - 1) * COLOURS.length;
  var shoeOpts = 1 + (SHOES.length - 1) * COLOURS.length;
  var perSpecies = COLOURS.length * hatOpts * EYES.length * ITEMS.length;
  var phrases = perSpecies * (shoeOpts * (SPECIES.length - footless) + footless);
  var n = SEAL_POOL.length;
  return { phrases: phrases, seals: n * (n - 1) * (n - 2), pool: n };
}

var api = {
  W: V2.W, H: V2.H, version: 3, NONE: NONE, SLOTS: SLOTS,
  normalize: normalize, traitsFor: traitsFor, render: render, motion: motion,
  segmentsOf: segmentsOf, emojiGroupsOf: emojiGroupsOf,
  parseEmoji: parseEmoji, parsePhrase: parsePhrase, spaceSize: spaceSize, toV2: toV2,
  COLOURS: COLOURS, SPECIES: SPECIES, HATS: HATS, EYES: EYES, SHOES: SHOES, ITEMS: ITEMS,
  SEAL_POOL: SEAL_POOL
};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Wordpet3 = api;
})(typeof self !== 'undefined' ? self : this);
