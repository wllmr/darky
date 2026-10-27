const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../../scripts/build.cjs');
const findPython = existsSync(file) ? require(file).findPython : undefined;

for (const [platform, accepted, expected] of [
  ['linux', 'python3', { command: 'python3', args: [] }],
  ['win32', 'py', { command: 'py', args: ['-3'] }],
  ['win32', 'python', { command: 'python', args: [] }],
]) {
  test(`build launcher finds ${accepted} on ${platform}`, () => {
    const interpreter = findPython(
      (command) => ({ status: command === accepted ? 0 : 1 }),
      platform,
    );
    assert.deepEqual(interpreter, expected);
  });
}

test('build launcher reports missing supported Python instead of trying to package', () => {
  assert.equal(
    findPython(() => ({ status: null, error: Error('not found') }), 'linux'),
    null,
  );
});

test('Python tasks use Windows launcher arguments and return the task exit code', () => {
  const calls = [];
  const run = (command, args) => {
    calls.push({ command, args });
    return { status: args.includes('-c') ? 0 : 17 };
  };
  const { runPython } = require(file);
  assert.equal(runPython(['-m', 'unittest'], run, 'win32'), 17);
  assert.deepEqual(calls.at(-1), { command: 'py', args: ['-3', '-m', 'unittest'] });
});
