const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve, extname } = require('node:path');
const { chromium } = require('playwright');

const root = resolve(__dirname, '..');
const output = resolve(root, 'marketing/store');
const source = (file) => readFileSync(resolve(root, file), 'utf8');
const imageData = (file, type = 'image/png') =>
  `data:${type};base64,${readFileSync(file).toString('base64')}`;
const logo = imageData(resolve(root, 'src/assets/icons/dark128.png'));
const moon = imageData(resolve(root, 'src/assets/icons/icon.svg'), 'image/svg+xml');
const themeScripts = [
  'src/shared/settings.js',
  'src/content/theme-detection.js',
  'src/content/theme-styles.js',
  'src/content/content.js',
]
  .map(source)
  .join('\n');
const css = source('marketing/store/layout.css');

async function addExtensionBoundary(page, settings, state, hostname) {
  await page.addInitScript(
    ({ settings, state, hostname }) => {
      const listeners = [];
      window.chrome = {
        runtime: {
          id: 'store-capture',
          onMessage: { addListener() {} },
          sendMessage: async () => {},
        },
        storage: {
          local: {
            get: async () => ({ ...settings }),
            set: async (values) => {
              Object.assign(settings, values);
              listeners.forEach((listener) =>
                listener(
                  Object.fromEntries(
                    Object.entries(values).map(([key, newValue]) => [key, { newValue }]),
                  ),
                  'local',
                ),
              );
            },
            remove: async (keys) => {
              keys.forEach((key) => delete settings[key]);
            },
          },
          onChanged: { addListener: (listener) => listeners.push(listener) },
        },
        tabs: {
          query: async () => [{ id: 1, url: `https://${hostname}/` }],
          sendMessage: async () => state,
        },
        scripting: { executeScript: async () => [] },
      };
    },
    { settings, state, hostname },
  );
  await page.route('https://capture.darky.test/**', (route) => {
    const file = new URL(route.request().url()).pathname.slice(1);
    if (!file.startsWith('src/') || file.includes('..')) return route.abort();
    const type = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
    }[extname(file)];
    if (!type) return route.abort();
    return route.fulfill({ body: readFileSync(resolve(root, file)), contentType: type });
  });
}

async function captureExample(browser, nativeDark, brightness) {
  const page = await browser.newPage({
    viewport: { width: 1164, height: 545 },
    deviceScaleFactor: 1,
  });
  await page.setContent(source('marketing/store/example.html'));
  await page.evaluate(
    ({ nativeDark, brightness }) => {
      if (nativeDark) {
        document.documentElement.classList.add('native');
        document.documentElement.setAttribute('data-theme-mode', 'dark');
      }
      window.chrome = {
        runtime: {
          onMessage: { addListener() {} },
          sendMessage: async (message) => {
            window.renderingState = message.state;
          },
        },
        storage: {
          local: { get: async () => ({ theme: 'dark', brightness }) },
          onChanged: { addListener() {} },
        },
      };
    },
    { nativeDark, brightness },
  );
  await page.evaluate(themeScripts);
  await page.waitForFunction(() => window.renderingState?.enabled);
  const state = await page.evaluate(() => window.renderingState);
  assert.equal(state.inverted, !nativeDark);
  const data = `data:image/png;base64,${(await page.screenshot()).toString('base64')}`;
  await page.close();
  return { data, state };
}

async function capturePopup(browser, state) {
  const page = await browser.newPage({
    viewport: { width: 304, height: 500 },
    deviceScaleFactor: 2,
  });
  await addExtensionBoundary(
    page,
    { enabled: true, theme: 'dark', brightness: state.brightness },
    state,
    'read.example',
  );
  await page.goto('https://capture.darky.test/src/popup/popup.html');
  await page.waitForFunction(() => !document.querySelector('#site-brightness').disabled);
  await page.addStyleTag({ content: ':root { font-family:"DejaVu Sans",Arial,sans-serif; }' });
  await page.evaluate(() => document.fonts.ready);
  const bounds = await page.locator('body').boundingBox();
  assert.ok(bounds.height < 450);
  const data = `data:image/png;base64,${(await page.screenshot({ clip: { x: 0, y: 0, width: 304, height: Math.ceil(bounds.height) } })).toString('base64')}`;
  const text = await page.locator('#site-effect').textContent();
  await page.close();
  return { data, text };
}

