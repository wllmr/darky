# Architecture decision records

These records were backfilled on 2026-10-27 from the implemented extension and project discussion. They describe accepted decisions, including the earlier switch behavior that was replaced; they are not a claim that ADR files existed when each decision was first made.

| Record | Decision                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| 0001   | [Manifest V3 and plain JavaScript](0001-manifest-v3-and-plain-javascript.md)                                       |
| 0002   | [Local settings and exact-hostname overrides](0002-local-settings-and-hostname-overrides.md)                       |
| 0003   | [CSS-filter conversion with media compensation](0003-css-filter-theme-conversion.md)                               |
| 0004   | [Detect and preserve matching native themes](0004-preserve-native-themes.md)                                       |
| 0005   | [Follow browser-reported system appearance](0005-follow-browser-system-appearance.md)                              |
| 0006   | [Master pause disables all effects](0006-master-pause-disables-all-effects.md)                                     |
| 0007   | [Manage saved sites in an options page](0007-saved-sites-options-page.md)                                          |
| 0008   | [Compact square UI with adaptive appearance](0008-compact-square-adaptive-ui.md)                                   |
| 0009   | [Dynamic dark, light, and paused icons](0009-dynamic-logo-and-toolbar-states.md)                                   |
| 0010   | [Live status comes from actual rendering state](0010-live-rendering-state-messages.md)                             |
| 0011   | [Layered tests and explicit packaging checks](0011-layered-regression-verification.md)                             |
| 0012   | [Shared modules and enforced readable code](0012-shared-modules-and-readable-code.md)                              |
| 0013   | [Resynchronize page settings without a document reload](0013-resynchronize-page-settings-without-reload.md)        |
| 0014   | [Group runtime files and tests by responsibility](0014-group-runtime-and-tests-by-responsibility.md)               |
| 0015   | [Prefer explicit native-theme declarations over content panels](0015-prefer-explicit-native-theme-declarations.md) |
| 0016   | [GitHub release installation and explicit packaging](0016-github-release-installation-and-builds.md)               |

## Adding a record

Use the next four-digit number and a descriptive filename. Include status, recorded date, context, decision, consequences, and references. Record significant changes in a new ADR and mark older decisions superseded when appropriate. Do not silently rewrite historical decisions.
