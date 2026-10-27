# ADR 0007: Manage saved sites in an options page

- Status: Accepted
- Recorded: 2026-10-27

## Context

The compact popup is useful for the current website but cannot show every stored override.

## Decision

Provide a full-tab extension options page through options_ui and open it with runtime.openOptionsPage. List explicit hostname overrides only. Support search, appearance edits, brightness edits, default inheritance, and per-site reset. Render hostnames as text, preserve focused control nodes during updates, and show storage errors.

## Consequences

The popup remains compact. The list is a settings inventory rather than browsing history. Edits propagate to open pages through local storage events. No extra permission or remote service is required.

## References

[Options markup](../src/options/options.html), [options controller](../src/options/options.js), [options browser checks](../tests/browser/check-options.cjs).
