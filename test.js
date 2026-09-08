/* test.js - does it actually work?  node test.js
   1. byte-stability   2. normalisation   3. no hidden state   4. how big the space really is */
var crypto = require('crypto'), assert = require('assert');
var PP = require('./pixelpet.js');

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function dump(word) {
  var t = PP.traitsFor(word), out = [];
  for (var p = 0; p < 4; p++) for (var bl = 0; bl < 2; bl++)
    out.push(PP.render(t, p, !!bl).map(function (v) { return v || '.'; }).join(''));
  return out.join('|');
}

/* ---------- 1. byte-stability: golden hashes ---------- */
var GOLDEN = {
  'green-elephant-hat': null, 'blue-jumping-penguin': null, 'diving-crow': null, 'blue-panda': null
};
Object.keys(GOLDEN).forEach(function (w) { GOLDEN[w] = sha(dump(w)); });
/* render each one 50 more times; nothing may drift */
Object.keys(GOLDEN).forEach(function (w) {
  for (var i = 0; i < 50; i++) assert.strictEqual(sha(dump(w)), GOLDEN[w], 'unstable render: ' + w);
});
console.log('1. byte-stable over repeated renders');
Object.keys(GOLDEN).forEach(function (w) { console.log('   ' + GOLDEN[w].slice(0, 16) + '  ' + w); });

/* ---------- 2. normalisation ---------- */
[['blue-panda', 'Blue Panda'], ['blue-panda', 'BLUE__PANDA'], ['blue-panda', '  blue---panda  '],
 ['blue-panda', 'blue.panda'], ['diving-crow', 'Diving/Crow!']].forEach(function (pair) {
  assert.strictEqual(dump(pair[0]), dump(pair[1]), pair[1] + ' should equal ' + pair[0]);
});
assert.notStrictEqual(dump('blue-panda'), dump('panda-blue'), 'word order must matter');
assert.notStrictEqual(dump('blue-panda'), dump('blue-pandas'));
console.log('2. normalisation holds; word order is significant');

/* ---------- 3. no hidden state ---------- */
var src = require('fs').readFileSync('./pixelpet.js', 'utf8');
['Date.', 'Math.random', 'performance.', 'toLocale', 'Intl.'].forEach(function (bad) {
  assert.ok(src.indexOf(bad) === -1, 'image path must not use ' + bad);
});
var imagePath = src.split('function motion')[0];
['Math.sin', 'Math.cos', 'Math.tan', 'Math.sqrt', 'Math.pow', '**'].forEach(function (bad) {
  assert.ok(imagePath.indexOf(bad) === -1, 'image path must not use ' + bad + ' (not bit-identical across engines)');
});
console.log('3. no clock, no RNG, no locale, no transcendental maths in the image path');

/* ---------- 4. how large is the space, really? ---------- */
/* everything render() reads.  behaviour is animation only, so it is excluded. */
function visualKey(t, hueBuckets) {
  return [Math.floor(t.hue / (360 / hueBuckets)), t.shift,
    t.body, t.ear, t.eye, t.mouth, t.hat, t.arm, t.item, t.leg, t.wear, t.pattern,
    t.tail, t.muzzle ? 1 : 0, t.blush ? 1 : 0].join(',');
}
/* reachable (arm,item) pairs after the two coupling rules */
var pairs = 0;
for (var a = 0; a < 4; a++) for (var it = 0; it < 6; it++) {
  var A = a, I = it;
  if (I > 0 && (A === 1 || A === 2)) A = 0;
  if (A === 3) I = 0;
  if (A === a && I === it) pairs++;
}
var exact = 360 * 7 * 5 * 8 * 8 * 6 * 8 * pairs * 4 * 5 * 4 * 4 * 2 * 2;
var coarse = exact / 15;                       /* 24 hue steps a person can actually tell apart */
console.log('4. distinct still avatars');
console.log('   reachable arm/item pairs : ' + pairs + ' of 24');
console.log('   exact combinations       : ' + exact.toLocaleString('en-US'));
console.log('   at 24 tellable hues      : ' + Math.round(coarse).toLocaleString('en-US'));
console.log('   x 6 movement styles      : ' + (exact * 6).toLocaleString('en-US') + ' including behaviour');

/* empirical: sample real word strings, count distinct looks and measure collisions */
var N = 2000000;
var seenExact = new Set(), seenCoarse = new Set(), fps = new Set();
for (var i = 0; i < N; i++) {
  var w = 'w' + (i % 1409) + '-x' + ((i / 1409) | 0 % 1423) + '-y' + i;
  var t = PP.traitsFor(w);
  fps.add(t.fingerprint);
  seenExact.add(visualKey(t, 360));
  if (seenCoarse.size < 4000000) seenCoarse.add(visualKey(t, 24));
}
console.log('   sampled ' + N.toLocaleString('en-US') + ' different word strings:');
console.log('     fingerprint collisions : ' + (N - fps.size));
console.log('     distinct exact looks   : ' + seenExact.size.toLocaleString('en-US')
  + '  (' + (100 * (N - seenExact.size) / N).toFixed(2) + '% shared a look with someone)');
console.log('     distinct coarse looks  : ' + seenCoarse.size.toLocaleString('en-US')
  + '  (' + (100 * (N - seenCoarse.size) / N).toFixed(2) + '% shared a coarse look)');

/* birthday estimate: share of users who collide with at least one other user */
function collidingShare(users, space) { return 1 - Math.exp(-(users - 1) / space); }
console.log('   expected share of users sharing a look with somebody:');
[10000, 100000, 1000000, 10000000].forEach(function (u) {
  console.log('     ' + String(u).padStart(9) + ' users : '
    + (100 * collidingShare(u, exact)).toFixed(2) + '% exact, '
    + (100 * collidingShare(u, coarse)).toFixed(2) + '% at 24 hues');
});

/* ---------- 5. same answer from a cold process ---------- */
var cold = require('child_process').execSync(
  'node -e "var P=require(\'./pixelpet.js\'),c=require(\'crypto\'),o=[];' +
  'var t=P.traitsFor(\'green-elephant-hat\');' +
  'for(var p=0;p<4;p++)for(var b=0;b<2;b++)o.push(P.render(t,p,!!b).map(function(v){return v||\'.\'}).join(\'\'));' +
  'process.stdout.write(c.createHash(\'sha256\').update(o.join(\'|\')).digest(\'hex\'))"',
  { cwd: __dirname }).toString();
assert.strictEqual(cold, GOLDEN['green-elephant-hat'], 'a cold process must draw the same pixels');
console.log('5. a separate cold node process produces the identical hash');

console.log('\nall checks passed');
