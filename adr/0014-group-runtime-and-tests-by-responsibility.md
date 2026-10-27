# ADR 0014: Group runtime files and tests by responsibility

- Status: Accepted
- Recorded: 2026-10-27

## Context

Runtime entry points, styles, icon assets, browser tests, and tools were spread across the project root and partially grouped directories. The user requested a clearer project structure after the code readability refactor.

## Decision

Move runtime files under `src/`, grouped into `background`, `content`, `shared`, `popup`, `options`, and `assets/icons`. Keep the shared stylesheet with shared UI helpers; options-specific CSS remains beside the options controller. Group tests under `tests/unit`, `tests/browser`, `tests/helpers`, and `tests/package`. Reserve `scripts/` for packaging and icon generation. Keep the requested `adr/` folder and existing design documents in `docs/`.

Retain `manifest.json` at the project root, alongside package and contributor configuration. Update manifest declarations, page-relative references, worker imports, root-relative injection/icon paths, test fixtures, and tooling together. Package the root manifest and runtime `src/` files with their original relative paths.

## Consequences

Developers can find a feature's runtime files and distinguish tests from tooling. Load unpacked still uses the same project root, preserving the existing installation location and extension identity. The source remains directly loadable without a bundler. Relative paths have different bases in page markup, worker imports, and Chrome APIs; path-contract, real-extension, and ZIP tests protect these boundaries.

This updates the directory names referenced by ADR 0012 without replacing its shared-responsibility and code-standard decisions. Historical design notes describe the layout at the time they were written; current source links and contributor instructions point to the new locations.

## References

[Directory guide](../CONTRIBUTING.md), [manifest](../manifest.json), [path contracts](../tests/unit/manifest.test.cjs), [packaging checks](../tests/package/test_packaging.py).
