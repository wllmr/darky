# Darky

A small Chromium extension for a quieter web. Compact controls, dark and light themes, system appearance, per-site brightness, and a saved-sites manager. Plain JavaScript and Manifest V3; no runtime dependencies, accounts, analytics, or network requests.

[Download a release](https://github.com/wllmr/darky/releases/latest) · [Installation guide](INSTALL.md) · [Build guide](docs/building.md)

## Install from GitHub

1. Open [Releases](https://github.com/wllmr/darky/releases/latest) and download **darky.zip** from **Assets**.
2. Extract it to a permanent folder.
3. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`) and enable **Developer mode**.
4. Click **Load unpacked** and choose the extracted folder containing `manifest.json`.
5. Pin Darky, open a website, and refresh any tabs that were already open once.

**No Node.js, Python, npm install, or build step is needed for a release ZIP.** Do not select the ZIP itself or the `src` subfolder. See [INSTALL.md](INSTALL.md) for updates, troubleshooting, and checksum verification.

If no release is published yet, use **Code → Download ZIP**, extract the source, and load the repository folder containing `manifest.json`. Source installation also works without a build. GitHub-installed extensions use manual updates; browser-store one-click installation is a separate distribution option.

## Build a release ZIP

With Node.js and Python 3.9+ installed, run this from the repository root:

```sh
npm run build
```

This creates **dist/darky.zip** and **dist/SHA256SUMS**. It packages the runtime files without compilation or third-party build libraries. [Build instructions](docs/building.md) cover Windows/macOS/Linux and verification; [the release guide](docs/releasing.md) explains the GitHub workflow.

To update an existing unpacked installation, replace files in its original folder, click **Reload** on Darky's extension card, then refresh open websites once. Normal **On / Paused** changes apply immediately without a page reload.

## Controls

- **Header switch — On / Paused:** turns all Darky effects, including brightness, on or off across websites. Preferences stay saved and can be edited while paused. Resume to apply them again.
- **Your defaults → Appearance:** Dark, Light, Follow system, or Original. System follows OS appearance changes immediately in connected tabs. Original leaves website colors alone.
- **Your defaults → Brightness:** 50–110%, applied instantly. Default is 100%.
- **Live site status:** explains what Darky is actually applying: conversion, an already-matching native theme, original colors, or pause. Matching/original modes distinguish brightness-only adjustments from no changes at 100%. Status updates when the site changes its own theme.
- **Website → Appearance:** override the default for this hostname, or choose Use default. Original is useful for websites whose own theme you prefer.
- **Website → Brightness:** set an independent value. Default changes leave custom brightness intact.
- **Reset:** clear this website's appearance and brightness overrides.
- **Saved sites:** opens a searchable list of hostname overrides. Edit appearance or brightness, use default brightness, or reset an entire site without changing your global defaults.
- **Reset site brightness everywhere:** clear every custom brightness value; appearance overrides stay intact.

Settings save automatically on your device, apply across tabs, and use the exact hostname. Pause Darky for completely unchanged rendering across websites. For one site, select Original and set its brightness to 100%.

## Rendering and limitations

Darky first checks explicit dark/light declarations on the document or body (`data-theme-mode`, `data-color-mode`, and `data-theme`), then an unambiguous CSS `color-scheme`. These whole-app signals prevent contrasting document or mail panes from overriding the app's own theme. Ambiguous values such as `auto`, theme names, or `light dark` fall back to a small grid of visible backgrounds, including app containers and composited translucent layers. Detection uses the same rules on all websites, with no domain-specific exceptions. It supports modern CSS color formats. If the page already matches your requested appearance, Darky adds only brightness adjustments; at 100% brightness it adds no stylesheet at all. When conversion is needed, it uses inversion and hue rotation and applies a compensating filter to media. Original appearance also supports brightness, while Paused disables everything.

The popup follows the current site's effective appearance, including overrides; Original uses the system preference for the popup. Saved sites follows your global appearance. Both interfaces use sharp-edged controls, filled square brightness sliders, and readable secondary labels. The logo and toolbar use distinct moon, sun, and pause icons. On a connected website, the toolbar reflects that site's effective appearance; Original reflects its detected native theme.

This deliberately lightweight engine cannot perfectly interpret every website. Mixed backgrounds, gradients, background images, transparent layers, shadow-root media, and appearance changes driven by CSS animations or direct stylesheet rule edits can confuse detection or alter colors. Darky reassesses changes to sampled surfaces and their theme ancestors, DOM updates, stylesheet loads, viewport changes, and scrolling. Sampling is throttled, and Darky's own stylesheet changes are ignored. Root filters can affect fixed layouts and stacking. Use Original on a problem site. This is an appearance conversion, not a request for the website's own built-in theme.

Browser pages, extension stores, and built-in PDF viewers cannot be themed. Cross-origin frames inherit the outer filter but do not receive independent media correction. Chrome documents content-script timing and isolation in its [content scripts reference](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).

## Privacy and permissions

Preferences use `chrome.storage.local`. Storage saves settings, activeTab reads the current website when opening the popup, and scripting connects already-open tabs. The declared HTTP/HTTPS content script applies settings automatically. No browsing history is collected or transmitted; saved hostnames exist only for explicit site preferences. A small service worker updates the toolbar icon and title; the options page manages local preferences. No new permissions beyond the original extension are required. Chrome describes the options-page mechanism in its [options guide](https://developer.chrome.com/docs/extensions/develop/ui/options-page).

## Development and verification

Developer checks require Node 22.13+ and Python 3.9+. CI uses Node 24 and Python 3.12.

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:all
npm run build
```

Playwright needs browser system libraries and installed fonts. On supported Linux distributions, `npx playwright install-deps chromium` installs these; on Arch, install equivalent Chromium dependencies through the system package manager.

The Node regression suite exercises real popup and content scripts with simulated Chrome/DOM boundaries. Rendering checks measure pixels for page brightness, images, iframes, dialogs, popovers, and fullscreen content; they also exercise both popup palettes, saved-site controls, storage failures, and safe hostname rendering. Screenshots are saved under `test-results/`. The integration test loads the actual unpacked extension in Chromium and checks injection, popup defaults, saved-site editing/search/reset, persisted settings, live system changes, master pause/resume, per-tab toolbar states, and live rendering-state queries/updates. Opening the popup HTML as a tab does not grant activeTab; the actual toolbar click and its site-access grant still need a manual browser check.

Icons are included and need no build step. To regenerate the PNGs from the SVG files in `src/assets/icons/`, run `npm run icons`.

## Project structure

- `src/`: extension runtime, grouped into background, content, shared, popup, options, and assets.
- `tests/`: unit, browser, packaging, and shared test helpers.
- `scripts/`: packaging and icon generation.
- `adr/`: architecture decision records.
- `docs/`: build and release guides.

The Chromium manifest stays at the root, so **Load unpacked still uses this project folder**. No build step is needed. The ZIP preserves the same runtime directory structure.

## Architecture and contribution

See [the decision records](adr/README.md) for the major design decisions and [CONTRIBUTING.md](CONTRIBUTING.md) for code standards, the source layout, and test commands. Run `npm run test:all` before shipping a change.
