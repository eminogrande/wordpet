/* test3.js - v3.  node test3.js
   The point of v3 is that picture, sentence and emoji all say the same thing.
   That is not a promise here, it is a round trip: the traits are reconstructed
   from the sentence alone and from the emoji alone, and both must match. */
var crypto = require('crypto'), assert = require('assert'), fs = require('fs');
var V3 = require('./wordpet3.js');
var V2 = require('./wordpet2.js');

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function dump(word) {
  var t = V3.traitsFor(word), out = [];
  for (var p = 0; p < 4; p++) for (var b = 0; b < 2; b++)
    out.push(V3.render(t, p, !!b).map(function (v) { return v || '.'; }).join(''));
  return out.join('|') + '#' + t.phrase + '#' + t.emojiLine + '#' + t.seal.join('');
}

/* ---------- 1. determinism ---------- */
var GOLD = {};
['emino', 'nuri', 'alice', 'blue-panda'].forEach(function (w) { GOLD[w] = sha(dump(w)); });
Object.keys(GOLD).forEach(function (w) {
  for (var i = 0; i < 25; i++) assert.strictEqual(sha(dump(w)), GOLD[w], 'unstable: ' + w);
});
var cold = require('child_process').execSync(
  'node -e "var V=require(\'./wordpet3.js\'),c=require(\'crypto\'),o=[];var t=V.traitsFor(\'emino\');' +
  'for(var p=0;p<4;p++)for(var b=0;b<2;b++)o.push(V.render(t,p,!!b).map(function(v){return v||\'.\'}).join(\'\'));' +
  'process.stdout.write(c.createHash(\'sha256\').update(o.join(\'|\')+\'#\'+t.phrase+\'#\'+t.emojiLine+\'#\'+t.seal.join(\'\')).digest(\'hex\'))"',
  { cwd: __dirname }).toString();
assert.strictEqual(cold, GOLD['emino'], 'a cold process must produce the same pet');
console.log('1. byte-stable, and identical from a cold process');

/* ---------- 2. the three views carry the same information ---------- */
var N = 150000, checked = 0;
for (var i = 0; i < N; i++) {
  var t = V3.traitsFor('rt' + i);

  var fromEmoji = V3.parseEmoji(t.emojiLine);
  assert.ok(fromEmoji, 'emoji line did not parse: ' + t.emojiLine);
  var fromPhrase = V3.parsePhrase(t.phrase);
  assert.ok(fromPhrase, 'phrase did not parse: ' + t.phrase);

  ['colour', 'species', 'hat', 'eyes', 'shoes', 'item'].forEach(function (k) {
    assert.strictEqual(fromEmoji[k], t[k], 'emoji says ' + k + '=' + fromEmoji[k] + ', traits say ' + t[k]);
    assert.strictEqual(fromPhrase[k], t[k], 'phrase says ' + k + '=' + fromPhrase[k] + ', traits say ' + t[k]);
  });
  /* the colour of a slot only exists when that slot is worn */
  assert.strictEqual(fromEmoji.hatColour, t.hat === 0 ? null : t.hatColour);
  assert.strictEqual(fromPhrase.hatColour, t.hat === 0 ? null : t.hatColour);
  assert.strictEqual(fromEmoji.shoeColour, t.shoes === 0 ? null : t.shoeColour);
  assert.strictEqual(fromPhrase.shoeColour, t.shoes === 0 ? null : t.shoeColour);

  /* the picture is drawn from exactly these traits and nothing else */
  var v2 = V3.toV2(t);
  assert.strictEqual(v2.species, V3.SPECIES[t.species].v2);
  assert.strictEqual(v2.hat, V3.HATS[t.hat].v2);
  assert.strictEqual(v2.eyes, V3.EYES[t.eyes].v2);
  assert.strictEqual(v2.shoes, V3.SHOES[t.shoes].v2);
  assert.strictEqual(v2.item, V3.ITEMS[t.item].v2);
  assert.strictEqual(v2.pattern, 0, 'v3 draws no coat pattern, because no emoji names one');

  /* one emoji group per sentence slot, in the same order */
  var slots = t.segments.filter(function (s) { return s.trait; }).map(function (s) { return s.slot; });
  var uniq = slots.filter(function (s, j) { return slots.indexOf(s) === j; });
  assert.deepStrictEqual(uniq, V3.SLOTS, 'sentence slot order must match the emoji groups');
  assert.deepStrictEqual(t.emojiGroups.map(function (g) { return g.slot; }), V3.SLOTS);
  checked++;
}
console.log('2. ' + checked.toLocaleString('en-US') + ' pets round-tripped: traits -> sentence -> traits, and traits -> emoji -> traits');

