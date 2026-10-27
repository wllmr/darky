# ADR 0009: Dynamic dark, light, and paused icons

- Status: Accepted
- Recorded: 2026-10-27

## Context

The user wants the product logo and toolbar icon to reflect whether Darky is dark, light, or off.

## Decision

Provide moon, sun, and pause assets. UI helpers update the page logo. A small MV3 service worker updates default and per-tab toolbar icons and titles using local preferences and reports from content scripts. Original appearance reports the detected native site appearance.

## Consequences

The active website can show an icon different from the global default. Closed-tab action errors are harmless. The worker receives system appearance reports because service workers cannot directly use window.matchMedia; before a report it uses its default assumption.

## References

[Toolbar worker](../src/background/service-worker.js), [icon sources](../src/assets/icons), [toolbar regressions](../tests/unit/toolbar.test.cjs).
