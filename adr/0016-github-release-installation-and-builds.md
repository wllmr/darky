# ADR 0016: GitHub release installation and explicit packaging

- Status: Accepted
- Recorded: 2026-10-27

## Context

The user wants an easy GitHub installation path and clear build/install guides. The source is already directly loadable, but the earlier packaging instructions were scattered and there was no release automation.

## Decision

Provide a standalone `INSTALL.md`, a build guide, and a maintainer release guide. End users download an uploaded `darky.zip`, extract it to a permanent folder, and use the browser's Developer mode and Load unpacked controls. Source installation remains build-free. Updates replace files in the same installation folder to retain identity and settings.

Expose `npm run build` through a cross-platform Node launcher that locates Python 3.9+; retain `npm run package` as an alias and direct Python invocation as an alternative. The standard-library packager validates manifest references and optional release tags, includes install instructions and runtime sources, normalizes ZIP metadata, and writes `SHA256SUMS`.

Run all checks in GitHub Actions before exposing a build artifact. A matching `v*` tag prepares a draft GitHub release with the ZIP and checksum. Only the release job gets repository-content write permission. Pin official actions to reviewed commit hashes. Published releases are not overwritten; publication remains an explicit maintainer action.

## Consequences

End users need no Node/Python tooling for release downloads or direct source installation. Developers get a single packaging command, while CI tests the full extension before drafting a release. Metadata normalization removes local timestamp/mode variation; different compression-library versions may still produce different bytes.

GitHub unpacked installation is manual and has no automatic update channel. It does not replace a future Chrome Web Store listing. Latest-release links provide downloads only after a maintainer publishes the first stable release. Adding these local files does not push changes, create a tag, execute GitHub Actions, or publish a release.

## References

[Install guide](../INSTALL.md), [build guide](../docs/building.md), [release guide](../docs/releasing.md), [workflow](../.github/workflows/ci.yml), [packager](../scripts/package.py), [build launcher](../scripts/build.cjs), [Chrome distribution rules](https://developer.chrome.com/docs/extensions/how-to/distribute).
