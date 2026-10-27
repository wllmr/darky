# ADR 0011: Layered tests and explicit packaging checks

- Status: Accepted
- Recorded: 2026-10-27

## Context

The extension crosses DOM, storage, messaging, and browser rendering boundaries. One kind of test cannot verify all of them.

## Decision

Use Node tests for shared rules and production-script behavior with simulated external APIs; Chromium DOM and pixel checks for rendering and controls; and actual unpacked-extension checks for manifest wiring, persistence, messages, options, and toolbar behavior. Package runtime files and assets into a ZIP, checking references and integrity. Add characterization coverage before refactoring.

## Consequences

Fast tests protect logic while browser checks catch CSS and permission/load-order mistakes. Node coverage does not measure options-page DOM paths exercised by Playwright. Actual toolbar-click activeTab grants still require a manual browser check; opening popup.html as a tab is not equivalent.

## References

[Node tests](../tests), [browser scripts](../tests/browser/), [verification guide](../CONTRIBUTING.md).
