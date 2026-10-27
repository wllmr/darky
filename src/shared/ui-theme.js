(() => {
  const systemPreference = matchMedia('(prefers-color-scheme: dark)');
  let settings = {};
  let siteHostname;
  let lastReportedSystemPreference;

  function reportSystemPreference() {
    if (lastReportedSystemPreference === systemPreference.matches || !chrome.runtime?.sendMessage)
      return;
    lastReportedSystemPreference = systemPreference.matches;
    chrome.runtime
      .sendMessage({ type: 'darky:system', dark: systemPreference.matches })
      .catch(() => {});
  }

  function renderAppearance() {
    let appearance = DarkySettings.resolveTheme(settings, siteHostname, systemPreference.matches);
    if (appearance === 'original') appearance = systemPreference.matches ? 'dark' : 'light';
    document.documentElement.dataset.appearance = appearance;
    const logoState = settings.enabled === false ? 'paused' : appearance;
    const logo = document.querySelector('#logo');
    if (logo) {
      logo.src = `../assets/icons/${logoState}32.png`;
      logo.alt = `Darky ${logoState}`;
    }
    reportSystemPreference();
  }

  function updateRange(range) {
    const minimum = Number(range.min);
    const span = Number(range.max) - minimum;
    const percentage = span > 0 ? ((Number(range.value) - minimum) / span) * 100 : 0;
    const progress = Math.max(0, Math.min(100, percentage));
    range.style.setProperty('--range-fill', `${progress}%`);
    range.setAttribute('aria-valuetext', `${range.value}%`);
  }

  function update(nextSettings, hostname) {
    settings = nextSettings;
    siteHostname = hostname;
    renderAppearance();
  }

  globalThis.DarkyUI = { updateRange, update };
  systemPreference.addEventListener('change', renderAppearance);
})();
