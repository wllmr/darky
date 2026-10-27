# ADR 0010: Live status comes from actual rendering state

- Status: Accepted
- Recorded: 2026-10-27

## Context

Users need to know whether Darky is converting a site or preserving an already-matching native theme.

## Decision

The content controller publishes its resolved mode, native appearance, conversion state, brightness, and power state in existing appearance messages. The popup queries initial state with tabs.sendMessage, listens for updates, validates extension/tab/top-frame identity, and lets newer live reports supersede an older initial reply. Missing state has a bounded refresh hint.

## Consequences

The status describes applied behavior rather than inferring it from dropdown values. It distinguishes brightness-only adjustments from no changes at 100%. State is transient and is not stored as browsing history. Restricted pages must not claim theme detection.

## References

[Page state publisher](../src/content/content.js), [popup status](../src/popup/popup.js), [message regressions](../tests/unit/extension.test.cjs).
