(() => {
  // Reopening the popup reinjects this controller into pre-installation tabs.
  // Dependencies are safe to reload; observers and listeners must install once.
  if (globalThis.__darkyInstalled) {
    globalThis.__darkyRefreshSettings?.();
    return;
  }
  globalThis.__darkyInstalled = true;

  document.getElementById('darky-theme')?.remove();
  const stylesheet = document.createElement('style');
  stylesheet.id = 'darky-theme';
  const detector = DarkyThemeDetection.createDetector(stylesheet);
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const RENDER_DELAY_MS = 120;
  let settings = {};
  let settingsLoaded = false;
  let renderScheduled = false;
  let lastReport = '';
  let pageState = null;
  let settingsRequest = null;
  let pendingStorageChanges = {};

  function publishState(appearance, state) {
    pageState = state;
    const signature = JSON.stringify([appearance, systemTheme.matches, state]);
    if (signature === lastReport) return;
    lastReport = signature;
    chrome.runtime
      ?.sendMessage({
        type: 'darky:appearance',
        appearance,
        dark: systemTheme.matches,
        state,
      })
      .catch(() => {});
  }

  function render() {
    if (!settingsLoaded) return;
    if (settings.enabled === false) {
      stylesheet.remove();
      publishState('paused', { enabled: false });
      return;
    }

    const mode = DarkySettings.resolveTheme(settings, location.hostname, systemTheme.matches);
    const nativeDark = detector.isDark();
    const state = {
      enabled: true,
      mode,
      nativeDark,
      inverted: mode !== 'original' && (mode === 'dark') !== nativeDark,
      brightness: DarkySettings.getBrightness(settings, location.hostname),
    };
    const appearance = mode === 'original' ? (nativeDark ? 'dark' : 'light') : mode;
    DarkyThemeStyles.apply(stylesheet, state);
    publishState(appearance, state);
  }

  function scheduleRender() {
    if (renderScheduled || !settingsLoaded) return;
    renderScheduled = true;
    setTimeout(() => {
      renderScheduled = false;
      render();
    }, RENDER_DELAY_MS);
  }

  function affectsPageTheme(record) {
    if (record.target === stylesheet || stylesheet.contains(record.target)) return false;
    if (record.type === 'attributes') {
      return (
        record.target === document.documentElement ||
        record.target === document.body ||
        detector.usesElement(record.target)
      );
    }
    return [...record.addedNodes, ...record.removedNodes].some((node) => node !== stylesheet);
  }

  function watchPageTheme() {
    const observer = new MutationObserver((records) => {
      if (records.some(affectsPageTheme)) scheduleRender();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style', ...DarkyThemeDetection.THEME_ATTRIBUTES, 'color-scheme'],
    });
    render();
  }

  function handleStateQuery(message, sender, sendResponse) {
    if (sender.id === chrome.runtime.id && message?.type === 'darky:get-state')
      sendResponse(pageState);
  }

  function handleStorageChange(changes, area) {
    if (area !== 'local') return;
    if (settingsRequest || !settingsLoaded) Object.assign(pendingStorageChanges, changes);
    DarkySettings.applyChanges(settings, changes);
    render();
  }

  function handleStylesheetLoad(event) {
    if (event.target?.tagName === 'LINK') scheduleRender();
  }

  function loadSettings() {
    if (settingsRequest) return settingsRequest;
    settingsRequest = Promise.resolve()
      .then(() => chrome.storage.local.get(null))
      .then((initialSettings) => {
        // A storage read is a snapshot. Preserve toggle/slider changes delivered
        // while it was pending rather than restoring the older snapshot.
        DarkySettings.applyChanges(initialSettings, pendingStorageChanges);
        pendingStorageChanges = {};
        settings = initialSettings;
        settingsLoaded = true;
        render();
      })
      .catch(() => {
        // Reopening the popup retries the read; leave the website unchanged.
      })
      .finally(() => {
        settingsRequest = null;
      });
    return settingsRequest;
  }

  globalThis.__darkyRefreshSettings = loadSettings;

  chrome.runtime?.onMessage?.addListener(handleStateQuery);
  chrome.storage.onChanged.addListener(handleStorageChange);
  systemTheme.addEventListener('change', scheduleRender);
  document.addEventListener('load', handleStylesheetLoad, true);
  globalThis.addEventListener?.('resize', scheduleRender);
  globalThis.addEventListener?.('scroll', scheduleRender, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPageTheme, { once: true });
  } else {
    watchPageTheme();
  }
  if (!document.documentElement) {
    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      render();
      observer.disconnect();
    });
    observer.observe(document, { childList: true });
  }
  loadSettings();
})();
