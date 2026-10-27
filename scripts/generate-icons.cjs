const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const state of ['dark', 'light', 'paused'])
      for (const size of [16, 32, 48, 128]) {
        const page = await browser.newPage({
          viewport: { width: size, height: size },
          deviceScaleFactor: 1,
        });
        await page.setContent(
          `<style>body { margin:0 } svg { width:100%; height:100% }</style>${readFileSync(resolve(`src/assets/icons/${state === 'dark' ? 'icon' : state}.svg`), 'utf8')}`,
        );
        await page.screenshot({
          path: `src/assets/icons/${state}${size}.png`,
          omitBackground: true,
        });
        await page.close();
      }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
