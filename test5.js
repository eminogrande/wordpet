/* test5.js - v5.  node test5.js
   Same rule as v3, four more slots: picture, sentence and emoji must all say the same thing.
   Proved by rebuilding the traits from the sentence alone and from the emoji alone. */
var crypto = require('crypto'), assert = require('assert'), fs = require('fs');
var V5 = require('./wordpet5.js');

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function dump(word) {
  var t = V5.traitsFor(word), out = [];
  for (var p = 0; p < 4; p++) for (var b = 0; b < 2; b++)
    out.push(V5.renderFull(t, p, !!b).map(function (v) { return v || '.'; }).join(''));
  return out.join('|') + '#' + t.phrase + '#' + t.emojiLine + '#' + t.seal.join('');
}

/* ---------- 1. determinism ---------- */
var GOLD = {};
['emino', 'nuri', 'alice', 'blue-panda'].forEach(function (w) { GOLD[w] = sha(dump(w)); });
Object.keys(GOLD).forEach(function (w) {
  for (var i = 0; i < 20; i++) assert.strictEqual(sha(dump(w)), GOLD[w], 'unstable: ' + w);
});
var cold = require('child_process').execSync(
  'node -e "var V=require(\'./wordpet5.js\'),c=require(\'crypto\'),o=[];var t=V.traitsFor(\'emino\');' +
  'for(var p=0;p<4;p++)for(var b=0;b<2;b++)o.push(V.renderFull(t,p,!!b).map(function(v){return v||\'.\'}).join(\'\'));' +
  'process.stdout.write(c.createHash(\'sha256\').update(o.join(\'|\')+\'#\'+t.phrase+\'#\'+t.emojiLine+\'#\'+t.seal.join(\'\')).digest(\'hex\'))"',
  { cwd: __dirname }).toString();
assert.strictEqual(cold, GOLD['emino'], 'a cold process must produce the same pet');
console.log('1. byte-stable, and identical from a cold process');

/* ---------- 2. no hidden state in the image path ---------- */
var src = fs.readFileSync('./wordpet5.js', 'utf8');
var imagePath = src.split('function motion')[0];
['Date.', 'Math.random', 'performance.', 'toLocale', 'Intl.', 'Math.sin', 'Math.cos', 'Math.sqrt', 'Math.pow']
  .forEach(function (bad) { assert.ok(imagePath.indexOf(bad) === -1, 'image path must not use ' + bad); });
/* v5 has its own renderer, so check it really is independent of the older ones */
assert.ok(src.indexOf("require('./wordpet3") === -1 && src.indexOf("require('./wordpet4") === -1,
  'v5 must not depend on v3 or v4');
console.log('2. no clock, RNG, locale or transcendental maths in the image path');

/* ---------- 3. the three views carry the same information ---------- */
var KEYS = ['colour', 'species', 'hat', 'clothes', 'eyes', 'shoes', 'item1', 'item2', 'companion', 'scene'];
var N = 120000, checked = 0, seenSlots = {};
for (var i = 0; i < N; i++) {
  var t = V5.traitsFor('rt' + i);

  var fe = V5.parseEmoji(t.emojiLine);
  assert.ok(fe, 'emoji line did not parse: ' + t.emojiLine);
  var fp = V5.parsePhrase(t.phrase);
  assert.ok(fp, 'phrase did not parse: ' + t.phrase);
  KEYS.forEach(function (k) {
    assert.strictEqual(fe[k], t[k], 'emoji says ' + k + '=' + fe[k] + ', traits say ' + t[k] + ' | ' + t.emojiLine);
    assert.strictEqual(fp[k], t[k], 'phrase says ' + k + '=' + fp[k] + ', traits say ' + t[k] + ' | ' + t.phrase);
  });
  [['hat', 'hatColour'], ['clothes', 'clothesColour'], ['shoes', 'shoeColour']].forEach(function (p) {
    var want = t[p[0]] === 0 ? null : t[p[1]];
    assert.strictEqual(fe[p[1]], want); assert.strictEqual(fp[p[1]], want);
  });

  /* one emoji group per sentence slot, same order */
  var slots = t.segments.filter(function (s) { return s.trait; }).map(function (s) { return s.slot; });
  var uniq = slots.filter(function (s, j) { return slots.indexOf(s) === j; });
  assert.deepStrictEqual(uniq, V5.SLOTS, 'sentence slot order must match the emoji groups');
  assert.deepStrictEqual(t.emojiGroups.map(function (g) { return g.slot; }), V5.SLOTS);
  t.emojiGroups.forEach(function (g) { seenSlots[g.slot] = 1; });
  checked++;
}
console.log('3. ' + checked.toLocaleString('en-US') + ' pets round-tripped through the sentence and through the emoji, both directions');

