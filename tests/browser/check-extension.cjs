const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, join } = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'darky-extension-'));
  const extensionPath = resolve(__dirname, '../..');
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    const manager = await context.newPage();
    await manager.goto('chrome://extensions');
    const card = manager.locator('extensions-item').filter({ hasText: 'Darky' });
    await card.waitFor();
    const id = await card.getAttribute('id');
    assert.ok(id);
    await manager.close();
    const website = await context.newPage();
    await context.route('https://darky-example.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><style>html, body { background: white; color: black; }</style><h1>Theme test</h1>',
      }),
    );
    await website.goto('https://darky-example.test/');
    await website.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('invert'),
    );
    // A tab containing popup.html has no action-click activeTab grant. Check
    // global controls there; site controls are covered by the popup DOM test.
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/src/popup/popup.html`);
    await popup.waitForFunction(() => !document.querySelector('#theme').disabled);
    assert.equal(await popup.locator('#site-theme').isDisabled(), true);
    await popup.locator('#brightness').fill('100');
    await popup.evaluate(() =>
      chrome.storage.local.set({ 'theme:darky-example.test': 'original' }),
    );
    await website.waitForFunction(() => !document.querySelector('#darky-theme'));
    await website.reload();
    assert.equal(
      await popup.evaluate(
        async () => (await chrome.storage.local.get(null))['theme:darky-example.test'],
      ),
      'original',
    );
    assert.equal(await website.locator('#darky-theme').count(), 0);
    await popup.evaluate(() => chrome.storage.local.remove('theme:darky-example.test'));
    await website.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('invert'),
    );
    await popup.locator('#theme').selectOption('system');
    await website.emulateMedia({ colorScheme: 'light' });
    await website.waitForFunction(() => !document.querySelector('#darky-theme'));
    await website.emulateMedia({ colorScheme: 'dark' });
    await website.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('invert'),
    );
    // Open through the popup's actual runtime.openOptionsPage link.
    const optionsPromise = context.waitForEvent('page');
    await popup.locator('#manage-sites').click();
    const options = await optionsPromise;
    await options.waitForLoadState();
    assert.ok(options.url().endsWith('/options.html'));
    await popup.evaluate(() =>
      chrome.storage.local.set({
        'theme:darky-example.test': 'original',
        'brightness:darky-example.test': 80,
        'theme:other.test': 'light',
      }),
    );
    await options.locator('[data-host="darky-example.test"]').waitFor();
    assert.equal(await options.locator('.site-row').count(), 2);
    const site = options.locator('[data-host="darky-example.test"]');
    await options.screenshot({ path: 'test-results/options.png' });
    await site.locator('select').selectOption('dark');
    await website.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('invert'),
    );
    await site.locator('input[type=range]').fill('70');
    await website.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('brightness(0.7)'),
    );
    await options.locator('#search').fill('other');
    assert.equal(await options.locator('.site-row:visible').count(), 1);
    await options.locator('#search').fill('');
    await site.getByRole('button', { name: 'Reset site', exact: true }).click();
    await options.waitForFunction(
      () => !document.querySelector('[data-host="darky-example.test"]'),
    );
    const saved = await popup.evaluate(() => chrome.storage.local.get(null));
    assert.equal(saved['theme:darky-example.test'], undefined);
    assert.equal(saved['brightness:darky-example.test'], undefined);
    assert.equal(saved['theme:other.test'], 'light');
    assert.equal(saved.brightness, 100);
    await options
      .locator('[data-host="other.test"]')
      .getByRole('button', { name: 'Reset site', exact: true })
      .click();
    await options.waitForFunction(() =>
      document.querySelector('#empty').textContent.includes('No saved sites'),
    );
    await popup.locator('#theme').selectOption('light');
    await options.waitForFunction(() => document.documentElement.dataset.appearance === 'light');
    await options.screenshot({ path: 'test-results/options-empty.png' });
    const websiteId = await popup.evaluate(
      async () => (await chrome.tabs.query({ index: 1, currentWindow: true }))[0].id,
    );
    await popup.evaluate(() =>
      chrome.storage.local.set({
        'theme:darky-example.test': 'dark',
        'brightness:darky-example.test': 70,
      }),
    );
    await popup.waitForFunction(
      async (tabId) => (await chrome.action.getTitle({ tabId })).endsWith('Dark'),
      websiteId,
    );
    await popup.locator('#enabled').uncheck();
    await website.waitForFunction(() => !document.querySelector('#darky-theme'));
    await popup.waitForFunction(
      async (tabId) => (await chrome.action.getTitle({ tabId })).includes('Paused'),
      websiteId,
    );
    await popup.locator('#enabled').check();
    await website.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('brightness(0.7)'),
    );
    await popup.waitForFunction(
      async (tabId) => (await chrome.action.getTitle({ tabId })).endsWith('Dark'),
      websiteId,
    );
    await website.evaluate(() => {
      window.pauseResumeIdentity = 'same-document';
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      await popup.locator('#enabled').uncheck();
      await website.waitForFunction(() => !document.querySelector('#darky-theme'));
      await popup.locator('#enabled').check();
      await website.waitForFunction(() =>
        document.querySelector('#darky-theme')?.textContent.includes('brightness(0.7)'),
      );
      assert.equal(await website.evaluate(() => window.pauseResumeIdentity), 'same-document');
    }
    await popup.evaluate(() => chrome.storage.local.set({ 'theme:darky-example.test': 'light' }));
    await popup.waitForFunction(
      async (tabId) => (await chrome.action.getTitle({ tabId })).endsWith('Light'),
      websiteId,
    );
    const reported = await popup.evaluate(
      (tabId) => chrome.tabs.sendMessage(tabId, { type: 'darky:get-state' }, { frameId: 0 }),
      websiteId,
    );
    assert.equal(reported.enabled, true);
    assert.equal(reported.mode, 'light');
    assert.equal(reported.nativeDark, false);
    assert.equal(reported.inverted, false);
    assert.equal(reported.brightness, 70);
    await popup.evaluate((tabId) => {
      window.siteReports = [];
      chrome.runtime.onMessage.addListener((message, sender) => {
        if (message.type === 'darky:appearance' && sender.tab?.id === tabId && sender.frameId === 0)
          window.siteReports.push(message.state);
      });
    }, websiteId);
    await popup.evaluate(() => chrome.storage.local.set({ 'theme:darky-example.test': 'dark' }));
    await popup.waitForFunction(() =>
      window.siteReports.some((state) => state.inverted && state.mode === 'dark'),
    );
    await website.evaluate(() => {
      document.documentElement.style.backgroundColor = '#181818';
      document.body.style.backgroundColor = '#181818';
      document.body.style.minHeight = '100vh';
    });
    await popup.waitForFunction(() =>
      window.siteReports.some(
        (state) => state.nativeDark && !state.inverted && state.mode === 'dark',
      ),
    );
    await popup.evaluate(() => chrome.storage.local.set({ enabled: false }));
    await popup.waitForFunction(() => window.siteReports.at(-1)?.enabled === false);
    assert.equal(
      (
        await popup.evaluate(
          (tabId) => chrome.tabs.sendMessage(tabId, { type: 'darky:get-state' }, { frameId: 0 }),
          websiteId,
        )
      ).enabled,
      false,
    );
    console.log(
      'PASS: real unpacked extension loads; automatic injection, popup defaults, saved-site manager, persistence, live system changes, master pause/resume, per-tab toolbar states, and live rendering-state messages.',
    );
  } finally {
    await context?.close();
    rmSync(profile, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
