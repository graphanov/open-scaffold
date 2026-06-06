# Version Truth

This page is the canonical reconciliation between the current package version and the historical git tag line. Check it when the numbers look contradictory.

## Current line: `v0.31.x` (pre-1.0 hardening)

- **Current `package.json` version:** `0.31.0`.
- **npm latest:** `0.30.1` with dist-tag `latest` until the owner-approved `0.31.0` trusted publishing run completes; run `npm view open-scaffold version dist-tags --json` for live confirmation.
- **GitHub Release latest:** `v0.30.1` is marked **Latest** until the `v0.31.0` GitHub Release follow-through completes.
- **Maturity:** pre-1.0 hardening. The core work-record protocol is usable, but the public product surface, runtime boundary, and adoption story are still moving. See [`docs/STABILITY.md`](STABILITY.md) for the full stable-vs-experimental boundary.

Do not treat the repository version alone as proof of npm publication or GitHub Release movement. Verify the registry and release surfaces separately.

## Historical line: `v1.0.x` (including `v1.0.5`)

- **Most recent historical tag:** `v1.0.5` — published as `open-scaffold@1.0.5` on the historical `v1.0.x` launch line.
- **Status:** immutable historical artifacts. The `v1.0.x` packages remain available on npm for provenance; they are not erased.
- **Why it is not the current line:** the `v1.0.x` launch was premature. The project reset to a pre-1.0 hardening cadence at `v0.20.0` to earn the long-term stable contract honestly; `v0.31.x` continues that pre-1.0 hardening line after the framework cleanup shrink. A future real 1.0 requires the adoption path, public package surfaces, runtime boundaries, and evidence/tracing primitives to feel durable enough to sustain that promise.

## Stable vs experimental in the current line

The `v0.31.x` line defines a stable-enough core (the repo-native work-record loop, the Status + seven content-heading plan schema, lifecycle helpers, first-run onboarding, PR-native structural checks, adapter trust inspection, command/schema registries, and read-only commands such as `osc compare` and `osc trace`) alongside explicitly experimental surfaces (runtime launch, dashboards, cockpit transports, evaluation helpers, MCP interface). The framework cleanup shrink removed or repositioned older experimental helpers from the live reduced CLI; pin older package versions if you depend on those exact command shapes. See [`docs/STABILITY.md`](STABILITY.md) for the full listing.

## Summary

| Surface | Value |
|---|---|
| `package.json` version | `0.31.0` |
| Current package line | `v0.31.x` (pre-1.0) |
| Most recent historical tag | `v1.0.5` |
| Historical package line | `v1.0.x` (over-eager launch; not current) |
| npm live truth | `npm view open-scaffold version` |
| GitHub live truth | GitHub Releases → Latest |
