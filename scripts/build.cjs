const { spawnSync } = require('node:child_process');
const path = require('node:path');

function findPython(run = spawnSync, platform = process.platform) {
  const python = { command: 'python', args: [] };
  const python3 = { command: 'python3', args: [] };
  const launcher = { command: 'py', args: ['-3'] };
  const candidates = platform === 'win32' ? [launcher, python, python3] : [python3, python];
  for (const candidate of candidates) {
    const result = run(
      candidate.command,
      [...candidate.args, '-c', 'import sys; sys.exit(sys.version_info < (3, 9))'],
      { stdio: 'ignore', windowsHide: true },
    );
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

function runPython(arguments_, run = spawnSync, platform = process.platform) {
  const python = findPython(run, platform);
  if (!python) {
    console.error('Python 3.9 or newer is required. See docs/building.md for setup instructions.');
    return 1;
  }
  const result = run(python.command, [...python.args, ...arguments_], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) console.error(`Could not start Python: ${result.error.message}`);
  return result.status ?? 1;
}

function main() {
  process.exitCode = runPython([path.join(__dirname, 'package.py'), ...process.argv.slice(2)]);
}

if (require.main === module) main();
module.exports = { findPython, runPython };
