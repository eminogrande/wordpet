/* test2.js - v2.  node test2.js
   Checks the hash, the determinism, the phrase/picture agreement, and measures the space. */
var crypto = require('crypto'), assert = require('assert'), fs = require('fs');
var V2 = require('./wordpet2.js');

function hex(bytes) { return bytes.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
function dump(word) {
  var t = V2.traitsFor(word), out = [];
  for (var p = 0; p < 4; p++) for (var bl = 0; bl < 2; bl++)
    out.push(V2.render(t, p, !!bl).map(function (v) { return v || '.'; }).join(''));
  return out.join('|') + '#' + t.phrase + '#' + t.emoji.join('');
}
function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

/* ---------- 1. the hash is a real SHA-256 ---------- */
['', 'a', 'emino', 'blue-panda', 'eminö', 'ハチ公', '\u{1f984}pony', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(57),
 'x'.repeat(63), 'x'.repeat(64), 'x'.repeat(65), 'x'.repeat(119), 'x'.repeat(1000)].forEach(function (s) {
  assert.strictEqual(hex(V2.sha256(s)), sha(s), 'sha256 mismatch on length ' + s.length);
});
console.log('1. sha256 matches node crypto across every block boundary');

/* ---------- 2. determinism ---------- */
var GOLD = {};
['emino', 'nuri', 'blue-panda', 'green-elephant-hat'].forEach(function (w) { GOLD[w] = sha(dump(w)); });
Object.keys(GOLD).forEach(function (w) {
  for (var i = 0; i < 30; i++) assert.strictEqual(sha(dump(w)), GOLD[w], 'unstable: ' + w);
});
var cold = require('child_process').execSync(
  'node -e "var V=require(\'./wordpet2.js\'),c=require(\'crypto\'),o=[];var t=V.traitsFor(\'emino\');' +
  'for(var p=0;p<4;p++)for(var b=0;b<2;b++)o.push(V.render(t,p,!!b).map(function(v){return v||\'.\'}).join(\'\'));' +
  'process.stdout.write(c.createHash(\'sha256\').update(o.join(\'|\')+\'#\'+t.phrase+\'#\'+t.emoji.join(\'\')).digest(\'hex\'))"',
  { cwd: __dirname }).toString();
assert.strictEqual(cold, GOLD['emino'], 'a cold process must produce the same pet');
console.log('2. byte-stable, and identical from a cold process');
Object.keys(GOLD).forEach(function (w) { console.log('   ' + GOLD[w].slice(0, 16) + '  ' + w); });

/* ---------- 3. normalisation and no hidden state ---------- */
[['blue-panda', 'Blue Panda'], ['blue-panda', 'BLUE__PANDA'], ['emino', ' Emino '],
 ['blue-panda', 'blue.panda'], ['blue-panda', 'Blue / Panda!']].forEach(function (p) {
  assert.strictEqual(dump(p[0]), dump(p[1]), p[1] + ' should equal ' + p[0]);
});
/* different letters must never collapse into one identity */
[['emino', 'eminö'], ['emino', 'em1no'], ['emino', 'eminо'] /* Cyrillic o */].forEach(function (p) {
  assert.notStrictEqual(dump(p[0]), dump(p[1]), p[1] + ' must differ from ' + p[0]);
});
assert.strictEqual(V2.normalize('Eminö  Test'), 'eminö-test');
var src = fs.readFileSync('./wordpet2.js', 'utf8');
var imagePath = src.split('function motion')[0];
['Date.', 'Math.random', 'performance.', 'toLocale', 'Intl.', 'Math.sin', 'Math.cos', 'Math.sqrt', 'Math.pow']
  .forEach(function (bad) { assert.ok(imagePath.indexOf(bad) === -1, 'image path must not use ' + bad); });
console.log('3. normalisation holds; no clock, RNG, locale or transcendental maths in the image path');

/* ---------- 4. the words never disagree with the picture ---------- */
var checked = 0;
for (var i = 0; i < 60000; i++) {
  var t = V2.traitsFor('agree' + i), sp = V2.SPECIES[t.species];
  if (sp.limb === 1 || sp.sits) {
    assert.strictEqual(t.shoes, 0, sp.n + ' has no feet but was given ' + t.words.shoes);
    assert.ok(t.phrase.indexOf('bare feet') >= 0);
  }
  if (t.item !== 0) {
    var art = 'aeiou'.indexOf(t.words.item.charAt(0)) >= 0 ? 'an ' : 'a ';
    assert.ok(t.phrase.indexOf('holding ' + art + t.words.item) >= 0, 'bad article: ' + t.phrase);
  }
  assert.strictEqual(t.phrase, V2.phraseOf(t), 'phrase must be a pure function of the traits');
  checked++;
}
console.log('4. phrase and drawing agree on ' + checked.toLocaleString('en-US') + ' pets');

/* ---------- 5. the emoji really are independent of the phrase ---------- */
var byPhrase = new Map(), maxGroup = 0, groupsChecked = 0;
for (i = 0; i < 400000; i++) {
  var tt = V2.traitsFor('ind' + i), k = tt.phrase;
  if (!byPhrase.has(k)) byPhrase.set(k, new Set());
  byPhrase.get(k).add(tt.emoji.join(''));
}
byPhrase.forEach(function (emojis, phrase) {
  var n = emojis.size;
  if (n > 1) { groupsChecked++; maxGroup = Math.max(maxGroup, n); }
});
assert.ok(groupsChecked > 0, 'expected repeated phrases to carry differing emoji');
console.log('5. ' + groupsChecked.toLocaleString('en-US') + ' phrases recurred with a different emoji trio each time'
  + ' (up to ' + maxGroup + ' trios on one phrase), so the trio adds entropy rather than restating it');

/* ---------- 6. how big is the space ---------- */
/* the phrase is not a flat product: a bare head has no hat colour, bare feet no shoe colour,
   and two species have no feet at all.  Count what is actually reachable. */
var hatOpts = 1 + (V2.HATS.length - 1) * V2.ACCENTS.length;
var shoeOpts = 1 + (V2.SHOES.length - 1) * V2.ACCENTS.length;
var perSpecies = V2.COLOURS.length * V2.PATTERNS.length * V2.EYES.length * V2.ITEMS.length * hatOpts;
var footless = V2.SPECIES.filter(function (s) { return s.limb === 1 || s.sits; }).length;
var phraseSpace = perSpecies * (shoeOpts * (V2.SPECIES.length - footless) + 1 * footless);
var N = V2.EMOJI.length, emojiSpace = N * (N - 1) * (N - 2);
var total = phraseSpace * emojiSpace;

/* measured throughput, so the times below are grounded rather than guessed */
var t0 = Date.now(), R = 200000;
for (i = 0; i < R; i++) V2.traitsFor('rate' + i);
var perSec = Math.round(R / ((Date.now() - t0) / 1000));

function human(sec) {
  if (sec < 90) return sec.toFixed(1) + ' s';
  if (sec < 5400) return (sec / 60).toFixed(1) + ' min';
  if (sec < 172800) return (sec / 3600).toFixed(1) + ' h';
  if (sec < 63072000) return (sec / 86400).toFixed(1) + ' days';
  return (sec / 31557600).toFixed(1) + ' years';
}
console.log('6. size of the space');
console.log('   emoji in the pool         : ' + N);
console.log('   distinct phrases          : ' + phraseSpace.toLocaleString('en-US')
  + '  (' + (Math.log2(phraseSpace)).toFixed(1) + ' bits)');
console.log('   distinct emoji trios      : ' + emojiSpace.toLocaleString('en-US')
  + '  (' + (Math.log2(emojiSpace)).toFixed(1) + ' bits)');
console.log('   both together             : ' + total.toExponential(3)
  + '  (' + (Math.log2(total)).toFixed(1) + ' bits)');
console.log('   measured grind rate here  : ' + perSec.toLocaleString('en-US') + ' candidates/sec, single core');
console.log('   forge a matching identity, at that rate and at 10,000x that rate:');
[['colour + species + hat only', V2.COLOURS.length * V2.SPECIES.length * V2.HATS.length],
 ['the whole phrase', phraseSpace],
 ['phrase and emoji trio', total]].forEach(function (r) {
  console.log('     ' + r[0].padEnd(28) + human(r[1] / perSec).padStart(12) + '   ' + human(r[1] / (perSec * 10000)).padStart(12));
});

/* ---------- 7. accidental collisions at product scale ---------- */
var M = 1000000, seenPhrase = new Set(), seenBoth = new Set();
for (i = 0; i < M; i++) {
  var u = V2.traitsFor('u' + i + '-' + (i * 2654435761 % 1000003));
  seenPhrase.add(u.phrase);
  seenBoth.add(u.phrase + u.emoji.join(''));
}
console.log('7. one million sampled usernames');
console.log('   distinct phrases          : ' + seenPhrase.size.toLocaleString('en-US')
  + '  (' + (100 * (M - seenPhrase.size) / M).toFixed(3) + '% shared a phrase)');
console.log('   distinct phrase + emoji   : ' + seenBoth.size.toLocaleString('en-US')
  + '  (' + (100 * (M - seenBoth.size) / M).toFixed(3) + '% shared both)');
console.log('   expected share of users sharing a phrase with anybody:');
[10000, 100000, 1000000, 10000000].forEach(function (u) {
  console.log('     ' + String(u).padStart(9) + ' : ' + (100 * (1 - Math.exp(-(u - 1) / phraseSpace))).toFixed(2) + '%');
});

console.log('\nall v2 checks passed');
