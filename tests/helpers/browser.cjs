const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const contentFiles = [
  'src/shared/settings.js',
  'src/content/theme-detection.js',
  'src/content/theme-styles.js',
  'src/content/content.js',
];
const root = require('node:path').resolve(__dirname, '../..');
function runContent(context) {
  for (const file of contentFiles)
    vm.runInContext(readFileSync(`${root}/${file}`, 'utf8'), context, {
      filename: `${root}/${file}`,
    });
}
const popupSource = readFileSync(`${__dirname}/../../src/popup/popup.js`, 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));

// Chrome and the DOM are external boundaries. Both production scripts run
// unchanged, sharing storage just as they do in separate extension contexts.
function browser({
  settings = {},
  blocked = false,
  url = 'https://example.com/',
  background = 'rgba(0, 0, 0, 0)',
  systemDark = true,
  pageSettingsUnavailable = false,
  activeTab = true,
  deferStateQuery = false,
  deferPageSettings = false,
  themeAttributes = {},
  colorScheme = 'normal',
} = {}) {
  const listeners = [];
  const failures = {};
  let openedOptions = 0;
  let resolveStateQuery;
  let resolvePageSettings;
  const media = new EventTarget();
  media.matches = systemDark;
  const styles = [];
  const pageMessages = [];
  const popupMessages = [];
  const popupTimers = [];
  const elements = Object.fromEntries(
    [
      'enabled',
      'brightness',
      'brightness-value',
      'site-brightness',
      'site-brightness-value',
      'reset-brightness',
      'reset-site',
      'site-brightness-state',
      'status',
      'hostname',
      'theme',
      'site-theme',
      'power-state',
      'manage-sites',
      'logo',
      'site-effect',
    ].map((id) => {
      const element = new EventTarget();
      Object.assign(element, { disabled: true, checked: false, value: '', textContent: '' });
      return [`#${id}`, element];
    }),
  );
  const chrome = {
    runtime: {
      id: 'darky-test',
      async openOptionsPage() {
        if (failures.options) throw Error('Unavailable');
        openedOptions++;
      },
      onMessage: { addListener: (listener) => popupMessages.push(listener) },
    },
    storage: {
      local: {
        async get() {
          if (failures.get) throw Error('Unavailable');
          return { ...settings };
        },
        async set(values) {
          if (failures.set) throw Error('Unavailable');
          const changes = {};
          for (const [key, newValue] of Object.entries(values)) {
            changes[key] = { oldValue: settings[key], newValue };
            settings[key] = newValue;
          }
          for (const listener of listeners) listener(changes, 'local');
        },
        async remove(keys) {
          if (failures.remove) throw Error('Unavailable');
          const changes = {};
          for (const key of keys) {
            changes[key] = { oldValue: settings[key] };
            delete settings[key];
          }
          for (const listener of listeners) listener(changes, 'local');
        },
      },
      onChanged: {
        addListener(listener) {
          listeners.push(listener);
        },
      },
    },
    tabs: {
      async query() {
        if (failures.query) throw Error('Unavailable');
        return activeTab ? [{ id: 7, url }] : [];
      },
      async sendMessage(tabId, message) {
        if (failures.message) throw Error('No receiver');
        let reply;
        pageMessages.forEach((listener) =>
          listener(message, { id: 'darky-test' }, (value) => {
            reply = value;
          }),
        );
        if (deferStateQuery)
          return new Promise((resolve) => {
            resolveStateQuery = resolve;
          });
        return reply;
      },
    },
    scripting: {
      async executeScript({ target, files }) {
        assert.equal(target.tabId, 7);
        assert.deepEqual(Array.from(files), contentFiles);
        if (blocked) throw new Error('Cannot access contents of the page');
        await runContent(page);
        return [{ frameId: 0 }];
      },
    },
  };
  const page = vm.createContext({
    chrome: {
      ...chrome,
      storage: {
        ...chrome.storage,
        local: {
          ...chrome.storage.local,
          async get() {
            if (pageSettingsUnavailable || failures.pageGet) throw Error('Unavailable');
            if (deferPageSettings) {
              const snapshot = { ...settings };
              return new Promise((resolve) => {
                resolvePageSettings = () => resolve(snapshot);
              });
            }
            return { ...settings };
          },
        },
      },
      runtime: {
        id: 'darky-test',
        onMessage: { addListener: (listener) => pageMessages.push(listener) },
        async sendMessage(message) {
          popupMessages.forEach((listener) =>
            listener(message, { id: 'darky-test', tab: { id: 7 }, frameId: 0 }),
          );
        },
      },
    },
    setTimeout: (callback) => callback(),
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    getComputedStyle: () => ({ backgroundColor: background, colorScheme }),
    matchMedia: () => media,
    location: new URL(url),
    document: {
      addEventListener() {},
      createElement() {
        return {
          textContent: '',
          isConnected: false,
          remove() {
            const index = styles.indexOf(this);
            if (index !== -1) styles.splice(index, 1);
            this.isConnected = false;
          },
        };
      },
      getElementById(id) {
        return styles.find((style) => style.id === id) ?? null;
      },
      documentElement: {
        getAttribute(name) {
          return themeAttributes[name] ?? null;
        },
        append(style) {
          styles.push(style);
          style.isConnected = true;
        },
      },
    },
  });
  return {
    styles,
    elements,
    failures,
    settings,
    async finishPageSettingsLoad() {
      resolvePageSettings();
      await settle();
    },
    async resolveInitialState(state) {
      resolveStateQuery(state);
      await settle();
    },
    get openedOptions() {
      return openedOptions;
    },
    get contentListeners() {
      return pageMessages.length;
    },
    async click(id) {
      elements[`#${id}`].dispatchEvent(new Event('click'));
      await settle();
    },
    async change(values, area = 'local') {
      if (area === 'local') await chrome.storage.local.set(values);
      else
        listeners.forEach((listener) =>
          listener(
            Object.fromEntries(
              Object.entries(values).map(([key, newValue]) => [key, { newValue }]),
            ),
            area,
          ),
        );
      await settle();
    },
    queryState(senderId = 'darky-test', type = 'darky:get-state') {
      let reply;
      pageMessages.forEach((listener) =>
        listener({ type }, { id: senderId }, (value) => {
          reply = value;
        }),
      );
      return reply;
    },
    expireStatusTimer() {
      popupTimers.splice(0).forEach((callback) => callback());
    },
    notify(state, tabId = 7, frameId = 0, senderId = 'darky-test') {
      popupMessages.forEach((listener) =>
        listener(
          { type: 'darky:appearance', state },
          { id: senderId, tab: { id: tabId }, frameId },
        ),
      );
    },
    async system(dark) {
      media.matches = dark;
      media.dispatchEvent(new Event('change'));
      await settle();
    },
    async inject() {
      await runContent(page);
      await settle();
    },
    async open() {
      const popup = vm.createContext({
        chrome,
        URL,
        setTimeout: (callback) => popupTimers.push(callback),
        DarkyUI: { update() {}, updateRange() {} },
        document: { querySelector: (selector) => elements[selector] },
      });
      vm.runInContext(readFileSync(`${root}/src/shared/settings.js`, 'utf8'), popup, {
        filename: `${root}/src/shared/settings.js`,
      });
      vm.runInContext(popupSource, popup, { filename: `${root}/src/popup/popup.js` });
      await settle();
    },
    async input(value, id = 'brightness') {
      elements[`#${id}`].value = String(value);
      elements[`#${id}`].dispatchEvent(new Event('input'));
      await settle();
    },
    async toggle(id, checked) {
      elements[`#${id}`].checked = checked;
      elements[`#${id}`].dispatchEvent(new Event('change'));
      await settle();
    },
    async choose(id, value) {
      elements[`#${id}`].value = value;
      elements[`#${id}`].dispatchEvent(new Event('change'));
      await settle();
    },
    async resetAll() {
      elements['#reset-brightness'].dispatchEvent(new Event('click'));
      await settle();
    },
    async reset() {
      elements['#reset-site'].dispatchEvent(new Event('click'));
      await settle();
    },
  };
}

module.exports = { browser };
