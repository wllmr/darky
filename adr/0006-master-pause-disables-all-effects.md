# ADR 0006: Master pause disables all effects

- Status: Accepted
- Recorded: 2026-10-27

## Context

The original header switch disabled conversion while leaving brightness active, which made its meaning unclear.

## Decision

Make the header switch a global On/Paused control. Paused removes all Darky effects, including brightness, regardless of site overrides. Keep preferences saved and editable, and restore them when resumed.

## Consequences

This replaces the earlier conversion-only switch behavior. Pause is global; Original is a site/global appearance choice that can still apply brightness. Labels, status, and icons must make that distinction visible.

## References

[Popup](../src/popup/popup.html), [page pause handling](../src/content/content.js), [pause regression](../tests/unit/extension.test.cjs).
