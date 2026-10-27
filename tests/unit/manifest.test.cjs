const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('manifest loads page dependencies before their controller without new permissions', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage', 'activeTab', 'scripting']);
  assert.deepEqual(manifest.content_scripts[0].js, [
    'src/shared/settings.js',
    'src/content/theme-detection.js',
    'src/content/theme-styles.js',
    'src/content/content.js',
  ]);
  assert.equal(manifest.content_scripts[0].run_at, 'document_start');
});

test('every declared runtime asset exists', () => {
  const files = [
    manifest.action.default_popup,
    manifest.options_ui.page,
    manifest.background.service_worker,
    ...manifest.content_scripts.flatMap((script) => script.js),
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ];
  for (const file of files)
    assert.ok(existsSync(path.join(root, file)), `Missing declared asset: ${file}`);
  for (const state of ['dark', 'light', 'paused']) {
    for (const size of [16, 32]) {
      const png = readFileSync(path.join(root, `src/assets/icons/${state}${size}.png`));
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
    }
  }
});

test('both HTML entry points load settings before helpers and controller', () => {
  for (const page of ['popup', 'options']) {
    const html = readFileSync(path.join(root, `src/${page}/${page}.html`), 'utf8');
    const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(scripts, ['../shared/settings.js', '../shared/ui-theme.js', `${page}.js`]);
    assert.doesNotMatch(
      html,
      /\son(?:click|change|input)=/i,
      'event handlers must stay outside markup',
    );
  }
});

test('manifest routes each entry point to its feature directory', () => {
  assert.equal(manifest.action.default_popup, 'src/popup/popup.html');
  assert.equal(manifest.options_ui.page, 'src/options/options.html');
  assert.equal(manifest.background.service_worker, 'src/background/service-worker.js');
});

test('page assets and worker imports resolve from their entry-point directories', () => {
  for (const entry of [manifest.action.default_popup, manifest.options_ui.page]) {
    const html = readFileSync(path.join(root, entry), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const target = path.resolve(root, path.dirname(entry), match[1]);
      assert.ok(existsSync(target), `Missing ${match[1]} referenced by ${entry}`);
    }
  }
  const worker = manifest.background.service_worker;
  const source = readFileSync(path.join(root, worker), 'utf8');
  for (const match of source.matchAll(/importScripts\('([^']+)'\)/g)) {
    assert.ok(existsSync(path.resolve(root, path.dirname(worker), match[1])));
  }
});
