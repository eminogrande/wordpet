/* build.js - one template per version, two outputs each.
   artifact.html / artifact2.html   body-only fragments for the Claude Artifact host
   docs/index.html (v1), docs/v2/index.html   standalone documents served by GitHub Pages */
var fs = require('fs');

function build(template, parts, fragment, page) {
  var inlined = fs.readFileSync(template, 'utf8');
  parts.forEach(function (p) {
    if (inlined.indexOf(p[0]) === -1) throw new Error(template + ' lost its ' + p[0] + ' marker');
    inlined = inlined.replace(p[0], fs.readFileSync(p[1], 'utf8'));
  });
  fs.writeFileSync(fragment, inlined);

  var cut = inlined.indexOf('</style>') + '</style>'.length;
  fs.mkdirSync(require('path').dirname(page), { recursive: true });
  fs.writeFileSync(page,
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    inlined.slice(0, cut) + '\n</head>\n<body>' + inlined.slice(cut) + '\n</body>\n</html>\n');
  console.log('built ' + fragment + ' and ' + page);
}

build('page.html',  [['<!--PIXELPET-->', 'pixelpet.js']], 'artifact.html',  'docs/index.html');
build('page2.html', [['<!--WORDPET2-->', 'wordpet2.js']],  'artifact2.html', 'docs/v2/index.html');
build('page3.html', [['<!--WORDPET2-->', 'wordpet2.js'], ['<!--WORDPET3-->', 'wordpet3.js']],
                    'artifact3.html', 'docs/v3/index.html');
