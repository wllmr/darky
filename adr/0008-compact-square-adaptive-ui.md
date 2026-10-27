# ADR 0008: Compact square UI with adaptive appearance

- Status: Accepted
- Recorded: 2026-10-27

## Context

The user prefers sharp-edged interfaces, while logos and icons may retain rounded shapes.

## Decision

Keep a 304px-wide popup and a separate responsive options page. Use square cards, fields, switches, and slider handles; retain rounded logos and status icons. Share dark/light CSS tokens and UI appearance/range helpers. The popup follows its effective site appearance, options follows global appearance, and Original uses system appearance for extension UI.

## Consequences

The design is consistent across views without a UI framework. Filled tracks, accessible percentage text, readable secondary labels, visible focus, and reduced-motion support are part of the controls. Browser-owned select menus may retain platform styling.

## References

[Popup styles](../src/shared/ui.css), [options styles](../src/options/options.css), [UI helpers](../src/shared/ui-theme.js).
