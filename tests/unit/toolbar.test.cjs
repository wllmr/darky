const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../../src/background/service-worker.js');
const source = existsSync(file) ? readFileSync(file, 'utf8') : '';
const settle = () => new Promise((resolve) => setImmediate(resolve));

function worker(settings = {}) {
  const messages = [],
    changes = [],
    icons = [],
    titles = [];
  const event = (list) => ({ addListener: (listener) => list.push(listener) });
  const chrome = {
    runtime: {
      id: 'darky-test',
      onMessage: event(messages),
      onInstalled: event([]),
      onStartup: event([]),
    },
    storage: { local: { get: async () => settings }, onChanged: event(changes) },
    action: {
      setIcon: async (value) => icons.push(value),
      setTitle: async (value) => titles.push(value),
    },
  };
  const context = vm.createContext({
    chrome,
    importScripts: (script) =>
      vm.runInContext(readFileSync(path.resolve(path.dirname(file), script), 'utf8'), context, {
        filename: path.resolve(path.dirname(file), script),
      }),
  });
  vm.runInContext(source, context, { filename: file });
  return {
    icons,
    titles,
    async send(message, tabId = 7, senderId = 'darky-test') {
      messages.forEach((listener) => listener(message, { id: senderId, tab: { id: tabId } }));
      await settle();
    },
    async change(values) {
      Object.assign(settings, values);
      changes.forEach((listener) => listener({}, 'local'));
      await settle();
    },
  };
}

test('toolbar uses distinct dark, light, and paused icons for the current site', async () => {
  const app = worker();
  await app.send({ type: 'darky:appearance', appearance: 'light', dark: false });
  assert.ok(
    app.icons.some((icon) => icon.tabId === 7 && icon.path[32] === 'src/assets/icons/light32.png'),
  );
  await app.send({ type: 'darky:appearance', appearance: 'dark', dark: true });
  assert.ok(
    app.icons.some((icon) => icon.tabId === 7 && icon.path[32] === 'src/assets/icons/dark32.png'),
  );
  await app.send({ type: 'darky:appearance', appearance: 'paused', dark: true });
  assert.ok(
    app.icons.some((icon) => icon.tabId === 7 && icon.path[32] === 'src/assets/icons/paused32.png'),
  );
  assert.ok(app.titles.some((value) => value.title.includes('Paused')));
});

test('default toolbar icon follows global power and appearance, including system reports', async () => {
  const app = worker({ theme: 'light' });
  await settle();
  assert.equal(app.icons.at(-1)?.path[32], 'src/assets/icons/light32.png');
  await app.change({ enabled: false });
  assert.equal(app.icons.at(-1)?.path[32], 'src/assets/icons/paused32.png');
  await app.change({ enabled: true, theme: 'system' });
  await app.send({ type: 'darky:system', dark: false });
  assert.equal(app.icons.at(-1)?.path[32], 'src/assets/icons/light32.png');
});

test('toolbar ignores other extensions, unknown messages, and invalid appearances', async () => {
  const app = worker();
  await settle();
  const count = app.icons.length;
  await app.send({ type: 'darky:appearance', appearance: 'light' }, 7, 'other-extension');
  await app.send({ type: 'unknown', appearance: 'light' });
  await app.send({ type: 'darky:appearance', appearance: '__proto__' });
  assert.equal(app.icons.length, count);
});

test('per-tab icons do not overwrite the default for other tabs', async () => {
  const app = worker({ theme: 'light' });
  await settle();
  await app.send({ type: 'darky:appearance', appearance: 'dark' }, 99);
  assert.ok(app.icons.some((icon) => icon.tabId === 99));
  assert.equal(
    app.icons.filter((icon) => icon.tabId == null).at(-1).path[32],
    'src/assets/icons/light32.png',
  );
});
