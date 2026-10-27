# ADR 0015: Prefer explicit native-theme declarations over content panels

- Status: Accepted
- Recorded: 2026-10-27

## Context

A viewport majority can misidentify a dark application's native theme when a large mail/document pane is white, producing unwanted double inversion. Proton's public theme provider illustrates this case by exposing the active app mode on the document. The fix must be global rather than a host exception.

## Decision

Before background sampling, inspect exact `dark` and `light` values in document/body `data-theme-mode`, `data-color-mode`, and `data-theme` attributes. Then inspect a single effective CSS `color-scheme` value on body (or the root before body exists), allowing the `only` qualifier. Reading the effective body value respects CSS inheritance and body overrides. A declaration supporting both light and dark does not identify the active mode. Unknown names and automatic modes fall through to existing viewport sampling.

Document declarations take precedence over body declarations, followed by single CSS schemes and then visible-background inference. Observe the same theme attributes, including `data-theme-mode`, so changing a site's own theme updates the decision without navigation. Keep brightness independent and remove conversion CSS when native and requested modes match.

## Consequences

The same detector preserves dark and light app shells with contrasting reading panes across sites; no hostname checks, theme-name mappings, or domain exclusions are introduced. Explicit declarations are trusted as whole-app intent, so stale or incorrect declarations from a website can still mislead detection. Sites without a clear declaration continue to use the heuristic from ADR 0004.

Tests reproduce mixed panes, verify brightness pixel values, follow live declaration changes, and check ambiguous declarations. Proton's authenticated application was not accessed; its public theme source informed a synthetic regression layout.

## References

[Detector](../src/content/theme-detection.js), [observer](../src/content/content.js), [regressions](../tests/unit/regression.test.cjs), [browser checks](../tests/browser/check-rendering.cjs), [Proton's public theme provider](https://github.com/ProtonMail/WebClients/blob/main/packages/components/containers/themes/ThemeProvider.tsx).
