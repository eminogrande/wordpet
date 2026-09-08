/* build.js - one template, two outputs.
   artifact.html  body-only fragment for the Claude Artifact host
   docs/index.html  standalone document served by GitHub Pages */
var fs = require('fs');
var page = fs.readFileSync('page.html', 'utf8');
var algo = fs.readFileSync('pixelpet.js', 'utf8');

if (page.indexOf('<!--PIXELPET-->') === -1) throw new Error('page.html lost its <!--PIXELPET--> marker');
var inlined = page.replace('<!--PIXELPET-->', algo);

fs.writeFileSync('artifact.html', inlined);

var cut = inlined.indexOf('</style>') + '</style>'.length;
var head = inlined.slice(0, cut), body = inlined.slice(cut);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/index.html',
  '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  head + '\n</head>\n<body>' + body + '\n</body>\n</html>\n');

console.log('built artifact.html and docs/index.html');
