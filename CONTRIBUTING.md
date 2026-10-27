# Contributing to Darky

Darky uses plain JavaScript, HTML, CSS, and Manifest V3. The extension has no runtime dependencies and no build step. Development tools are local npm dependencies.

## Checks

Install Node 22.13+ (CI uses Node 24), Python 3.9+ for packaging, and Playwright Chromium:

```sh
npm ci
npx playwright install chromium
npm run test:all
```

Chromium also needs system libraries and fonts. On supported Linux distributions use `npx playwright install-deps chromium`; on Arch install the equivalent Chromium dependencies through the package manager.

Useful individual commands:

- `npm test`: fast production-script, shared-settings, UI-helper, toolbar, and regression tests.
- `npm run test:coverage`: Node/V8 coverage of runtime files exercised by the fast tests.
- `npm run test:rendering`: Chromium DOM, pixel, popup, and options-page checks.
- `npm run test:package`: verify archive completeness and exclusions in a temporary checkout.
- `npm run test:extension`: load the actual unpacked extension and check integration.
- `npm run lint`: ESLint correctness and consistency checks.
- `npm run format`: apply Prettier formatting; `npm run format:check` verifies it.
- `npm run build`: create the installable ZIP and checksum through the cross-platform launcher.
- `npm run package`: alias for `npm run build`.

## Code standard

- Use two-space indentation, single quotes, semicolons, and Prettier's line wrapping. Python uses four spaces.
- Use descriptive camelCase names for functions and variables; uppercase names for fixed constants.
- Give functions one clear responsibility. Name substantial event handlers and prefer early returns over deeply nested branches.
- Keep settings rules, native-color detection, stylesheet generation, and UI lifecycles separate.
- Share existing helpers before duplicating validation or persistence rules. Avoid frameworks, speculative abstractions, and new runtime dependencies.
- Explain browser constraints and non-obvious tradeoffs in comments. Do not narrate ordinary statements.
- Build DOM text with `textContent`; never interpolate stored hostnames into HTML.
- Report persistence failures and restore controls to saved values. Keep unrelated preferences intact.

ESLint uses its recommended rules plus `eqeqeq`, `prefer-const`, `no-var`, and unused-variable checks. A nullish comparison such as `value == null` is intentional when both null and undefined mean an absent preference.

## Project layout

```text
manifest.json              Chromium entry point; keep this at the project root
src/
  background/              Service worker and toolbar state
  content/                 Page controller, native detection, generated theme CSS
  shared/                  Settings rules, extension appearance helpers, shared UI CSS
  popup/                   Popup markup and controller
  options/                 Saved-sites markup, controller, and page-specific CSS
  assets/icons/            SVG sources and generated PNGs
scripts/                   Packaging and icon-generation tools
tests/
  unit/                    Fast production-script and rules tests
  browser/                 Chromium DOM, pixel, and actual-extension checks
  helpers/                 Reusable Chrome/DOM test boundaries
  package/                 ZIP completeness and exclusion checks
adr/                       Numbered architecture decisions
docs/                      Build and release guides
```

Load the **project root** through Chrome's Load unpacked command, as before. The root manifest points into `src/`; do not load `src/` itself. Keeping the unpacked root unchanged avoids changing the extension identity just to reorganize files.

| File                               | Responsibility                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/shared/settings.js`           | Defaults, theme resolution, brightness bounds, hostname keys, storage changes, and page policy |
| `src/content/theme-detection.js`   | Bounded native-background sampling, alpha compositing, and affected ancestors                  |
| `src/content/theme-styles.js`      | Website CSS generation and stylesheet lifecycle                                                |
| `src/content/content.js`           | Page observers, system/storage events, theme application, and state messages                   |
| `src/popup/popup.js`               | Popup controls, persistence, connection, and live status                                       |
| `src/options/options.js`           | Saved-site search, row controls, persistence, and stable DOM updates                           |
| `src/shared/ui-theme.js`           | Shared extension palettes, logo appearance, and range progress                                 |
| `src/shared/ui.css`                | Shared UI tokens, controls, and compact popup layout                                           |
| `src/background/service-worker.js` | Default/per-tab toolbar appearance                                                             |

Classic scripts load explicitly. Content scripts load settings, detector, styles, then controller. Popup and options reference shared settings and UI helpers through page-relative URLs. The worker imports settings relative to its own directory. Manifest paths, popup reinjection paths, and action icon paths are extension-root-relative. Preserve these distinctions when moving runtime files.

Packaging copies the root manifest, README, install guide, and runtime files under `src/` without changing their paths, then writes a SHA-256 checksum. SVG sources and development files stay outside the ZIP. Add source files in the appropriate feature directory and extend path-contract tests when entry points change.

## Testing changes

Before refactoring, add characterization tests for the behavior being moved and run them against the existing implementation. Before a bug fix, reproduce the failure with a regression test; verify failure, implement the fix, then run the complete suite.

Node tests execute production scripts unchanged with simulated Chrome and DOM boundaries. They cover logic and error paths; they do not prove browser rendering. Browser tests separately verify native dark/light containers, modern CSS colors, transparency, observer updates, images, top-layer rendering, keyboard control, saved-site focus, search, unsafe hostname text, and storage errors. Integration checks verify actual manifest load order, messaging, preferences, options navigation, and toolbar state.

The coverage command measures runtime files loaded by Node tests; it does not include options DOM paths exercised only in Playwright and should not be described as whole-browser coverage. Screenshots are diagnostic artifacts, not the only assertions. Manually test the real toolbar click and `activeTab` grant; opening the popup HTML in a browser tab does not grant equivalent access.

## Decision records

See [adr/README.md](adr/README.md) for accepted architectural decisions. Add a new numbered record when a significant decision changes, and identify any record it supersedes.

See the [build guide](docs/building.md) for packaging requirements and the [release guide](docs/releasing.md) for draft GitHub releases. End-user steps are in [INSTALL.md](INSTALL.md).