/* ---------- 3. nothing is drawn that the words do not name ---------- */
var drawn = { species: {}, hat: {}, eyes: {}, shoes: {}, item: {} };
for (i = 0; i < 60000; i++) {
  var tt = V3.traitsFor('cov' + i), v = V3.toV2(tt);
  drawn.species[v.species] = 1; drawn.hat[v.hat] = 1; drawn.eyes[v.eyes] = 1;
  drawn.shoes[v.shoes] = 1; drawn.item[v.item] = 1;
}
assert.strictEqual(Object.keys(drawn.species).length, V3.SPECIES.length);
assert.strictEqual(Object.keys(drawn.hat).length, V3.HATS.length);
assert.strictEqual(Object.keys(drawn.eyes).length, V3.EYES.length);
assert.strictEqual(Object.keys(drawn.item).length, V3.ITEMS.length);
console.log('3. every drawable value is reachable and named: '
  + V3.SPECIES.length + ' species, ' + V3.HATS.length + ' hats, '
  + V3.EYES.length + ' eye states, ' + V3.SHOES.length + ' shoe types, ' + V3.ITEMS.length + ' items');

/* ---------- 4. the seal never describes the pet ---------- */
var traitEmoji = {};
[V3.COLOURS, V3.SPECIES, V3.HATS, V3.EYES, V3.SHOES, V3.ITEMS].forEach(function (l) {
  l.forEach(function (o) { traitEmoji[o.e] = 1; });
});
for (i = 0; i < 40000; i++) {
  var ts = V3.traitsFor('seal' + i);
  ts.seal.forEach(function (e) { assert.ok(!traitEmoji[e], 'seal emoji ' + e + ' also names a trait'); });
  assert.strictEqual(new Set(ts.seal).size, 3, 'seal emoji must be distinct');
}
/* and it varies while the phrase stays put, so it is not a restatement */
var byPhrase = new Map();
for (i = 0; i < 400000; i++) {
  var tp = V3.traitsFor('ind' + i);
  if (!byPhrase.has(tp.phrase)) byPhrase.set(tp.phrase, new Set());
  byPhrase.get(tp.phrase).add(tp.seal.join(''));
}
var varied = 0, biggest = 0;
byPhrase.forEach(function (s) { if (s.size > 1) { varied++; biggest = Math.max(biggest, s.size); } });
assert.ok(varied > 0, 'expected repeated phrases to carry different seals');
console.log('4. seal is drawn from a pool of ' + V3.SEAL_POOL.length + ' emoji that name no trait; '
  + varied.toLocaleString('en-US') + ' repeated phrases carried a different seal (up to ' + biggest + ' on one phrase)');

/* ---------- 5. the size of the space, and what the rule costs ---------- */
var sz = V3.spaceSize();
var t0 = Date.now(), R = 200000;
for (i = 0; i < R; i++) V3.traitsFor('rate' + i);
var perSec = Math.round(R / ((Date.now() - t0) / 1000));
function human(sec) {
  if (sec < 90) return sec.toFixed(1) + ' s';
  if (sec < 5400) return (sec / 60).toFixed(1) + ' min';
  if (sec < 172800) return (sec / 3600).toFixed(1) + ' h';
  if (sec < 63072000) return (sec / 86400).toFixed(1) + ' days';
  return (sec / 31557600).toFixed(1) + ' years';
}
var both = sz.phrases * sz.seals;
console.log('5. size of the space');
console.log('   identities the three views agree on : ' + sz.phrases.toLocaleString('en-US')
  + '  (' + Math.log2(sz.phrases).toFixed(1) + ' bits)');
console.log('   seals                               : ' + sz.seals.toLocaleString('en-US')
  + '  (' + Math.log2(sz.seals).toFixed(1) + ' bits)');
console.log('   both together                       : ' + both.toExponential(3)
  + '  (' + Math.log2(both).toFixed(1) + ' bits)');
console.log('   measured grind rate here            : ' + perSec.toLocaleString('en-US') + '/sec, single core');
console.log('   forge a match, one core / 10,000x:');
[['colour + species + hat', V3.COLOURS.length * V3.SPECIES.length * V3.HATS.length],
 ['the full three-way identity', sz.phrases],
 ['identity and seal', both]].forEach(function (r) {
  console.log('     ' + r[0].padEnd(30) + human(r[1] / perSec).padStart(12) + '   ' + human(r[1] / (perSec * 10000)).padStart(12));
});

/* ---------- 6. accidental collisions ---------- */
var M = 1000000, seenId = new Set(), seenBoth = new Set();
for (i = 0; i < M; i++) {
  var u = V3.traitsFor('u' + i + '-' + (i * 2654435761 % 1000003));
  seenId.add(u.phrase);
  seenBoth.add(u.phrase + u.seal.join(''));
}
console.log('6. one million sampled usernames');
console.log('   distinct identities   : ' + seenId.size.toLocaleString('en-US')
  + '  (' + (100 * (M - seenId.size) / M).toFixed(2) + '% shared one)');
console.log('   distinct with the seal: ' + seenBoth.size.toLocaleString('en-US')
  + '  (' + (100 * (M - seenBoth.size) / M).toFixed(3) + '% shared both)');
console.log('   expected share of users sharing an identity with anybody:');
[10000, 100000, 1000000, 10000000].forEach(function (u) {
  console.log('     ' + String(u).padStart(9) + ' : ' + (100 * (1 - Math.exp(-(u - 1) / sz.phrases))).toFixed(2) + '%');
});

console.log('\nall v3 checks passed');
