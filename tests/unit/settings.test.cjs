const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.resolve(__dirname, '../../src/shared/settings.js');
const context = vm.createContext({});
vm.runInContext(existsSync(file) ? readFileSync(file, 'utf8') : '', context, { filename: file });
const settings = context.DarkySettings;

test('settings resolve defaults and site preferences without modifying saved data', () => {
  const saved = { theme: 'light', 'theme:example.com': 'system' };
  assert.equal(settings.resolveTheme(saved, 'example.com', true), 'dark');
  assert.equal(settings.resolveTheme(saved, 'other.test', true), 'light');
  assert.equal(settings.resolveTheme({}, undefined, false), 'dark');
  assert.equal(saved['theme:example.com'], 'system');
});

test('original appearance remains distinct from following the system', () => {
  assert.equal(settings.resolveTheme({ theme: 'original' }, undefined, true), 'original');
});

test('invalid appearance falls back to dark', () => {
  assert.equal(settings.resolveTheme({ theme: 'invalid' }, undefined, false), 'dark');
});

test('brightness normalizes site override, global preference, and defaults', () => {
  assert.equal(settings.getBrightness({}, 'example.com'), 100);
  assert.equal(settings.getBrightness({ brightness: 80 }, 'example.com'), 80);
  assert.equal(
    settings.getBrightness({ brightness: 80, 'brightness:example.com': 70 }, 'example.com'),
    70,
  );
  assert.equal(settings.clampBrightness(-1), 50);
  assert.equal(settings.clampBrightness(500), 110);
  assert.equal(settings.clampBrightness('invalid'), 100);
});

test('storage removals delete keys and updates preserve unrelated data', () => {
  const saved = { theme: 'dark', brightness: 80 };
  settings.applyChanges(saved, { brightness: {}, 'theme:example.com': { newValue: 'light' } });
  assert.deepEqual(saved, { theme: 'dark', 'theme:example.com': 'light' });
});

test('saved hostname list ignores defaults, legacy keys, empty and removed values', () => {
  const hosts = settings.getSavedHostnames({
    theme: 'dark',
    'site:legacy.test': false,
    'theme:': 'dark',
    'theme:z.test': 'light',
    'brightness:z.test': 80,
    'brightness:a.test': 70,
    'theme:removed.test': undefined,
  });
  assert.deepEqual(Array.from(hosts), ['a.test', 'z.test']);
});

test('supported URL policy distinguishes extension stores from ordinary pages', () => {
  assert.equal(settings.isSupportedUrl(new URL('https://example.com/path')), true);
  assert.equal(settings.isSupportedUrl(new URL('chrome://settings')), false);
  assert.equal(
    settings.isSupportedUrl(new URL('https://chromewebstore.google.com/detail/test')),
    false,
  );
  assert.equal(settings.isSupportedUrl(new URL('https://chrome.google.com/webstore/test')), false);
  assert.equal(settings.isSupportedUrl(new URL('https://chrome.google.com/other')), true);
  assert.equal(settings.isSupportedUrl(null), false);
});
