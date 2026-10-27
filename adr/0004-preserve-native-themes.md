# ADR 0004: Detect and preserve matching native themes

- Status: Accepted
- Recorded: 2026-10-27

## Context

Always inverting a page turns an already-dark website light. Checking only html/body also misses app containers.

## Decision

Estimate native appearance using a bounded nine-point viewport grid. Composite translucent backgrounds, normalize modern CSS colors through canvas, and track sampled elements and their ancestors. Temporarily disable Darky styles while inspecting native colors. Convert only when the requested appearance differs. A matching theme gets brightness only; at 100% brightness, remove the stylesheet.

## Consequences

Native themes retain their own colors. Mutation, stylesheet-load, scroll, viewport, and system events trigger throttled reassessment. Ignore Darky mutations to avoid loops. Gradients, mixed themes, images, and animated styles can still mislead this heuristic.

The [later declaration-priority decision](0015-prefer-explicit-native-theme-declarations.md) adds whole-app signals ahead of this sampling fallback to handle mixed light/dark content.

## References

[Detector](../src/content/theme-detection.js), [page lifecycle](../src/content/content.js), [rendering regressions](../tests/browser/check-rendering.cjs).
