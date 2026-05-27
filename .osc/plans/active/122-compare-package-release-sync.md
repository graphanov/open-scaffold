# Plan: 122-compare-package-release-sync

## Status

active

## Context

The compare source feature from #134 is now present on `main` as a package-visible CLI surface: `osc compare <attempt-a-dir> <attempt-b-dir>`. Local `main` exposes the command, but npm `latest` remains `open-scaffold@1.0.4` and a fresh isolated-cache `npx open-scaffold@latest --help` does not show `osc compare`. GitHub Latest Release is also still `v1.0.4`, cut before the compare source feature.

Context Authority work is designed and ready, but package/public-surface truth must be reconciled first so new users can install the command that just landed.

## Goal

Prepare and verify `open-scaffold@1.0.5` as the package/public-surface sync for the bare attempt compare command so npm `latest`, fresh `npx`, and GitHub Latest Release can match `main` after the owner-approved publish/release gate.

## Constraints / Out of scope

- Do not add new `osc compare` behavior beyond PR #134.
- Do not change attempt comparison scoring, model judgment, frontier promotion, runtime spawning, or evolution-loop semantics.
- Do not start Context Authority 071/117/119/120/121 in this slice.
- Keep npm publishing and GitHub Release creation as explicit owner-gated follow-through after PR integration.
- Keep this release-sync plan active until npm/latest, fresh isolated-cache `npx`, and any approved GitHub Latest Release are verified.

## Files to touch

- `package.json` — bump root package version to `1.0.5`.
- `package-lock.json` — keep root lockfile version metadata in sync.
- `docs/CHANGELOG.md` — record the v1.0.5 package surface and keep previous release status truthful.
- `.osc/plans/active/122-compare-package-release-sync.md` — this plan.
- `.osc/releases/2026-05-27-122-compare-package-release-sync.md` — durable release-sync candidate evidence.
- This plan file and `MISSION.md` — closeout only after package/release proof exists.

## Acceptance criteria

- [x] Root package version is bumped to `1.0.5` and lockfile metadata matches.
- [x] Changelog documents v1.0.5 as the package-surface sync for `osc compare`.
- [x] Local gates pass before PR: `./verify.sh --strict`, focused compare tests, `npm test`, `npm run build`, `npm pack --dry-run --json`, `npm publish --dry-run`, `git diff --check`.
- [ ] PR CI and latest-head Codex review are clean before PR integration.
- [ ] Trusted publishing succeeds for `open-scaffold@1.0.5` after PR integration and owner publish approval.
- [ ] `npm view open-scaffold version dist-tags --json` shows `1.0.5` / `latest: 1.0.5`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` includes `osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest compare <attempt-a-dir> <attempt-b-dir>` runs against a temporary copy of the example fixture.
- [ ] GitHub Release `v1.0.5` exists, targets the integrated main commit, and is marked Latest if release publication is approved.

## Verification steps

1. Run `git diff --check`.
2. Run `./verify.sh --strict`.
3. Run `npm test -- tests/compare.test.ts --run`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` and compare output to `examples/attempt-compare/expected.md`.
7. Run `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b --json` and parse it as JSON.
8. Run `npm pack --dry-run --json` and confirm the package includes `dist/compare.js` / `dist/compare.d.ts`.
9. Run `npm publish --dry-run`.
10. After PR integration/publication, run `npm view open-scaffold version dist-tags --json`.
11. After publish, run fresh isolated-cache `npx --yes open-scaffold@latest --help` and verify `osc compare` appears.
12. After publish, run fresh isolated-cache `npx --yes open-scaffold@latest compare` against a temporary copy of the attempt-compare fixture.
13. Check `gh release list --repo graphanov/open-scaffold --limit 5` for `v1.0.5` as Latest if the GitHub Release gate is approved.

## Open questions

- None for the package-sync candidate. Actual npm publishing, GitHub Release creation, plan closeout, and Kanban completion remain owner-gated follow-through after this PR.
