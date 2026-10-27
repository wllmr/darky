(() => {
  const CONTENT_SCRIPTS = [
    'src/shared/settings.js',
    'src/content/theme-detection.js',
    'src/content/theme-styles.js',
    'src/content/content.js',
  ];
  const STATE_TIMEOUT_MS = 2000;
  const elements = {
    appearance: document.querySelector('#theme'),
    siteAppearance: document.querySelector('#site-theme'),
    enabled: document.querySelector('#enabled'),
    brightness: document.querySelector('#brightness'),
    brightnessValue: document.querySelector('#brightness-value'),
    siteBrightness: document.querySelector('#site-brightness'),
    siteBrightnessValue: document.querySelector('#site-brightness-value'),
    resetBrightness: document.querySelector('#reset-brightness'),
    resetSite: document.querySelector('#reset-site'),
    status: document.querySelector('#status'),
    siteEffect: document.querySelector('#site-effect'),
    hostname: document.querySelector('#hostname'),
    powerState: document.querySelector('#power-state'),
    brightnessState: document.querySelector('#site-brightness-state'),
    manageSites: document.querySelector('#manage-sites'),
  };

  async function initialize() {
    const [settings, tabs] = await Promise.all([
      chrome.storage.local.get(null),
      chrome.tabs.query({ active: true, currentWindow: true }),
    ]);
    const tab = tabs[0];
    const url = tab?.url ? new URL(tab.url) : null;
    const siteKeys = DarkySettings.getSiteKeys(url?.hostname);
    let pageConnected = false;
    let pageMessage = '';
    let resettingBrightness = false;
    let pageState = null;
    let stateRevision = 0;
    let statusUnavailable = false;

    function renderSiteStatus() {
      if (!pageConnected) {
        elements.siteEffect.textContent = 'Unavailable on this page';
        return;
      }
      if (settings.enabled === false || pageState?.enabled === false) {
        elements.siteEffect.textContent = 'Paused · no effects applied';
        return;
      }
      if (!pageState) {
        elements.siteEffect.textContent = statusUnavailable
          ? 'Status unavailable · refresh page'
          : 'Checking appearance…';
        return;
      }
      if (pageState.inverted) {
        elements.siteEffect.textContent = `Converting to ${pageState.mode}`;
        return;
      }
      const appearance =
        pageState.mode === 'original'
          ? 'Original colors'
          : `Already ${pageState.nativeDark ? 'dark' : 'light'}`;
      const effect = pageState.brightness === 100 ? 'no changes' : 'brightness only';
      elements.siteEffect.textContent = `${appearance} · ${effect}`;
    }

    function renderBrightness(input, output, value) {
      input.min = DarkySettings.MIN_BRIGHTNESS;
      input.max = DarkySettings.MAX_BRIGHTNESS;
      input.value = value;
      output.value = `${input.value}%`;
      DarkyUI.updateRange(input);
    }

    function render() {
      renderSiteStatus();
      DarkyUI.update(settings, pageConnected ? url?.hostname : undefined);
      elements.powerState.textContent = settings.enabled === false ? 'Paused' : 'On';
      elements.enabled.checked = settings.enabled !== false;
      elements.enabled.disabled = false;
      elements.appearance.value = settings.theme ?? 'dark';
      elements.appearance.disabled = false;
      elements.siteAppearance.value = settings[siteKeys.theme] ?? 'default';
      elements.siteAppearance.disabled = !pageConnected;
      elements.brightness.disabled = resettingBrightness;
      const hasCustomBrightness = Object.keys(settings).some(
        (key) => key.startsWith('brightness:') && settings[key] != null,
      );
      elements.resetBrightness.disabled = resettingBrightness || !hasCustomBrightness;
      renderBrightness(
        elements.brightness,
        elements.brightnessValue,
        DarkySettings.getBrightness(settings),
      );
      renderBrightness(
        elements.siteBrightness,
        elements.siteBrightnessValue,
        DarkySettings.getBrightness(settings, url?.hostname),
      );
      elements.siteBrightness.disabled = !pageConnected || resettingBrightness;
      elements.brightnessState.textContent =
        settings[siteKeys.brightness] != null ? 'Custom' : 'Default';
      elements.resetSite.disabled =
        !pageConnected ||
        resettingBrightness ||
        (settings[siteKeys.theme] == null && settings[siteKeys.brightness] == null);
    }

    function showSavedStatus() {
      elements.status.textContent =
        pageMessage ||
        (settings.enabled === false ? 'Paused on all sites. Your settings are kept.' : '');
    }

    async function save(values) {
      try {
        await chrome.storage.local.set(values);
        Object.assign(settings, values);
        render();
        showSavedStatus();
      } catch {
        render();
        elements.status.textContent = 'Could not save. Reopen Darky to try again.';
      }
    }

    async function removeOverrides(keys, failureMessage) {
      try {
        await chrome.storage.local.remove(keys);
        for (const key of keys) delete settings[key];
        render();
        showSavedStatus();
      } catch {
        render();
        elements.status.textContent = failureMessage;
      }
    }

    async function resetAllBrightness() {
      resettingBrightness = true;
      render();
      try {
        const current = await chrome.storage.local.get(null);
        const keys = Object.keys(current).filter((key) => key.startsWith('brightness:'));
        if (keys.length) await chrome.storage.local.remove(keys);
        for (const key of keys) delete settings[key];
        showSavedStatus();
      } catch {
        elements.status.textContent = 'Could not reset brightness. Try again.';
      } finally {
        resettingBrightness = false;
        render();
      }
    }

    function handleAppearanceChange() {
      save({ theme: elements.appearance.value });
    }
    function handlePowerChange() {
      save({ enabled: elements.enabled.checked });
    }
    function handleSiteAppearanceChange() {
      if (!pageConnected) return;
      if (elements.siteAppearance.value === 'default') {
        removeOverrides([siteKeys.theme], 'Could not save. Reopen Darky to try again.');
      } else {
        save({ [siteKeys.theme]: elements.siteAppearance.value });
      }
    }
    function handleBrightnessInput() {
      DarkyUI.updateRange(elements.brightness);
      elements.brightnessValue.value = `${elements.brightness.value}%`;
      save({ brightness: Number(elements.brightness.value) });
    }
    function handleSiteBrightnessInput() {
      DarkyUI.updateRange(elements.siteBrightness);
      elements.siteBrightnessValue.value = `${elements.siteBrightness.value}%`;
      save({ [siteKeys.brightness]: Number(elements.siteBrightness.value) });
    }
    function resetSite() {
      removeOverrides(
        [siteKeys.brightness, siteKeys.theme],
        'Could not reset. Reopen Darky to try again.',
      );
    }
    async function openSavedSites() {
      try {
        await chrome.runtime.openOptionsPage();
      } catch {
        elements.status.textContent = 'Could not open saved sites. Try again.';
      }
    }
    function handleStorageChange(changes, area) {
      if (area !== 'local') return;
      DarkySettings.applyChanges(settings, changes);
      render();
    }
    function handlePageState(message, sender) {
      if (sender.id !== chrome.runtime.id || sender.tab?.id !== tab?.id || sender.frameId !== 0)
        return;
      if (message?.type !== 'darky:appearance' || typeof message.state?.enabled !== 'boolean')
        return;
      stateRevision++;
      pageState = message.state;
      renderSiteStatus();
    }

    async function connectPage() {
      if (!DarkySettings.isSupportedUrl(url)) {
        elements.hostname.textContent = 'This page is unavailable';
        pageMessage = 'Open a website to edit its settings.';
        return;
      }
      elements.hostname.textContent = url.hostname;
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_SCRIPTS });
        pageConnected = true;
        setTimeout(() => {
          if (pageState) return;
          statusUnavailable = true;
          renderSiteStatus();
        }, STATE_TIMEOUT_MS);
        const revision = stateRevision;
        try {
          const initialState = await chrome.tabs.sendMessage(
            tab.id,
            { type: 'darky:get-state' },
            { frameId: 0 },
          );
          // A newer live report takes precedence over the initial query.
          if (revision === stateRevision && typeof initialState?.enabled === 'boolean')
            pageState = initialState;
        } catch {
          statusUnavailable = true;
        }
      } catch {
        pageMessage = 'Cannot connect. Check site access and refresh the page.';
      }
    }

    elements.appearance.addEventListener('change', handleAppearanceChange);
    elements.siteAppearance.addEventListener('change', handleSiteAppearanceChange);
    elements.enabled.addEventListener('change', handlePowerChange);
    elements.brightness.addEventListener('input', handleBrightnessInput);
    elements.siteBrightness.addEventListener('input', handleSiteBrightnessInput);
    elements.resetBrightness.addEventListener('click', resetAllBrightness);
    elements.resetSite.addEventListener('click', resetSite);
    elements.manageSites.addEventListener('click', openSavedSites);
    chrome.runtime.onMessage.addListener(handlePageState);
    chrome.storage.onChanged.addListener(handleStorageChange);
    render();
    await connectPage();
    render();
    showSavedStatus();
  }

  initialize().catch(() => {
    elements.status.textContent = 'Could not load settings. Reopen Darky to try again.';
  });
})();
