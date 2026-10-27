const assert = require('node:assert/strict');
const { readFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  try {
    async function open({ settings = {}, failGet = false, failWrite = false } = {}) {
      const page = await browser.newPage({ viewport: { width: 900, height: 850 } });
      await page.addInitScript(
        ({ settings, failGet, failWrite }) => {
          const listeners = [];
          const notify = (changes) => listeners.forEach((listener) => listener(changes, 'local'));
          window.chrome = {
            runtime: { sendMessage: async () => {} },
            storage: {
              local: {
                get: async () => {
                  if (failGet) throw Error('Unavailable');
                  return { ...settings };
                },
                set: async (values) => {
                  if (failWrite) throw Error('Write failed');
                  Object.assign(settings, values);
                  notify(
                    Object.fromEntries(
                      Object.entries(values).map(([key, newValue]) => [key, { newValue }]),
                    ),
                  );
                },
                remove: async (keys) => {
                  if (failWrite) throw Error('Write failed');
                  keys.forEach((key) => delete settings[key]);
                  notify(Object.fromEntries(keys.map((key) => [key, {}])));
                },
              },
              onChanged: { addListener: (listener) => listeners.push(listener) },
            },
          };
        },
        { settings, failGet, failWrite },
      );
      await page.route('https://darky.test/**', (route) => {
        const file = new URL(route.request().url()).pathname.slice(1);
        if (
          ![
            'src/options/options.html',
            'src/options/options.js',
            'src/options/options.css',
            'src/shared/ui.css',
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
      await page.goto('https://darky.test/src/options/options.html');
      return page;
    }
    const host = '<img src=x onerror=alert(1)>';
    const page = await open({
      settings: {
        theme: 'light',
        brightness: 90,
        [`theme:${host}`]: 'original',
        'theme:example.com': 'dark',
        'brightness:example.com': 75,
      },
    });
    await page.waitForFunction(() => document.querySelectorAll('.site-row').length === 2);
    assert.equal(await page.locator('.site-row h2').filter({ hasText: host }).textContent(), host);
    assert.equal(
      await page.locator('.site-row img').count(),
      0,
      'hostnames must be text, never HTML',
    );
    const site = page.locator('[data-host="example.com"]');
    const progress = await site
      .locator('input[type=range]')
      .evaluate((el) => parseFloat(el.style.getPropertyValue('--range-fill')));
    assert.ok(Math.abs(progress - 41.666667) < 0.001);
    await site.getByRole('button', { name: 'Use default brightness for example.com' }).click();
    assert.equal(await site.locator('input[type=range]').inputValue(), '90');
    await page.evaluate(() => chrome.storage.local.set({ brightness: 85 }));
    assert.equal(await site.locator('input[type=range]').inputValue(), '85');
    await site.locator('input[type=range]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await site.locator('input[type=range]').inputValue(), '86');
    assert.equal(
      await site.locator('input[type=range]').evaluate((el) => document.activeElement === el),
      true,
    );
    await site.locator('select').selectOption('default');
    assert.equal(
      await site.locator('input[type=range]').inputValue(),
      '86',
      'resetting theme preserves brightness',
    );
    await page.evaluate(() => chrome.storage.local.set({ 'theme:example.com': 'dark' }));
    await page.locator('#search').fill('does-not-exist');
    assert.match(await page.locator('#empty').textContent(), /No matching sites/);
    await page.locator('#search').fill('');
    await page.evaluate(() => chrome.storage.local.set({ enabled: false }));
    assert.equal(await page.locator('#paused').isVisible(), true);
    assert.match(await page.locator('#logo').getAttribute('src'), /paused/);
    await page.evaluate(() => chrome.storage.local.set({ enabled: true }));
    mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/options-light.png' });
    await page.evaluate(() => chrome.storage.local.set({ theme: 'dark' }));
    await page.screenshot({ path: 'test-results/options-dark.png' });
    await page.setViewportSize({ width: 360, height: 800 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.close();
    const failedLoad = await open({ failGet: true });
    await failedLoad.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('Could not load'),
    );
    assert.match(await failedLoad.locator('#empty').textContent(), /unavailable/);
    await failedLoad.close();
    const failedWrite = await open({ settings: { 'theme:example.com': 'dark' }, failWrite: true });
    await failedWrite.locator('.site-row select').selectOption('light');
    await failedWrite.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('Could not save'),
    );
    assert.equal(await failedWrite.locator('.site-row select').inputValue(), 'dark');
    await failedWrite.getByRole('button', { name: 'Reset site', exact: true }).click();
    assert.equal(await failedWrite.locator('.site-row').count(), 1);
    await failedWrite.close();
    console.log(
      'PASS: options safe hostname rendering, defaults, live sync, search, pause notice, responsive palettes, and storage error recovery.',
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
