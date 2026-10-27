# ADR 0002: Local settings and exact-hostname overrides

- Status: Accepted
- Recorded: 2026-10-27

## Context

Users need persistent global defaults and independent preferences for individual websites without an account.

## Decision

Use chrome.storage.local. Global keys are enabled, theme, and brightness. Site overrides use `theme:<hostname>` and `brightness:<hostname>`. Missing overrides inherit global settings. Appearance defaults to dark. Brightness initially defaulted to 90%, bounded to 60–110%; the current shared settings use a 100% default and a 50–110% range. Storage events update connected views and pages.

## Consequences

Preferences stay on the device and do not require a server. Parent domains and subdomains are intentionally independent. Resetting one override must preserve other overrides and global defaults. Legacy `site:<hostname>` keys do not control current appearance.

## References

[Shared settings rules](../src/shared/settings.js), [regression contracts](../tests/unit/regression.test.cjs).
