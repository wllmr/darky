(() => {
  const DEFAULT_BRIGHTNESS = 100;
  const MIN_BRIGHTNESS = 50;
  const MAX_BRIGHTNESS = 110;
  const THEME_MODES = ['dark', 'light', 'system', 'original'];

  function getSiteKeys(hostname) {
    return { theme: `theme:${hostname}`, brightness: `brightness:${hostname}` };
  }

  function getThemePreference(settings, hostname) {
    const preference = settings[getSiteKeys(hostname).theme] ?? settings.theme ?? 'dark';
    return THEME_MODES.includes(preference) ? preference : 'dark';
  }

  function resolveTheme(settings, hostname, systemDark) {
    const preference = getThemePreference(settings, hostname);
    return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  }

  function clampBrightness(value) {
    return Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, Number(value) || 100));
  }

  function getBrightness(settings, hostname) {
    return clampBrightness(
      settings[getSiteKeys(hostname).brightness] ?? settings.brightness ?? DEFAULT_BRIGHTNESS,
    );
  }

  function applyChanges(settings, changes) {
    for (const [key, change] of Object.entries(changes)) {
      if (change.newValue === undefined) delete settings[key];
      else settings[key] = change.newValue;
    }
  }

  function getSavedHostnames(settings) {
    const keys = Object.keys(settings).filter(
      (key) => /^(theme|brightness):.+/.test(key) && settings[key] != null,
    );
    return [...new Set(keys.map((key) => key.slice(key.indexOf(':') + 1)))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  function isSupportedUrl(url) {
    if (!url || !['http:', 'https:'].includes(url.protocol)) return false;
    if (url.hostname === 'chromewebstore.google.com') return false;
    return !(url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'));
  }

  globalThis.DarkySettings = Object.freeze({
    DEFAULT_BRIGHTNESS,
    MIN_BRIGHTNESS,
    MAX_BRIGHTNESS,
    getSiteKeys,
    getThemePreference,
    resolveTheme,
    clampBrightness,
    getBrightness,
    applyChanges,
    getSavedHostnames,
    isSupportedUrl,
  });
})();
