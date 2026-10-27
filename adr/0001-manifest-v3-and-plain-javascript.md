# ADR 0001: Manifest V3 and plain JavaScript

- Status: Accepted
- Recorded: 2026-10-27

## Context

Darky needs to run as a small Chromium extension that can be loaded directly from a folder.

## Decision

Use Manifest V3, classic JavaScript files, HTML, and CSS. Keep runtime code free of dependencies and build steps. Register HTTP/HTTPS content scripts at document_start and reinject them when the popup connects an existing tab. Request storage, activeTab, and scripting only.

## Consequences

Installation and debugging stay simple. Shared scripts need explicit load order. Browser-owned pages, extension stores, and built-in PDF viewers remain outside the supported surface.

## References

[Manifest](../manifest.json), [page controller](../src/content/content.js), [popup controller](../src/popup/popup.js).
