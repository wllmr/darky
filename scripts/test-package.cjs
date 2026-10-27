const { runPython } = require('./build.cjs');

process.exitCode = runPython([
  '-m',
  'unittest',
  'discover',
  '-s',
  'tests/package',
  '-p',
  'test_*.py',
  '-v',
]);
