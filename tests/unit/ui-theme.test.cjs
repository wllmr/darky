const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function ui() {
  const system = new EventTarget();
  system.matches = false;
  const root = { dataset: {} };
  const logo = {};
  const reports = [];
  const context = vm.createContext({
    matchMedia: () => system,
    document: { documentElement: root, querySelector: () => logo },
    chrome: {
      runtime: {
        async sendMessage(message) {
          reports.push(message);
        },
      },
    },
  });
  vm.runInContext(readFileSync(`${__dirname}/../../src/shared/settings.js`, 'utf8'), context, {
    filename: `${__dirname}/../../src/shared/settings.js`,
  });
  vm.runInContext(readFileSync(`${__dirname}/../../src/shared/ui-theme.js`, 'utf8'), context, {
    filename: `${__dirname}/../../src/shared/ui-theme.js`,
  });
  return { system, root, logo, reports, api: context.DarkyUI };
}

for (const [theme, expected] of [
  ['dark', 'dark'],
  ['light', 'light'],
  ['system', 'light'],
  ['original', 'light'],
]) {
  test(`extension UI resolves ${theme} appearance`, () => {
    const app = ui();
    app.api.update({ theme });
    assert.equal(app.root.dataset.appearance, expected);
    assert.equal(app.logo.src, `../assets/icons/${expected}32.png`);
    assert.equal(app.logo.alt, `Darky ${expected}`);
  });
}

test('site appearance overrides global palette only for that hostname', () => {
  const app = ui();
  const settings = { theme: 'light', 'theme:example.com': 'dark' };
  app.api.update(settings, 'example.com');
  assert.equal(app.root.dataset.appearance, 'dark');
  app.api.update(settings, 'other.test');
  assert.equal(app.root.dataset.appearance, 'light');
});

test('system changes update UI and logo while manual modes stay fixed', () => {
  const app = ui();
  app.api.update({ theme: 'system' });
  app.system.matches = true;
  app.system.dispatchEvent(new Event('change'));
  assert.equal(app.root.dataset.appearance, 'dark');
  assert.equal(app.logo.src, '../assets/icons/dark32.png');
  assert.equal(app.reports.at(-1).dark, true);
  app.api.update({ theme: 'light' });
  assert.equal(app.root.dataset.appearance, 'light');
});

test('pause changes logo without losing the selected UI palette', () => {
  const app = ui();
  app.api.update({ theme: 'light', enabled: false });
  assert.equal(app.root.dataset.appearance, 'light');
  assert.equal(app.logo.src, '../assets/icons/paused32.png');
  app.api.update({ theme: 'light', enabled: true });
  assert.equal(app.logo.src, '../assets/icons/light32.png');
});

for (const [value, min, max, progress] of [
  [60, 60, 110, '0%'],
  [85, 60, 110, '50%'],
  [110, 60, 110, '100%'],
  [20, 60, 110, '0%'],
  [150, 60, 110, '100%'],
  [60, 60, 60, '0%'],
]) {
  test(`range ${value} within ${min}–${max} has accessible progress ${progress}`, () => {
    const properties = {};
    const attributes = {};
    ui().api.updateRange({
      value,
      min,
      max,
      style: {
        setProperty: (key, value) => {
          properties[key] = value;
        },
      },
      setAttribute: (key, value) => {
        attributes[key] = value;
      },
    });
    assert.equal(properties['--range-fill'], progress);
    assert.equal(attributes['aria-valuetext'], `${value}%`);
  });
}