async function captureOptions(browser) {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 650 },
    deviceScaleFactor: 2,
  });
  await addExtensionBoundary(
    page,
    {
      theme: 'dark',
      brightness: 100,
      'theme:read.example': 'dark',
      'brightness:read.example': 85,
      'theme:mail.example': 'original',
      'brightness:mail.example': 90,
    },
    null,
    'read.example',
  );
  await page.goto('https://capture.darky.test/src/options/options.html');
  await page.waitForFunction(() => document.querySelectorAll('.site-row').length === 2);
  await page.addStyleTag({ content: ':root { font-family:"DejaVu Sans",Arial,sans-serif; }' });
  await page.evaluate(() => document.fonts.ready);
  const data = `data:image/png;base64,${(await page.screenshot()).toString('base64')}`;
  await page.close();
  return data;
}

function brand() {
  return `<div class="brand"><img src="${logo}" alt="">darky<span class="dot">.</span></div>`;
}
function page(body, className = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="canvas ${className}"><div class="grid"></div>${body}</div></body></html>`;
}
function art() {
  return `<div class="art"><div class="paper light"><div class="chrome"></div><div class="line title"></div><div class="line"></div><div class="line short"></div><div class="line"></div><div class="line tiny"></div></div><div class="paper dark"><div class="chrome"></div><div class="line title"></div><div class="line"></div><div class="line short"></div><div class="line"></div><div class="line tiny"></div></div><img class="orb" src="${moon}" alt=""></div>`;
}

async function render(browser, file, width, height, html) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
  await page.screenshot({ path: resolve(output, file), type: 'jpeg', quality: 96 });
  await page.close();
  return { file, width, height, format: 'JPEG' };
}

async function main() {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    const converted = await captureExample(browser, false, 100);
    const native = await captureExample(browser, true, 85);
    const popup = await capturePopup(browser, converted.state);
    const nativePopup = await capturePopup(browser, native.state);
    const options = await captureOptions(browser);
    assert.equal(popup.text, 'Converting to dark');
    assert.equal(nativePopup.text, 'Already dark · brightness only');
    const assets = [];
    for (const [file, number, title, description, example, controls] of [
      [
        '01-appearance-1280x800.jpg',
        '01 / APPEARANCE',
        'Appearance & brightness',
        'Choose dark, light, or system. Adjust brightness globally or for the current site.',
        converted.data,
        popup.data,
      ],
      [
        '02-native-themes-1280x800.jpg',
        '02 / NATIVE THEMES',
        'Native theme detection',
        'Matching website themes keep their original colors. Brightness still applies.',
        native.data,
        nativePopup.data,
      ],
    ]) {
      assets.push(
        await render(
          browser,
          file,
          1280,
          800,
          page(
            `${brand()}<div class="eyebrow">${number}</div><div class="copy"><h1>${title}</h1><p>${description}</p></div><div class="browser"><div class="bar"><i></i><i></i><i></i><span class="address">read.example · Example page</span></div><img src="${example}" alt=""></div><img class="popup" src="${controls}" alt=""><div class="bottom"><span>Actual Darky controls · Example website</span></div>`,
            'product',
          ),
        ),
      );
    }
    assets.push(
      await render(
        browser,
        '03-saved-sites-1280x800.jpg',
        1280,
        800,
        page(
          `${brand()}<div class="eyebrow">03 / SAVED SITES</div><div class="copy"><h1>Site settings</h1><p>Manage saved appearance and brightness settings in one place.</p><div class="feature-note">Stored locally on your device.</div></div><div class="browser"><div class="bar"><i></i><i></i><i></i><span class="address">Darky · Saved sites</span></div><img src="${options}" alt=""></div><div class="bottom"><span>Actual Darky settings · Example hostnames</span></div>`,
          'product settings',
        ),
      ),
    );
    assets.push(
      await render(
        browser,
        'small-promo-440x280.jpg',
        440,
        280,
        page(
          `${brand()}${art()}<div class="copy"><h1>A quieter web.</h1><p>In your preferred light.</p></div>`,
          'promo small',
        ),
      ),
    );
    assets.push(
      await render(
        browser,
        'marquee-promo-1400x560.jpg',
        1400,
        560,
        page(
          `${brand()}<div class="copy"><h1>Your web,<br>your light.</h1><p>Simple appearance. Comfortable brightness.</p></div>${art()}<div class="fine">DARK · LIGHT · FOLLOW SYSTEM</div>`,
          'promo',
        ),
      ),
    );
    writeFileSync(resolve(output, 'assets.json'), `${JSON.stringify(assets, null, 2)}\n`);
    console.log(JSON.stringify(assets, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