/* ---------- 4. the coupling rules hold ---------- */
for (i = 0; i < 80000; i++) {
  var c = V5.traitsFor('cpl' + i), sp = V5.SPECIES[c.species];
  if (sp.sits || sp.coil || sp.limb === 1) assert.strictEqual(c.shoes, 0, sp.w + ' has no feet for a shoe');
  if (sp.limb === 2 || sp.limb === 6) { assert.strictEqual(c.item1, 0, sp.w + ' has no hands'); assert.strictEqual(c.item2, 0); }
  if (c.item1 === 0) assert.strictEqual(c.item2, 0, 'an empty first hand must mean an empty second hand');
  if (c.item2 !== 0) assert.ok(c.phrase.indexOf(' and ') > 0, 'two items must read as "X and Y"');
}
console.log('4. coupling holds: no shoes without feet, no items without hands, no lone second item');

/* ---------- 5. the seal names nothing ---------- */
var traitEmoji = {};
[V5.COLOURS, V5.SPECIES, V5.HATS, V5.EYES, V5.SHOES, V5.ITEMS, V5.CLOTHES, V5.COMPANIONS, V5.SCENES]
  .forEach(function (l) { l.forEach(function (o) { traitEmoji[o.e] = 1; }); });
for (i = 0; i < 40000; i++) {
  var ts = V5.traitsFor('seal' + i);
  ts.seal.forEach(function (e) { assert.ok(!traitEmoji[e], 'seal emoji ' + e + ' also names a trait'); });
  assert.strictEqual(new Set(ts.seal).size, 3);
}
var byPhrase = new Map();
for (i = 0; i < 400000; i++) {
  var tp = V5.traitsFor('ind' + i);
  if (!byPhrase.has(tp.phrase)) byPhrase.set(tp.phrase, new Set());
  byPhrase.get(tp.phrase).add(tp.seal.join(''));
}
var varied = 0;
byPhrase.forEach(function (s) { if (s.size > 1) varied++; });
console.log('5. seal comes from a pool of ' + V5.SEAL_POOL.length + ' emoji naming no trait; '
  + varied.toLocaleString('en-US') + ' repeated phrases carried a different seal');

/* ---------- 6. the scene stays behind the pet ---------- */
for (i = 0; i < 2000; i++) {
  var st = V5.traitsFor('scene' + i);
  var fg = V5.render(st, 0, false), bg = V5.renderScene(st), full = V5.renderFull(st, 0, false);
  for (var k = 0; k < full.length; k++) {
    assert.strictEqual(full[k], fg[k] !== null ? fg[k] : bg[k], 'compositing must put the pet in front');
  }
  if (st.scene === 0) assert.ok(bg.every(function (v) { return v === null; }), 'a plain background draws nothing');
}
console.log('6. scene composites behind the pet, and a plain background really is empty');

/* ---------- 7. size of the space ---------- */
var sz = V5.spaceSize();
var t0 = Date.now(), R = 150000;
for (i = 0; i < R; i++) V5.traitsFor('rate' + i);
var perSec = Math.round(R / ((Date.now() - t0) / 1000));
function human(sec) {
  if (sec < 90) return sec.toFixed(1) + ' s';
  if (sec < 5400) return (sec / 60).toFixed(1) + ' min';
  if (sec < 172800) return (sec / 3600).toFixed(1) + ' h';
  if (sec < 63072000) return (sec / 86400).toFixed(1) + ' days';
  return (sec / 31557600).toExponential(2) + ' years';
}
var both = sz.identities * sz.seals;
console.log('7. size of the space');
console.log('   identities the three views agree on : ' + sz.identities.toLocaleString('en-US')
  + '  (' + Math.log2(sz.identities).toFixed(1) + ' bits)');
console.log('   seals                               : ' + sz.seals.toLocaleString('en-US')
  + '  (' + Math.log2(sz.seals).toFixed(1) + ' bits)');
console.log('   both together                       : ' + both.toExponential(3)
  + '  (' + Math.log2(both).toFixed(1) + ' bits)');
console.log('   measured grind rate here            : ' + perSec.toLocaleString('en-US') + '/sec, single core');
console.log('   forge a match, one core / 10,000x:');
[['colour + species + scene', V5.COLOURS.length * V5.SPECIES.length * V5.SCENES.length],
 ['the full three-way identity', sz.identities],
 ['identity and seal', both]].forEach(function (r) {
  console.log('     ' + r[0].padEnd(30) + human(r[1] / perSec).padStart(14) + '   ' + human(r[1] / (perSec * 10000)).padStart(14));
});

/* ---------- 8. accidental collisions ---------- */
var M = 1000000, seenId = new Set();
for (i = 0; i < M; i++) seenId.add(V5.traitsFor('u' + i + '-' + (i * 2654435761 % 1000003)).phrase);
console.log('8. one million sampled usernames: ' + seenId.size.toLocaleString('en-US')
  + ' distinct identities (' + (100 * (M - seenId.size) / M).toFixed(3) + '% shared one)');
console.log('   expected share of users sharing an identity with anybody:');
[10000, 100000, 1000000, 10000000].forEach(function (u) {
  console.log('     ' + String(u).padStart(9) + ' : ' + (100 * (1 - Math.exp(-(u - 1) / sz.identities))).toFixed(3) + '%');
});

console.log('\nall v5 checks passed');
