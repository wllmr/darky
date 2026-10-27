const { test } = require('node:test');
const assert = require('node:assert/strict');
const { browser } = require('../helpers/browser.cjs');

test('opening the popup themes a tab that has no content script yet', async () => {
  const app = browser();
  await app.open();
  assert.equal(app.styles.length, 1, 'the existing tab needs a theme stylesheet');
  assert.match(app.styles[0].textContent, /brightness\(1\)/);
});

test('dragging brightness updates the page before the slider is released', async () => {
  const app = browser();
  await app.inject();
  await app.open();
  await app.input(60);
  assert.match(app.styles[0].textContent, /brightness\(0\.6\)/);
  assert.equal(app.elements['#brightness-value'].value, '60%');
});

test('reopening the popup never leaves duplicate theme styles', async () => {
  const app = browser();
  await app.inject();
  await app.open();
  await app.open();
  await app.input(110);
  assert.equal(app.styles.length, 1);
  assert.match(app.styles[0].textContent, /brightness\(1\.1\)/);
});

test('an inaccessible page disables site brightness but allows editing defaults', async () => {
  const app = browser({ blocked: true });
  await app.open();
  assert.equal(app.elements['#brightness'].disabled, false);
  assert.equal(app.elements['#site-brightness'].disabled, true);
  assert.match(app.elements['#status'].textContent, /cannot|could not|unable/i);
});

test('global dark mode applies regardless of legacy site mode preferences', async () => {
  const app = browser({ settings: { brightness: 100, 'site:example.com': false } });
  await app.open();
  assert.equal(app.styles.length, 1);
  assert.match(app.styles[0].textContent, /invert\(1\)/);
  await app.toggle('enabled', false);
  assert.equal(app.styles.length, 0);
});

test('sites inherit global brightness until a custom value is selected', async () => {
  const app = browser({ settings: { brightness: 80 } });
  await app.open();
  assert.equal(Number(app.elements['#site-brightness'].value), 80);
  await app.input(70);
  assert.equal(Number(app.elements['#site-brightness'].value), 70);
  assert.match(app.styles[0].textContent, /brightness\(0\.7\)/);
  await app.input(60, 'site-brightness');
  await app.input(90);
  assert.equal(Number(app.elements['#site-brightness'].value), 60);
  assert.equal(app.elements['#site-brightness-state'].textContent, 'Custom');
  assert.match(app.styles[0].textContent, /brightness\(0\.6\)/);
});

test('original appearance allows brightness without conversion', async () => {
  const app = browser({ settings: { theme: 'original', brightness: 100 } });
  await app.open();
  assert.equal(app.styles.length, 0);
  await app.input(60, 'site-brightness');
  assert.match(app.styles[0].textContent, /filter: brightness\(0\.6\)/);
  assert.doesNotMatch(app.styles[0].textContent, /invert|background:|::selection/);
  await app.input(100, 'site-brightness');
  assert.equal(app.styles.length, 0);
});

test('reset all removes every site brightness override and retains the global default', async () => {
  const settings = {
    enabled: false,
    brightness: 80,
    'brightness:example.com': 60,
    'brightness:other.example': 70,
  };
  const app = browser({ settings });
  await app.open();
  await app.resetAll();
  assert.equal(app.elements['#enabled'].checked, false);
  assert.equal(Number(app.elements['#brightness'].value), 80);
  assert.equal(Number(app.elements['#site-brightness'].value), 80);
  assert.equal(app.elements['#site-brightness-state'].textContent, 'Default');
  assert.equal(app.elements['#reset-brightness'].disabled, true);
  assert.equal(app.styles.length, 0, 'paused means brightness is paused too');
  const other = browser({ settings, url: 'https://other.example/' });
  await other.open();
  assert.equal(Number(other.elements['#site-brightness'].value), 80);
  await other.input(90);
  assert.equal(Number(other.elements['#site-brightness'].value), 90);
});

test('reset site restores inheritance and leaves other sites custom values intact', async () => {
  const settings = { brightness: 80, 'brightness:example.com': 60, 'brightness:other.example': 70 };
  const app = browser({ settings });
  await app.open();
  await app.reset();
  assert.equal(Number(app.elements['#site-brightness'].value), 80);
  assert.equal(app.elements['#reset-site'].disabled, true);
  await app.input(90);
  assert.equal(Number(app.elements['#site-brightness'].value), 90);
  const other = browser({ settings, url: 'https://other.example/' });
  await other.open();
  assert.equal(Number(other.elements['#site-brightness'].value), 70);
});

test('browser pages allow editing defaults but leave site controls unavailable', async () => {
  const app = browser({ url: 'chrome://extensions/' });
  await app.open();
  assert.equal(app.elements['#brightness'].disabled, false);
  assert.equal(app.elements['#site-brightness'].disabled, true);
  assert.equal(app.styles.length, 0);
});

