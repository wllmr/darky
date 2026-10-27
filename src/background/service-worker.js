importScripts('../shared/settings.js');

const APPEARANCE_LABELS = { dark: 'Dark', light: 'Light', paused: 'Paused — all effects off' };
let systemDark = true;
let settingsRevision = 0;

async function setToolbarAppearance(appearance, tabId) {
  const target = tabId == null ? {} : { tabId };
  try {
    await Promise.all([
      chrome.action.setIcon({
        ...target,
        path: {
          16: `src/assets/icons/${appearance}16.png`,
          32: `src/assets/icons/${appearance}32.png`,
        },
      }),
      chrome.action.setTitle({ ...target, title: `Darky · ${APPEARANCE_LABELS[appearance]}` }),
    ]);
  } catch {
    // A tab may close between its appearance report and the action update.
  }
}

async function refreshDefaultAppearance() {
  const revision = ++settingsRevision;
  try {
    const settings = await chrome.storage.local.get(['enabled', 'theme']);
    if (revision !== settingsRevision) return;
    let appearance = DarkySettings.resolveTheme(settings, undefined, systemDark);
    if (appearance === 'original') appearance = systemDark ? 'dark' : 'light';
    await setToolbarAppearance(settings.enabled === false ? 'paused' : appearance);
  } catch {
    // Keep the packaged icon when local preferences cannot be read.
  }
}

function handleAppearanceMessage(message, sender) {
  if (sender.id !== chrome.runtime.id) return;
  if (!['darky:system', 'darky:appearance'].includes(message?.type)) return;
  if (typeof message.dark === 'boolean' && systemDark !== message.dark) {
    systemDark = message.dark;
    refreshDefaultAppearance();
  }
  if (
    message.type === 'darky:appearance' &&
    sender.tab?.id != null &&
    Object.hasOwn(APPEARANCE_LABELS, message.appearance)
  ) {
    setToolbarAppearance(message.appearance, sender.tab.id);
  }
}

function handleStorageChange(changes, area) {
  if (area === 'local') refreshDefaultAppearance();
}

chrome.runtime.onMessage.addListener(handleAppearanceMessage);
chrome.storage.onChanged.addListener(handleStorageChange);
chrome.runtime.onInstalled.addListener(refreshDefaultAppearance);
chrome.runtime.onStartup.addListener(refreshDefaultAppearance);
refreshDefaultAppearance();
