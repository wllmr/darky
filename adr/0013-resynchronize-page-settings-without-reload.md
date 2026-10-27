# ADR 0013: Resynchronize page settings without a document reload

- Status: Accepted
- Recorded: 2026-10-27

## Context

The popup On/Paused switch must affect an open website immediately. A delayed initial storage snapshot could overwrite newer storage events, restoring an older power state. A failed initial read also left an installed page controller unable to recover when the popup was reopened.

## Decision

Keep one settings-read promise per page controller. Buffer storage changes arriving before or during a read and merge them into its snapshot before rendering. Reinjecting an installed controller requests a settings refresh without duplicating listeners or observers. Retain pending changes after a failed read so the next popup connection can retry.

## Consequences

Pause and resume remain live while initialization and storage reads are in flight. Reopening the popup can recover a failed initial read. Regression tests cover both power directions, stale snapshots, recovery, and single-listener installation; real Chromium integration repeats pause/resume while verifying the page document stays the same.

This does not equate a popup toggle with Chrome's extension Reload command. Reloading or updating an unpacked extension can invalidate already-open page contexts and may still require a one-time page refresh. No new permissions or preference keys are introduced.

## References

[Page controller](../src/content/content.js), [regressions](../tests/unit/regression.test.cjs), [actual extension checks](../tests/browser/check-extension.cjs).
