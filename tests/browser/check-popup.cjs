const assert = require('node:assert/strict');
const { mkdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 304, height: 380 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const settings = {};
      const listeners = [];
      const messages = [];
      const pageState = () => {
        let mode = settings['theme:example.com'] ?? settings.theme ?? 'dark';
        if (mode === 'system')
          mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        return {
          enabled: settings.enabled !== false,
          mode,
          nativeDark: false,
          inverted: mode === 'dark',
          brightness: settings['brightness:example.com'] ?? settings.brightness ?? 100,
        };
      };
      const changed = (changes) => {
        listeners.forEach((listener) => listener(changes, 'local'));
        messages.forEach((listener) =>
          listener(
            { type: 'darky:appearance', state: pageState() },
            { id: 'test', tab: { id: 1 }, frameId: 0 },
          ),
        );
      };
      window.chrome = window.chrome || {};
      Object.assign(window.chrome, {
        runtime: {
          id: 'test',
          onMessage: { addListener: (listener) => messages.push(listener) },
          sendMessage: async () => {},
        },
        storage: {
          local: {
            async get() {
              return { ...settings };
            },
            async set(values) {
              if (window.failStorage) throw Error('Storage unavailable');
              Object.assign(settings, values);
              changed(
                Object.fromEntries(
                  Object.entries(values).map(([key, newValue]) => [key, { newValue }]),
                ),
              );
            },
            async remove(keys) {
              keys.forEach((key) => delete settings[key]);
              changed(Object.fromEntries(keys.map((key) => [key, {}])));
            },
          },
          onChanged: { addListener: (listener) => listeners.push(listener) },
        },
        tabs: {
          query: async () => [{ id: 1, url: 'https://example.com/' }],
          sendMessage: async () => pageState(),
        },
        scripting: { executeScript: async () => [] },
      });
    });
    await page.route('https://darky.test/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      const file = path === '/' ? 'src/popup/popup.html' : path.slice(1);
      if (
        ![
          'src/popup/popup.html',
          'src/shared/ui.css',
          'src/popup/popup.js',
          'src/shared/ui-theme.js',
          'src/shared/settings.js',
        ].includes(file) &&
        !/^src\/assets\/icons\/[a-z]+\d+\.png$/.test(file)
      )
        return route.abort();
      return route.fulfill({
        body: readFileSync(resolve(__dirname, '../..', file)),
        contentType: file.endsWith('.css')
          ? 'text/css'
          : file.endsWith('.js')
            ? 'text/javascript'
            : file.endsWith('.png')
              ? 'image/png'
              : 'text/html',
      });
    });
    await page.goto('https://darky.test/src/popup/popup.html');
    await page.waitForFunction(() => !document.querySelector('#site-brightness').disabled);
    assert.equal(await page.locator('input[role="switch"]').count(), 1);
    assert.equal(await page.locator('#site-effect').textContent(), 'Converting to dark');
    assert.equal(await page.locator('#site-brightness').inputValue(), '100');
    assert.ok(
      Math.abs(
        (await page
          .locator('#brightness')
          .evaluate((el) => parseFloat(el.style.getPropertyValue('--range-fill')))) - 83.333333,
      ) < 0.001,
    );
    await page.locator('#brightness').fill('80');
    assert.equal(
      await page.locator('#brightness').evaluate((el) => el.style.getPropertyValue('--range-fill')),
      '50%',
    );
    assert.equal(await page.locator('#site-brightness').inputValue(), '80');
    await page.locator('#site-brightness').fill('70');
    await page.locator('#brightness').fill('90');
    assert.equal(await page.locator('#site-brightness').inputValue(), '70');
    assert.equal(await page.locator('#site-brightness-state').textContent(), 'Custom');
    await page.locator('#reset-brightness').click();
    assert.equal(await page.locator('#site-brightness').inputValue(), '90');
    assert.equal(await page.locator('#reset-brightness').isDisabled(), true);
    assert.equal(await page.locator('#site-brightness-state').textContent(), 'Default');
    await page.locator('#site-brightness').fill('60');
    await page.locator('#reset-site').click();
    assert.equal(await page.locator('#site-brightness').inputValue(), '90');
    assert.equal(await page.locator('#reset-site').isDisabled(), true);
    await page.locator('#theme').selectOption('light');
    assert.equal(
      await page.locator('#site-effect').textContent(),
      'Already light · brightness only',
    );
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'light');
    assert.equal(
      await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
      'light',
    );
    await page.locator('#site-theme').selectOption('dark');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'dark');
    await page.locator('#reset-site').click();
    await page.locator('#theme').selectOption('system');
    await page.emulateMedia({ colorScheme: 'light' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.appearance === 'dark');
    assert.equal(await page.locator('#theme').inputValue(), 'system');
    await page.locator('#site-theme').selectOption('original');
    assert.equal(await page.locator('#reset-site').isDisabled(), false);
    await page.locator('#reset-site').click();
    assert.equal(await page.locator('#site-theme').inputValue(), 'default');
    await page.locator('#enabled').uncheck();
    assert.equal(await page.locator('#site-brightness').isDisabled(), false);
    assert.equal(await page.locator('#power-state').textContent(), 'Paused');
    assert.equal(await page.locator('#site-effect').textContent(), 'Paused · no effects applied');
    assert.match(await page.locator('#logo').getAttribute('src'), /paused/);
    await page.locator('#enabled').check();
    assert.equal(await page.locator('#power-state').textContent(), 'On');
    const bounds = await page.evaluate(() => ({
      width: document.body.getBoundingClientRect().width,
      height: document.body.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(bounds.width, 304);
    assert.ok(
      await page
        .locator('.caption')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 11),
    );
    assert.ok(bounds.height < 390, `popup should stay compact: ${bounds.height}px`);
    assert.equal(bounds.overflow, false);
    assert.deepEqual(errors, []);
    mkdirSync('test-results', { recursive: true });
    await page.screenshot({
      path: 'test-results/popup.png',
      clip: { x: 0, y: 0, width: 304, height: Math.ceil(bounds.height) },
    });
    await page.locator('#theme').selectOption('light');
    await page.screenshot({
      path: 'test-results/popup-light.png',
      clip: { x: 0, y: 0, width: 304, height: Math.ceil(bounds.height) },
    });
    assert.equal(
      await page.locator('#logo').evaluate((img) => img.complete && img.naturalWidth > 0),
      true,
    );
    await page.evaluate(() => {
      window.failStorage = true;
    });
    await page.locator('#theme').selectOption('dark');
    await page.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('Could not save'),
    );
    assert.equal(
      await page.locator('#theme').inputValue(),
      'light',
      'failed writes must revert controls to saved settings',
    );
    console.log(
      `PASS: global mode, default brightness, custom brightness, reset all brightness, no horizontal overflow; 304 × ${Math.ceil(bounds.height)}px.`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
