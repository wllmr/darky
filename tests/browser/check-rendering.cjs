const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { chromium } = require('playwright');

const content = [
  'src/shared/settings.js',
  'src/content/theme-detection.js',
  'src/content/theme-styles.js',
  'src/content/content.js',
]
  .map((file) => readFileSync(`${__dirname}/../../${file}`, 'utf8'))
  .join('\n');

async function pixels(page, selectors) {
  const points = await page.evaluate(
    (selectors) =>
      selectors.map((selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          x: Math.floor(rect.left + rect.width / 2),
          y: Math.floor(rect.top + rect.height / 2),
        };
      }),
    selectors,
  );
  const screenshot = await page.screenshot();
  return page.evaluate(
    async ({ png, points }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return points.map(({ x, y }) =>
        Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3),
      );
    },
    { png: screenshot.toString('base64'), points },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 900, height: 600 },
      deviceScaleFactor: 1,
    });
    await page.setContent(`<!doctype html><style>
      html, body { margin: 0; min-height: 100%; background: white; }
      .sample { position: fixed; width: 80px; height: 80px; background: rgb(200, 200, 200); }
      #ordinary { left: 20px; top: 20px; }
      #fixed { left: 120px; top: 20px; }
      #image { left: 220px; top: 20px; }
      #frame { left: 320px; top: 20px; border: 0; }
      #dialog { inset: auto; left: 420px; top: 20px; margin: 0; padding: 0; border: 0; }
      #popover { inset: auto; left: 520px; top: 20px; margin: 0; padding: 0; border: 0; }
      #fullscreen { left: 620px; top: 20px; }
      ::backdrop { background: transparent; }
    </style>
    <div id="ordinary" class="sample" style="position: absolute"></div>
    <div id="fixed" class="sample"></div>
    <img id="image" class="sample" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='rgb(200,200,200)'/%3E%3C/svg%3E">
    <iframe id="frame" class="sample" srcdoc="<style>html { background: rgb(200,200,200); }</style>"></iframe>
    <dialog id="dialog" class="sample"></dialog>
    <div id="popover" class="sample" popover="manual"></div>
    <div id="fullscreen" class="sample"></div>`);
    await page.evaluate(() => {
      const listeners = [];
      const settings = { theme: 'original', brightness: 100 };
      window.chrome = window.chrome || {};
      window.chrome.storage = {
        local: { get: async () => ({ ...settings }) },
        onChanged: { addListener: (listener) => listeners.push(listener) },
      };
      window.updateDarky = (values) => {
        Object.assign(settings, values);
        const changes = Object.fromEntries(
          Object.entries(values).map(([key, newValue]) => [key, { newValue }]),
        );
        listeners.forEach((listener) => listener(changes, 'local'));
      };
      document.querySelector('#dialog').showModal();
      document.querySelector('#popover').showPopover();
    });
    await page.evaluate(content);
    await page.evaluate(() => window.updateDarky({ brightness: 60, 'brightness:': 60 }));

    const selectors = ['#ordinary', '#fixed', '#image', '#frame', '#dialog', '#popover'];
    const actual = await pixels(page, selectors);
    console.log(
      '60% brightness pixels:',
      Object.fromEntries(selectors.map((name, index) => [name, actual[index]])),
    );
    for (let index = 0; index < selectors.length; index++) {
      assert.ok(
        actual[index].every((channel) => Math.abs(channel - 120) <= 2),
        `${selectors[index]} should dim from 200 to 120; got ${actual[index]}`,
      );
    }

    await page.evaluate(() => window.updateDarky({ theme: 'dark' }));
    const dark = await pixels(page, selectors);
    for (let index = 0; index < selectors.length; index++) {
      const expected = selectors[index] === '#image' ? 120 : 33;
      assert.ok(
        dark[index].every((channel) => Math.abs(channel - expected) <= 2),
        `${selectors[index]} in dark mode: expected ${expected}, got ${dark[index]}`,
      );
    }

    await page.evaluate(() => {
      document.querySelector('#dialog').close();
      document.querySelector('#popover').hidePopover();
      window.updateDarky({ theme: 'original' });
    });
    await page.locator('#fullscreen').click();
    await page.evaluate(() => document.querySelector('#fullscreen').requestFullscreen());
    const [fullscreen] = await pixels(page, ['#fullscreen']);
    assert.ok(
      fullscreen.every((channel) => Math.abs(channel - 120) <= 2),
      `fullscreen should dim to 120; got ${fullscreen}`,
    );
    console.log(
      'PASS: normal, fixed, media, iframe, dialog, popover, and fullscreen brightness rendering.',
    );
    for (const [name, background, theme, expected] of [
      ['modern white in dark mode', 'color(srgb 1 1 1)', 'dark', 0],
      ['modern white in light mode', 'oklch(100% 0 0)', 'light', 255],
      ['native dark stays dark', 'rgb(24,24,24)', 'dark', 24],
      ['native dark becomes light', 'rgb(24,24,24)', 'light', 231],
    ]) {
      const sample = await browser.newPage();
      await sample.setContent(
        `<style>html,body { margin:0; min-height:100vh; background:${background} }</style><body></body>`,
      );
      await sample.evaluate((theme) => {
        window.chrome = {
          storage: {
            local: { get: async () => ({ theme, brightness: 100 }) },
            onChanged: { addListener() {} },
          },
        };
      }, theme);
      await sample.evaluate(content);
      const [pixel] = await pixels(sample, ['body']);
      assert.ok(
        pixel.every((channel) => Math.abs(channel - expected) <= 2),
        `${name}: expected ${expected}, got ${pixel}`,
      );
      await sample.close();
    }
    for (const [name, theme, background, parentBackground] of [
      ['dark app wrapper', 'dark', '#181818', 'white'],
      ['light app wrapper', 'light', '#fafafa', 'black'],
      ['translucent light panel', 'light', 'rgb(255 255 255 / .95)', 'black'],
    ]) {
      const sample = await browser.newPage({ viewport: { width: 900, height: 600 } });
      await sample.setContent(
        `<style>html,body { margin:0; background:${parentBackground} } #app { min-height:100vh; background:${background} }</style><div id="app"></div>`,
      );
      await sample.evaluate((theme) => {
        const listeners = [];
        window.chrome = {
          storage: {
            local: { get: async () => ({ theme, brightness: 100 }) },
            onChanged: { addListener: (listener) => listeners.push(listener) },
          },
        };
        window.dim = () =>
          listeners.forEach((listener) => listener({ brightness: { newValue: 80 } }, 'local'));
      }, theme);
      const [originalPixel] = await pixels(sample, ['#app']);
      await sample.evaluate(content);
      assert.equal(
        await sample.locator('#darky-theme').count(),
        0,
        `${name}: matching theme must add no CSS at 100%`,
      );
      await sample.evaluate(() => window.dim());
      const css = await sample.locator('#darky-theme').textContent();
      assert.doesNotMatch(
        css,
        /invert|hue-rotate|::selection/,
        `${name}: brightness must preserve native colors`,
      );
      const [dimmed] = await pixels(sample, ['#app']);
      assert.ok(
        dimmed.every((channel, index) => Math.abs(channel - originalPixel[index] * 0.8) <= 2),
        `${name}: only brightness changes, got ${dimmed}`,
      );
      await sample.close();
    }
    console.log('PASS: native app wrappers and translucent backgrounds preserved.');
    // Proton's public ThemeProvider declares the app's mode on html. A white
    // email-reading pane must not make its surrounding dark app appear light.
    const mail = await browser.newPage({ viewport: { width: 900, height: 600 } });
    await mail.setContent(`
      <style>
        html,body { margin:0; min-height:100vh; background:#181818; color:white; }
        #sidebar { position:fixed; inset:0 auto 0 0; width:25%; background:#181818; }
        #reader { position:fixed; inset:0 0 0 25%; width:75%; height:100%; background:white; border:0; }
      </style>
      <div id="sidebar"></div><iframe id="reader" srcdoc="<style>html,body { background:white; margin:0 }</style>"></iframe>`);
    await mail.evaluate(() => {
      document.documentElement.setAttribute('data-theme-mode', 'dark');
      const listeners = [];
      window.chrome = {
        storage: {
          local: { get: async () => ({ brightness: 100 }) },
          onChanged: { addListener: (listener) => listeners.push(listener) },
        },
      };
      window.dimMail = () =>
        listeners.forEach((listener) => listener({ brightness: { newValue: 80 } }, 'local'));
    });
    await mail.evaluate(content);
    assert.equal(
      await mail.locator('#darky-theme').count(),
      0,
      'a white reading pane must not invert a declared dark app',
    );
    const [sidebar, reader] = await pixels(mail, ['#sidebar', '#reader']);
    assert.ok(sidebar.every((channel) => Math.abs(channel - 24) <= 2));
    assert.ok(reader.every((channel) => channel >= 253));
    await mail.evaluate(() => window.dimMail());
    assert.doesNotMatch(await mail.locator('#darky-theme').textContent(), /invert|hue-rotate/);
    const [dimSidebar, dimReader] = await pixels(mail, ['#sidebar', '#reader']);
    assert.ok(dimSidebar.every((channel) => Math.abs(channel - 19) <= 2));
    assert.ok(dimReader.every((channel) => Math.abs(channel - 204) <= 2));
    await mail.evaluate(() => document.documentElement.setAttribute('data-theme-mode', 'light'));
    await mail.waitForFunction(
      () => document.querySelector('#darky-theme')?.textContent.includes('invert'),
      null,
      { timeout: 1500 },
    );
    await mail.evaluate(() => document.documentElement.setAttribute('data-theme-mode', 'dark'));
    await mail.waitForFunction(
      () => !document.querySelector('#darky-theme')?.textContent.includes('invert'),
      null,
      { timeout: 1500 },
    );
    await mail.close();
    for (const [rootScheme, bodyScheme, scheme] of [
      ['dark', 'dark', 'dark'],
      ['light', 'light', 'light'],
      ['light', 'dark', 'dark'],
      ['dark', 'light', 'light'],
    ]) {
      const declared = await browser.newPage({ viewport: { width: 900, height: 600 } });
      await declared.setContent(`<style>
        html { color-scheme:${rootScheme} }
        body { color-scheme:${bodyScheme} }
        html,body { margin:0; min-height:100vh; background:${scheme === 'dark' ? '#181818' : 'white'} }
        #document { position:fixed; inset:0 0 0 25%; background:${scheme === 'dark' ? 'white' : '#181818'} }
        </style><div id="document"></div>`);
      await declared.evaluate((theme) => {
        window.chrome = {
          storage: {
            local: { get: async () => ({ theme, brightness: 100 }) },
            onChanged: { addListener() {} },
          },
        };
      }, scheme);
      await declared.evaluate(content);
      assert.equal(
        await declared.locator('#darky-theme').count(),
        0,
        `CSS ${scheme} app with a contrasting pane must retain native colors`,
      );
      await declared.close();
    }
    console.log(
      'PASS: declared native mail themes survive contrasting reading panes, brightness, and live theme changes.',
    );
    const dynamic = await browser.newPage();
    await dynamic.setContent(
      '<style>html,body { margin:0; min-height:100vh; background:white } .surface { min-height:100vh; background:white } html.dark .surface, #app[data-theme=dark] .surface { background:#181818 }</style><div id=app><div class=surface></div></div>',
    );
    await dynamic.evaluate(() => {
      window.chrome = {
        storage: {
          local: { get: async () => ({ brightness: 100 }) },
          onChanged: { addListener() {} },
        },
      };
    });
    await dynamic.evaluate(content);
    await dynamic.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('invert'),
    );
    await dynamic.evaluate(() => document.documentElement.classList.add('dark'));
    await dynamic.waitForFunction(() => !document.querySelector('#darky-theme'), null, {
      timeout: 1000,
    });
    await dynamic.evaluate(() => document.documentElement.classList.remove('dark'));
    await dynamic.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('invert'),
    );
    await dynamic.evaluate(() => (document.querySelector('#app').dataset.theme = 'dark'));
    await dynamic.waitForFunction(() => !document.querySelector('#darky-theme'), null, {
      timeout: 1000,
    });
    await dynamic.evaluate(() => (document.querySelector('#app').dataset.theme = 'light'));
    await dynamic.waitForFunction(() =>
      document.querySelector('#darky-theme')?.textContent.includes('invert'),
    );
    await dynamic.close();
    console.log('PASS: native dark and modern CSS color theme detection.');
    for (const [name, css, expected] of [
      ['browser canvas', '', 153],
      ['body background', 'body { background: rgb(240,240,240); }', 144],
      ['root background', 'html { background: rgb(220,220,220); }', 132],
    ]) {
      const backgroundPage = await browser.newPage({ viewport: { width: 900, height: 600 } });
      await backgroundPage.setContent(
        `<!doctype html><style>body { margin: 0; min-height: 100vh; } ${css}</style><body></body>`,
      );
      await backgroundPage.evaluate(() => {
        window.chrome = window.chrome || {};
        window.chrome.storage = {
          local: { get: async () => ({ theme: 'original', brightness: 60 }) },
          onChanged: { addListener() {} },
        };
      });
      await backgroundPage.evaluate(content);
      const [pixel] = await pixels(backgroundPage, ['body']);
      console.log(`${name} at 60%:`, pixel);
      assert.ok(
        pixel.every((channel) => Math.abs(channel - expected) <= 2),
        `${name} must dim to ${expected}; got ${pixel}`,
      );
      await backgroundPage.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
