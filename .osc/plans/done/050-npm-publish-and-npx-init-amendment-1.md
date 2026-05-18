# Amendment 1: 050-npm-publish-and-npx-init

## Parent

050-npm-publish-and-npx-init

## Date

2026-05-18

## Learning

The original plan was written from a stale external-review claim. Live registry and release evidence now show that `open-scaffold@0.4.1` exists on npm, `latest` points to `0.4.1`, `npx --yes open-scaffold@latest init --tier min --target <tmp>` succeeds, and GitHub Release `v0.4.1 — First-run adoption hardening` exists.

The remaining issue is not an unpublished package. It is package/public-surface drift: current `main` contains CLI lifecycle helpers not present in the already-published `latest` package, npm metadata lacks repository/homepage/keywords, and the package tarball ships docs that reference `packages/runtime-omx/` while the root npm payload does not ship that package path.

The generated min scaffold intentionally contains an unset mission, so `./verify.sh --standard` fails until a user defines the mission. That means the original acceptance criterion requiring a fresh min scaffold to pass `--standard` immediately was too strong for current product behavior.

## New direction

Close this plan as a truth-reconciliation slice, not as an initial-publish slice. The publish blocker is already resolved by `open-scaffold@0.4.1`; this PR should record the live npm/npx/package evidence, patch missing package metadata in `package.json`, and create a narrow follow-up plan for the remaining public-surface/release sync work.

No npm publish, merge, runtime roadmap change, runtime-OMO work, docs compression, brownfield init, wizard/linter, dashboard, task database, or evidence-chain feature work belongs in this slice.

## Impact on acceptance criteria

- AC1 remains relevant for public-safety, but the old sub-100KB footprint target is not used as the close gate for this stale plan; current local pack evidence is about 162KB compressed, so any future footprint budget belongs in the package public-surface follow-up.
- AC2 is satisfied by live registry evidence: `npm view open-scaffold version time dist-tags --json` returns `0.4.1` and `latest: 0.4.1`.
- AC3 is corrected: latest `npx` min-tier init succeeds, but min tier creates the smallest scaffold (`MISSION.md`, `.osc/`, `verify.sh`, `close.sh`, `bootstrap.sh`) rather than the standard/max agent entrypoint set.
- AC4 is corrected: a generated min scaffold is not expected to pass `./verify.sh --standard` until the user defines the mission; the mission-gate failure is expected behavior, not an npm failure.
- AC5 remains relevant and is satisfied by current local tarball evidence: forbidden private/dogfood prefixes are absent.
- AC6 is not required for initial publish anymore; CI exists separately, and future release automation remains a separate owner-approved slice.
- AC7 remains relevant as normal verification for this PR.
- AC8 is partially addressed by adding missing package metadata in `package.json`; publishing that metadata to npm remains owner-gated follow-up work.