test('site original mode restores original colors without changing other sites', async () => {
  const settings = { brightness: 100 };
  const app = browser({ settings });
  await app.open();
  await app.choose('site-theme', 'original');
  assert.equal(settings['theme:example.com'], 'original');
  assert.equal(app.styles.length, 0);
  const other = browser({ settings, url: 'https://other.example' });
  await other.open();
  assert.match(other.styles[0].textContent, /invert/);
  await app.reset();
  assert.equal(settings['theme:example.com'], undefined);
  assert.match(app.styles[0].textContent, /invert/);
});

test('dark mode preserves an already dark background', async () => {
  const app = browser({ settings: { brightness: 100 }, background: 'rgb(24, 24, 28)' });
  await app.open();
  assert.equal(app.styles.length, 0);
});

test('light mode converts a dark page and preserves a light page', async () => {
  const dark = browser({
    settings: { theme: 'light', brightness: 100 },
    background: 'rgb(24, 24, 28)',
  });
  await dark.open();
  assert.match(dark.styles[0].textContent, /invert/);
  assert.match(dark.styles[0].textContent, /background: #000/);
  const light = browser({
    settings: { theme: 'light', brightness: 100 },
    background: 'rgb(255, 255, 255)',
  });
  await light.open();
  assert.equal(light.styles.length, 0);
});

test('system mode follows the operating system preference', async () => {
  const app = browser({ settings: { theme: 'system', brightness: 100 }, systemDark: false });
  await app.open();
  assert.equal(app.styles.length, 0);
  await app.choose('theme', 'dark');
  assert.match(app.styles[0].textContent, /invert/);
});

test('system changes update connected pages without reopening the popup', async () => {
  const app = browser({ settings: { theme: 'system', brightness: 100 }, systemDark: false });
  await app.open();
  assert.equal(app.styles.length, 0);
  await app.system(true);
  assert.match(app.styles[0].textContent, /invert/);
  await app.system(false);
  assert.equal(app.styles.length, 0);
});

test('master pause removes all effects and resume restores saved site preferences', async () => {
  const app = browser({ settings: { brightness: 100, 'theme:example.com': 'dark' } });
  await app.open();
  await app.toggle('enabled', false);
  assert.equal(app.styles.length, 0);
  await app.input(80, 'site-brightness');
  assert.equal(app.styles.length, 0);
  await app.toggle('enabled', true);
  assert.match(app.styles[0].textContent, /brightness\(0\.8\)/);
  assert.match(app.styles[0].textContent, /invert/);
});

test('site status reflects real conversion, original mode, and pause', async () => {
  const app = browser({ settings: { brightness: 90 } });
  await app.open();
  assert.equal(app.elements['#site-effect'].textContent, 'Converting to dark');
  await app.choose('site-theme', 'original');
  assert.equal(app.elements['#site-effect'].textContent, 'Original colors · brightness only');
  await app.toggle('enabled', false);
  assert.equal(app.elements['#site-effect'].textContent, 'Paused · no effects applied');
  await app.toggle('enabled', true);
  await app.input(100, 'site-brightness');
  assert.equal(app.elements['#site-effect'].textContent, 'Original colors · no changes');
});

test('native-theme status distinguishes brightness only from no changes', async () => {
  const app = browser({ settings: { brightness: 90 }, background: 'rgb(24, 24, 28)' });
  await app.open();
  assert.equal(app.elements['#site-effect'].textContent, 'Already dark · brightness only');
  await app.input(100);
  assert.equal(app.elements['#site-effect'].textContent, 'Already dark · no changes');
  app.notify(
    { enabled: true, mode: 'light', nativeDark: false, inverted: false, brightness: 100 },
    99,
  );
  assert.equal(app.elements['#site-effect'].textContent, 'Already dark · no changes');
  app.notify(
    { enabled: true, mode: 'light', nativeDark: false, inverted: false, brightness: 100 },
    7,
    1,
  );
  assert.equal(app.elements['#site-effect'].textContent, 'Already dark · no changes');
});

test('restricted pages never claim to have detected a theme', async () => {
  const app = browser({ url: 'chrome://extensions/' });
  await app.open();
  assert.equal(app.elements['#site-effect'].textContent, 'Unavailable on this page');
});

test('missing page state eventually shows a refresh hint instead of checking forever', async () => {
  const app = browser({ pageSettingsUnavailable: true });
  await app.open();
  assert.equal(app.elements['#site-effect'].textContent, 'Checking appearance…');
  app.expireStatusTimer();
  assert.equal(app.elements['#site-effect'].textContent, 'Status unavailable · refresh page');
});
