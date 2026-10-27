const { test } = require('node:test');
const assert = require('node:assert/strict');
const { browser } = require('../helpers/browser.cjs');

for (const mode of ['dark', 'light', 'original', 'system']) {
  for (const nativeDark of [false, true]) {
    for (const enabled of [false, true]) {
      test(`${mode} on a native ${nativeDark ? 'dark' : 'light'} page while ${enabled ? 'enabled' : 'paused'}`, async () => {
        const app = browser({
          settings: { theme: mode, enabled, brightness: 80 },
          background: nativeDark ? 'rgb(24, 24, 24)' : 'rgb(255, 255, 255)',
          systemDark: false,
        });
        await app.open();
        const state = app.queryState();
        assert.equal(state.enabled, enabled);
        if (!enabled) return assert.equal(app.styles.length, 0);
        const resolved = mode === 'system' ? 'light' : mode;
        assert.equal(state.mode, resolved);
        assert.equal(state.nativeDark, nativeDark);
        assert.equal(state.brightness, 80);
        const converts = resolved !== 'original' && (resolved === 'dark') !== nativeDark;
        assert.equal(state.inverted, converts);
        assert.equal(app.styles[0].textContent.includes('invert(1)'), converts);
        assert.match(app.styles[0].textContent, /brightness\(0\.8\)/);
      });
    }
  }
}

for (const [value, expected] of [
  [20, 50],
  [150, 110],
  ['75', 75],
  [0, 100],
  ['invalid', 100],
]) {
  test(`page safely normalizes saved brightness ${value} to ${expected}`, async () => {
    const app = browser({ settings: { theme: 'original', brightness: value } });
    await app.inject();
    assert.equal(app.queryState().brightness, expected);
    assert.equal(app.styles.length, expected === 100 ? 0 : 1);
  });
}

for (const url of [
  'chrome://settings/',
  'file:///tmp/test.html',
  'https://chromewebstore.google.com/detail/test',
  'https://chrome.google.com/webstore/detail/test',
]) {
  test(`site controls are unavailable on ${url}`, async () => {
    const app = browser({ url });
    await app.open();
    assert.equal(app.elements['#site-theme'].disabled, true);
    assert.equal(app.elements['#site-brightness'].disabled, true);
    assert.equal(app.elements['#theme'].disabled, false);
    assert.equal(app.styles.length, 0);
  });
}

test('no active tab still allows global preferences', async () => {
  const app = browser({ activeTab: false });
  await app.open();
  assert.equal(app.elements['#theme'].disabled, false);
  assert.equal(app.elements['#site-theme'].disabled, true);
});

test('external local settings update the popup, page, and live status', async () => {
  const app = browser();
  await app.open();
  await app.change({ theme: 'light', brightness: 75 });
  assert.equal(app.elements['#theme'].value, 'light');
  assert.equal(Number(app.elements['#brightness'].value), 75);
  assert.equal(app.queryState().inverted, false);
  assert.equal(app.elements['#site-effect'].textContent, 'Already light · brightness only');
  await app.change({ enabled: false });
  assert.equal(app.styles.length, 0);
});

test('sync-storage events cannot overwrite local preferences', async () => {
  const app = browser();
  await app.open();
  await app.change({ enabled: false, brightness: 60 }, 'sync');
  assert.equal(app.elements['#enabled'].checked, true);
  assert.equal(app.queryState().brightness, 100);
});

test('site overrides apply to one exact hostname, not its parent or subdomains', async () => {
  const settings = { brightness: 100, 'theme:example.com': 'original' };
  const site = browser({ settings });
  const subdomain = browser({ settings, url: 'https://www.example.com/' });
  await site.open();
  await subdomain.open();
  assert.equal(site.styles.length, 0);
  assert.equal(subdomain.queryState().inverted, true);
});

test('use-default appearance removes only the theme override', async () => {
  const app = browser({
    settings: { 'theme:example.com': 'original', 'brightness:example.com': 75 },
  });
  await app.open();
  await app.choose('site-theme', 'default');
  assert.equal(app.settings['theme:example.com'], undefined);
  assert.equal(app.settings['brightness:example.com'], 75);
  assert.equal(app.queryState().inverted, true);
});

test('reset-all brightness preserves every appearance preference', async () => {
  const app = browser({
    settings: {
      theme: 'light',
      'theme:example.com': 'original',
      'theme:other.test': 'dark',
      'brightness:example.com': 70,
    },
  });
  await app.open();
  await app.resetAll();
  assert.equal(app.settings.theme, 'light');
  assert.equal(app.settings['theme:example.com'], 'original');
  assert.equal(app.settings['theme:other.test'], 'dark');
  assert.equal(app.settings['brightness:example.com'], undefined);
});

test('failed saves restore controls and leave the page unchanged', async () => {
  const app = browser();
  await app.open();
  app.failures.set = true;
  await app.choose('theme', 'light');
  assert.equal(app.elements['#theme'].value, 'dark');
  assert.equal(app.queryState().inverted, true);
  assert.match(app.elements['#status'].textContent, /Could not save/);
  app.failures.set = false;
  await app.choose('theme', 'light');
  assert.equal(app.queryState().inverted, false);
});

for (const action of ['reset', 'resetAll']) {
  test(`failed ${action} preserves preferences and restores controls`, async () => {
    const app = browser({
      settings: { 'theme:example.com': 'original', 'brightness:example.com': 70 },
    });
    await app.open();
    app.failures.remove = true;
    await app[action]();
    assert.equal(app.settings['theme:example.com'], 'original');
    assert.equal(app.settings['brightness:example.com'], 70);
    assert.equal(app.elements['#brightness'].disabled, false);
    assert.match(app.elements['#status'].textContent, /Could not reset/);
  });
}

