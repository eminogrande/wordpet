/* test-pages.js - does each page actually render?  node test-pages.js
   The modules can be perfect while the page that drives them throws on the first line.
   This runs every page's own script against a stub DOM with the real modules loaded. */
var fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');

var MODULES = {
  PixelPet: require('./pixelpet.js'),
  Wordpet2: require('./wordpet2.js'),
  Wordpet3: require('./wordpet3.js'),
  Wordpet4: require('./wordpet4.js'),
  Wordpet5: require('./wordpet5.js')
};

function stubCtx() {
  var noop = function () {};
  return {
    createImageData: function (w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    clearRect: noop, putImageData: noop, drawImage: noop, fillRect: noop, fillText: noop,
    beginPath: noop, ellipse: noop, arc: noop, fill: noop, stroke: noop,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    set fillStyle(v) {}, set strokeStyle(v) {}, set globalAlpha(v) {},
    set imageSmoothingEnabled(v) {}, set font(v) {}
  };
}
function makeEl(tag) {
  return {
    tagName: tag || 'div', style: { setProperty: function () {} }, children: [],
    className: '', textContent: '', innerHTML: '', width: 64, height: 64,
    value: 'emino', type: '', hidden: false,
    getContext: stubCtx,
    appendChild: function (c) { this.children.push(c); return c; },
    removeChild: function () {}, addEventListener: function () {}, focus: function () {},
    setAttribute: function () {}, getAttribute: function () { return null; }
  };
}

function runPage(file) {
  var ids = {}, frames = 0, written = [];
  var doc = {
    getElementById: function (id) {
      if (!ids[id]) ids[id] = makeEl('div');
      return ids[id];
    },
    querySelectorAll: function () { return [makeEl('canvas'), makeEl('canvas'), makeEl('canvas')]; },
    createElement: makeEl,
    documentElement: { style: { setProperty: function () {} } }
  };
  var sandbox = {
    window: Object.assign({}, MODULES, {
      matchMedia: function () { return { matches: false, addEventListener: function () {} }; }
    }),
    document: doc,
    MutationObserver: function () { return { observe: function () {} }; },
    getComputedStyle: function () { return { getPropertyValue: function () { return '#d3ccbd'; } }; },
    requestAnimationFrame: function (fn) { if (frames++ < 3) fn(frames * 40); },
    performance: { now: function () { return frames * 40; } },
    Object: Object, Math: Math, Array: Array, Set: Set, Map: Map, JSON: JSON,
    String: String, Number: Number, RegExp: RegExp, Date: Date, Uint8ClampedArray: Uint8ClampedArray,
    parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, console: { log: function () {} }
  };
  sandbox.self = sandbox.window;

  var page = fs.readFileSync(file, 'utf8');
  var body = page.split('<script>').pop().split('</script>')[0];
  vm.createContext(sandbox);
  vm.runInContext(body, sandbox, { filename: file });

  Object.keys(ids).forEach(function (id) {
    var e = ids[id];
    if (e.textContent || e.innerHTML || e.children.length) written.push(id);
  });
  return { frames: frames, written: written, ids: ids };
}

var PAGES = ['page.html', 'page2.html', 'page3.html', 'page4.html', 'page5.html'];
PAGES.forEach(function (f) {
  if (!fs.existsSync(f)) throw new Error('missing ' + f);
  var r = runPage(f);
  assert.ok(r.frames > 0, f + ' never asked for an animation frame');
  assert.ok(r.written.length > 0, f + ' wrote nothing into the page');
  console.log(f.padEnd(12) + ' ok  ' + r.frames + ' frames, filled: ' + r.written.join(', '));
});

/* and the built pages must carry every module their script needs */
var BUILT = {
  'docs/index.html': ['PixelPet'],
  'docs/v2/index.html': ['Wordpet2'],
  'docs/v3/index.html': ['Wordpet2', 'Wordpet3'],
  'docs/v4/index.html': ['Wordpet2', 'Wordpet3', 'Wordpet4'],
  'docs/v5/index.html': ['Wordpet2', 'Wordpet5']
};
Object.keys(BUILT).forEach(function (f) {
  var html = fs.readFileSync(f, 'utf8');
  BUILT[f].forEach(function (mod) {
    assert.ok(html.indexOf('root.' + mod + ' = api') > 0 || html.indexOf('root.' + mod + ' = ') > 0,
      f + ' is missing the ' + mod + ' module');
  });
  assert.ok(html.indexOf('<!--') === -1 || html.indexOf('<!--WORDPET') === -1,
    f + ' still contains an unfilled inlining marker');
  console.log(f.padEnd(20) + ' carries ' + BUILT[f].join(' + '));
});

console.log('\nevery page renders');
