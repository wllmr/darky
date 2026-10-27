(() => {
  const APPEARANCE_OPTIONS = [
    ['default', 'Use default'],
    ['dark', 'Dark'],
    ['light', 'Light'],
    ['system', 'Follow system'],
    ['original', 'Original'],
  ];
  const elements = {
    sites: document.querySelector('#sites'),
    search: document.querySelector('#search'),
    status: document.querySelector('#status'),
    empty: document.querySelector('#empty'),
    paused: document.querySelector('#paused'),
    count: document.querySelector('#count'),
  };
  const rows = new Map();
  let settings = {};
  let settingsLoaded = false;
  let nextRowId = 0;

  function createElement(tag, text = '', className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
  }

  async function saveSettings(values, keysToRemove = []) {
    try {
      if (keysToRemove.length) {
        await chrome.storage.local.remove(keysToRemove);
        for (const key of keysToRemove) delete settings[key];
      } else {
        await chrome.storage.local.set(values);
        Object.assign(settings, values);
      }
      render();
      elements.status.textContent = 'Saved.';
    } catch {
      render();
      elements.status.textContent = 'Could not save your changes. Try again.';
    }
  }

  function createAppearanceControl(hostname, keys) {
    const container = createElement('div', '', 'row');
    const label = createElement('label', 'Appearance');
    const select = createElement('select');
    select.setAttribute('aria-label', `Appearance for ${hostname}`);
    for (const [value, text] of APPEARANCE_OPTIONS) {
      const option = createElement('option', text);
      option.value = value;
      select.append(option);
    }
    function handleChange() {
      if (select.value === 'default') saveSettings({}, [keys.theme]);
      else saveSettings({ [keys.theme]: select.value });
    }
    select.addEventListener('change', handleChange);
    label.append(select);
    container.append(label);
    return { container, select };
  }

  function createBrightnessControl(hostname, keys, rowId) {
    const container = createElement('div', '', 'brightness-control');
    const sliderRow = createElement('div', '', 'slider-row');
    const label = createElement('label', 'Brightness');
    const input = createElement('input');
    input.id = `${rowId}-brightness`;
    input.type = 'range';
    input.min = DarkySettings.MIN_BRIGHTNESS;
    input.max = DarkySettings.MAX_BRIGHTNESS;
    input.setAttribute('aria-label', `Brightness for ${hostname}`);
    label.htmlFor = input.id;
    const output = createElement('output');
    output.setAttribute('for', input.id);
    const reset = createElement('button', 'Use default');
    reset.type = 'button';
    reset.setAttribute('aria-label', `Use default brightness for ${hostname}`);
    function handleInput() {
      output.value = `${input.value}%`;
      DarkyUI.updateRange(input);
      saveSettings({ [keys.brightness]: Number(input.value) });
    }
    function handleReset() {
      saveSettings({}, [keys.brightness]);
    }
    input.addEventListener('input', handleInput);
    reset.addEventListener('click', handleReset);
    sliderRow.append(label, input, output);
    container.append(sliderRow, reset);
    return { container, input, output, reset };
  }

  function createSiteRow(hostname) {
    const keys = DarkySettings.getSiteKeys(hostname);
    const rowId = `saved-site-${++nextRowId}`;
    const element = createElement('section', '', 'site-row');
    element.dataset.host = hostname;
    element.setAttribute('aria-labelledby', rowId);
    const heading = createElement('div', '', 'section-heading');
    const name = createElement('h2', hostname);
    name.id = rowId;
    const reset = createElement('button', 'Reset site');
    reset.type = 'button';
    reset.setAttribute('aria-label', 'Reset site');
    reset.title = `Return ${hostname} to your defaults`;
    function handleReset() {
      saveSettings({}, [keys.theme, keys.brightness]);
    }
    reset.addEventListener('click', handleReset);
    heading.append(name, reset);
    const appearance = createAppearanceControl(hostname, keys);
    const brightness = createBrightnessControl(hostname, keys, rowId);
    const controls = createElement('div', '', 'controls');
    controls.append(appearance.container, brightness.container);
    element.append(heading, controls);
    return { element, appearance, brightness };
  }

  function renderSiteRow(row, hostname, query) {
    const keys = DarkySettings.getSiteKeys(hostname);
    row.element.hidden = !hostname.toLowerCase().includes(query);
    row.appearance.select.value = settings[keys.theme] ?? 'default';
    row.brightness.input.value = DarkySettings.getBrightness(settings, hostname);
    row.brightness.output.value = `${row.brightness.input.value}%`;
    row.brightness.reset.disabled = settings[keys.brightness] == null;
    DarkyUI.updateRange(row.brightness.input);
  }

  function renderEmptyState(total, visible) {
    elements.count.textContent = `${total} saved ${total === 1 ? 'site' : 'sites'}`;
    elements.empty.hidden = visible > 0;
    elements.empty.replaceChildren(
      createElement('h2', total ? 'No matching sites' : 'No saved sites'),
      createElement(
        'p',
        total
          ? 'Try a different website name.'
          : 'Customize a website in the Darky popup and it will appear here.',
      ),
    );
  }

  function render() {
    DarkyUI.update(settings);
    elements.paused.hidden = settings.enabled !== false;
    const hosts = DarkySettings.getSavedHostnames(settings);
    const currentHosts = new Set(hosts);
    const query = elements.search.value.trim().toLowerCase();
    for (const [hostname, row] of rows) {
      if (currentHosts.has(hostname)) continue;
      row.element.remove();
      rows.delete(hostname);
    }
    let visible = 0;
    for (const [index, hostname] of hosts.entries()) {
      if (!rows.has(hostname)) rows.set(hostname, createSiteRow(hostname));
      const row = rows.get(hostname);
      // Keep existing nodes in place so storage events do not interrupt input.
      if (elements.sites.children[index] !== row.element) {
        elements.sites.insertBefore(row.element, elements.sites.children[index] ?? null);
      }
      renderSiteRow(row, hostname, query);
      if (!row.element.hidden) visible++;
    }
    renderEmptyState(hosts.length, visible);
  }

  function handleSearch() {
    if (settingsLoaded) render();
  }
  function handleStorageChange(changes, area) {
    if (area !== 'local' || !settingsLoaded) return;
    DarkySettings.applyChanges(settings, changes);
    render();
  }
  async function initialize() {
    try {
      settings = await chrome.storage.local.get(null);
      settingsLoaded = true;
      render();
    } catch {
      elements.empty.replaceChildren(createElement('h2', 'Saved sites are unavailable'));
      elements.status.textContent = 'Could not load your settings. Reload this page to try again.';
    }
  }

  elements.search.addEventListener('input', handleSearch);
  chrome.storage.onChanged.addListener(handleStorageChange);
  initialize();
})();