test('load failures present an error instead of enabling unusable controls', async () => {
  const app = browser();
  app.failures.get = true;
  await app.open();
  assert.equal(app.elements['#enabled'].disabled, true);
  assert.match(app.elements['#status'].textContent, /Could not load/);
});

test('saved-sites entry opens options and reports an opening failure', async () => {
  const app = browser();
  await app.open();
  await app.click('manage-sites');
  assert.equal(app.openedOptions, 1);
  app.failures.options = true;
  await app.click('manage-sites');
  assert.match(app.elements['#status'].textContent, /Could not open/);
});

test('page state queries reject unrelated messages and other extensions', async () => {
  const app = browser();
  await app.inject();
  assert.equal(app.queryState('other-extension'), undefined);
  assert.equal(app.queryState('darky-test', 'unrelated'), undefined);
  assert.equal(app.queryState().mode, 'dark');
});

test('live status rejects messages from other extensions', async () => {
  const app = browser();
  await app.open();
  app.notify({ enabled: false }, 7, 0, 'other-extension');
  assert.equal(app.elements['#site-effect'].textContent, 'Converting to dark');
});

test('repeated injection registers one content message listener', async () => {
  const app = browser();
  await app.inject();
  await app.inject();
  await app.open();
  assert.equal(app.contentListeners, 1);
});

test('a delayed initial reply cannot overwrite a newer live page state', async () => {
  const app = browser({ deferStateQuery: true });
  await app.open();
  await app.change({ theme: 'light', brightness: 100 });
  assert.equal(app.elements['#site-effect'].textContent, 'Already light · no changes');
  await app.resolveInitialState({
    enabled: true,
    mode: 'dark',
    nativeDark: false,
    inverted: true,
    brightness: 90,
  });
  assert.equal(app.elements['#site-effect'].textContent, 'Already light · no changes');
});

test('failed initial messaging still leaves site controls usable and shows a refresh hint', async () => {
  const app = browser();
  await app.inject();
  app.failures.message = true;
  await app.open();
  assert.equal(app.elements['#site-theme'].disabled, false);
  assert.equal(app.elements['#site-effect'].textContent, 'Status unavailable · refresh page');
});

for (const enabled of [false, true]) {
  test(`popup toggle to ${enabled ? 'on' : 'paused'} survives a delayed initial page-settings read`, async () => {
    const app = browser({ settings: { enabled: !enabled }, deferPageSettings: true });
    await app.open();
    await app.toggle('enabled', enabled);
    await app.finishPageSettingsLoad();
    assert.equal(app.queryState().enabled, enabled);
    assert.equal(app.styles.length, enabled ? 1 : 0);
    assert.equal(app.elements['#enabled'].checked, enabled);
  });
}

test('reopening the popup retries a failed page-settings load without reloading the document', async () => {
  const app = browser();
  app.failures.pageGet = true;
  await app.inject();
  assert.equal(app.queryState(), null);
  app.failures.pageGet = false;
  await app.open();
  assert.equal(app.queryState()?.enabled, true);
  await app.toggle('enabled', false);
  assert.equal(app.styles.length, 0);
  await app.toggle('enabled', true);
  assert.equal(app.styles.length, 1);
  assert.equal(app.contentListeners, 1);
});

for (const attribute of ['data-theme-mode', 'data-color-mode', 'data-theme']) {
  for (const theme of ['dark', 'light']) {
    test(`explicit ${attribute}=${theme} preserves the native app despite contrasting panels`, async () => {
      const app = browser({
        settings: { theme, brightness: 100 },
        background: theme === 'dark' ? 'rgb(255,255,255)' : 'rgb(24,24,24)',
        themeAttributes: { [attribute]: theme },
      });
      await app.open();
      assert.equal(app.queryState().nativeDark, theme === 'dark');
      assert.equal(app.queryState().inverted, false);
      assert.equal(app.styles.length, 0);
      await app.input(80);
      assert.doesNotMatch(app.styles[0].textContent, /invert|hue-rotate/);
      assert.equal(app.queryState().brightness, 80);
    });
  }
}

test('ambiguous theme declarations still use visible background detection', async () => {
  const app = browser({
    background: 'rgb(24,24,24)',
    themeAttributes: { 'data-theme-mode': 'auto', 'data-theme': 'carbon' },
  });
  await app.open();
  assert.equal(app.queryState().nativeDark, true);
  assert.equal(app.styles.length, 0);
});

for (const [colorScheme, theme] of [
  ['dark', 'dark'],
  ['only dark', 'dark'],
  ['light', 'light'],
]) {
  test(`standard CSS color-scheme ${colorScheme} preserves the declared app appearance`, async () => {
    const app = browser({
      settings: { theme },
      colorScheme,
      background: theme === 'dark' ? 'rgb(255,255,255)' : 'rgb(24,24,24)',
    });
    await app.open();
    assert.equal(app.queryState().nativeDark, theme === 'dark');
    assert.equal(app.styles.length, 0);
  });
}

test('dual CSS color schemes describe support, so visible colors still decide', async () => {
  const app = browser({ colorScheme: 'light dark', background: 'rgb(24,24,24)' });
  await app.open();
  assert.equal(app.queryState().nativeDark, true);
  assert.equal(app.styles.length, 0);
});
