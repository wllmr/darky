# ADR 0005: Follow browser-reported system appearance

- Status: Accepted
- Recorded: 2026-10-27

## Context

The user already schedules appearance through the operating system and does not need a separate extension schedule.

## Decision

Resolve Follow system using matchMedia("(prefers-color-scheme: dark)") and its change event. Support Dark, Light, System, and Original globally and per hostname. Original preserves website colors and still allows brightness. Do not add scheduling or keyboard shortcuts to the current scope.

## Consequences

Theme changes follow what Chromium reports, without OS integration or extra permissions. Windows Night light is distinct from app appearance. The browser must report an OS/app-theme change for Darky to follow it.

## References

[Settings resolution](../src/shared/settings.js), [system event handling](../src/content/content.js), [extension palettes](../src/shared/ui-theme.js).
