/* build.js - one template per version, two outputs each.
   artifact.html / artifact2.html   body-only fragments for the Claude Artifact host
   docs/index.html (v1), docs/v2/index.html   standalone documents served by GitHub Pages */
var fs = require('fs');

function build(template, algoFile, marker, fragment, page) {
  var src = fs.readFileSync(template, 'utf8'), algo = fs.readFileSync(algoFile, 'utf8');
  if (src.indexOf(marker) === -1) throw new Error(template + ' lost its ' + marker + ' marker');
  var inlined = src.replace(marker, algo);
  fs.writeFileSync(fragment, inlined);

  var cut = inlined.indexOf('</style>') + '</style>'.length;
  fs.mkdirSync(require('path').dirname(page), { recursive: true });
  fs.writeFileSync(page,
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    inlined.slice(0, cut) + '\n</head>\n<body>' + inlined.slice(cut) + '\n</body>\n</html>\n');
  console.log('built ' + fragment + ' and ' + page);
}

build('page.html',  'pixelpet.js',  '<!--PIXELPET-->',  'artifact.html',  'docs/index.html');
build('page2.html', 'wordpet2.js',  '<!--WORDPET2-->',  'artifact2.html', 'docs/v2/index.html');
