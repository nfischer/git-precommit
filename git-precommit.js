#!/usr/bin/env node
require('shelljs/global');
yaml = require('js-yaml');
fs   = require('fs');

// Change to the root of the repo
while (!test('-d', '.git/') && pwd().toString() !== '/')
  cd('..');

if (pwd().toString === '/') {
  console.error('This is not a git repo');
  exit(1);
}

var hasTravis = test('-f', '.travis.yml');

// -- No errors (for a while) --
set('-e');

var ci = {};
var ciFile;
if (hasTravis)
  ciFile = '.travis.yml';
// TODO(nate): add support for appveyor

if (ciFile) {
  echo('Extracting build steps from ' + ciFile);
  try {
    ci = yaml.safeLoad(fs.readFileSync(ciFile, 'utf8'));
  } catch (e) {
    console.error('Unable to read ' + ciFile);
  }
}

// Language
if (!ci.language) {
  if (test('-f', 'package.json'))
    ci.language = 'node';
  else if (test('-f', 'Makefile'))
    ci.language = 'c';
  else
    ci.language = 'ruby'; // Travis's default
}

ci.language = ci.language.toLowerCase();
if (ci.language.match(/node/))
  ci.language = 'node';
else if (ci.language.match(/c(\+\+)?/))
  ci.language = 'c';

// Install dependencies
if (ci.language.substr(0, 4) === 'node') {
  echo('Installing node dependencies');
  exec('npm install');
}

if (!ci.script) {
  echo('Warning: could not find any build steps. Using defaults.');
  switch(ci.language) {
    case 'node':
      ci.script = ['npm test'];
      break;
    case 'c':
      ci.script = ['./configure', 'make', 'make test'];
      break;
    default:
      ci.script = [];
  }
}

// -- Now let's catch the errors and report them --
set('+e');

var results = {};
ci.script.forEach(function (cmd) {
  if (!cmd)
    return;
  if (cmd.match(/^#.*$/))
    return;
  results[cmd] = exec(cmd).code;
});

var retCode = 0;
echo('\nSummary of build steps:');
for (var cmd in results) {
  var checkmark = '\u221A';
  var frownyface = '\u2639';
  var unicode_indicator = results[cmd] === 0 ? checkmark : frownyface;
  echo(unicode_indicator + '  $ ' + cmd);
  retCode = retCode || results[cmd];
}
exit(retCode);
