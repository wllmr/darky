# ADR 0012: Shared modules and enforced readable code

- Status: Accepted
- Recorded: 2026-10-27

## Context

The first implementation duplicated settings rules and mixed detection, CSS, persistence, and event handling in large functions. The user requested test coverage first, then a readable refactor.

## Decision

After extending baseline tests, extract shared settings rules, native detection, and stylesheet rendering into lib/. Keep page, popup, options, worker, and UI controllers focused on their own lifecycles. Use named handlers, descriptive camelCase names, early returns, and comments explaining constraints. Enforce ESLint recommended checks and Prettier formatting with two-space indentation, single quotes, and semicolons.

## Consequences

Runtime code remains dependency-free and loadable without a build. Development tools add dependencies only for contributors. Explicit load order must be maintained in the manifest, page markup, worker imports, tests, and package. Shared tests guard the existing storage format and behavior.

The later [layout decision](0014-group-runtime-and-tests-by-responsibility.md) moves these shared modules under `src/` while preserving the separation described here.

## References

[Shared modules](../src/shared), [code standards](../CONTRIBUTING.md).
