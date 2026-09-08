/* grind.js - how hard is it to DELIBERATELY forge a matching pet?
   Accidental collisions are one question; an attacker grinding addresses is the real one. */
var PP = require('./pixelpet.js');

/* what a person actually registers, at three levels of attention */
var LEVELS = {
  'half a glance (colour, hat, shape)': function (t) {
    return [Math.floor(t.hue / 30), t.hat, t.body].join(',');
  },
  'a proper look (adds ears, eyes, mouth, legs)': function (t) {
    return [Math.floor(t.hue / 30), t.hat, t.body, t.ear, t.eye, t.mouth, t.leg].join(',');
  },
  'pixel-perfect comparison': function (t) {
    return [t.hue, t.shift, t.body, t.ear, t.eye, t.mouth, t.hat, t.arm, t.item,
            t.leg, t.wear, t.pattern, t.tail, t.muzzle ? 1 : 0, t.blush ? 1 : 0].join(',');
  }
};
var SPACE = {
  'half a glance (colour, hat, shape)': 12 * 8 * 5,
  'a proper look (adds ears, eyes, mouth, legs)': 12 * 8 * 5 * 8 * 8 * 6 * 4,
  'pixel-perfect comparison': 445906944000
};

var targets = ['blue-panda', 'diving-crow', 'green-elephant-hat', 'quantum-tapir', 'midnight-koi'];
var CAP = 40000000;

Object.keys(LEVELS).forEach(function (level) {
  var key = LEVELS[level], tries = [], t0 = Date.now();
  targets.forEach(function (target) {
    var want = key(PP.traitsFor(target)), n = 0;
    while (n < CAP) { n++; if (key(PP.traitsFor('forge' + n + 'x' + target)) === want) break; }
    tries.push(n);
  });
  var done = tries.filter(function (n) { return n < CAP; });
  var avg = done.length ? Math.round(done.reduce(function (a, b) { return a + b; }, 0) / done.length) : null;
  var secs = (Date.now() - t0) / 1000;
  console.log('\n' + level);
  console.log('  distinct states a viewer distinguishes : ' + SPACE[level].toLocaleString('en-US'));
  console.log('  forgeries found                        : ' + done.length + ' of ' + targets.length);
  if (avg) console.log('  average addresses ground per forgery   : ' + avg.toLocaleString('en-US'));
  console.log('  wall clock for all ' + targets.length + ' attempts          : ' + secs.toFixed(1) + 's on this laptop, single core');
});
