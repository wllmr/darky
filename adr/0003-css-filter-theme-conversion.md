# ADR 0003: CSS-filter conversion with media compensation

- Status: Accepted
- Recorded: 2026-10-27

## Context

The extension must change appearance on arbitrary sites while keeping the implementation small.

## Decision

Use inversion plus hue rotation when conversion is needed, with brightness as a separate filter. Compensate images, videos, canvases, SVG image elements, and data-darky-preserve elements. Apply filters explicitly to dialogs, popovers, fullscreen content, and backdrops because they render outside the normal root layer.

## Consequences

This avoids a full DOM color rewrite or a third-party rendering engine. Root filters can affect fixed layouts, stacking, background images, shadow-root media, and cross-origin frames. Original appearance remains the escape hatch.

## References

[Stylesheet rendering](../src/content/theme-styles.js), [Chromium pixel checks](../tests/browser/check-rendering.cjs).
