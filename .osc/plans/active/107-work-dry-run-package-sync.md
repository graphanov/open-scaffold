# Plan: 107-work-dry-run-package-sync

## Status

active

## Context

PR #129 is now present on `main` and adds `osc work <task-description> --runtime <preset> --dry-run` as a package-visible CLI/help surface. Local `main` exposes the command, but npm `latest` remains `open-scaffold@1.0.3` and fresh isolated-cache `npx open-scaffold@latest --help` does not show `osc work`.

## Goal

Prepare and verify `open-scaffold@1.0.4` as the package/public-surface sync for the work dry-run preview so npm `latest`, fresh `npx`, and the GitHub Latest Release can match `main` after the publish/release gate.

## Constraints / Out of scope

- Do not add new `osc work` behavior beyond PR #129.
- Do not enable non-dry-run `osc work` execution in this slice.
- Do not implement native runtime spawning, provider SDK imports, credential management, auto-install behavior, or adapter package publication.
- Keep npm publishing and GitHub Release creation as explicit public-surface follow-through after PR integration.
- Keep this release-sync plan active until npm/latest, fresh isolated-cache `npx`, and any approved GitHub Latest Release are verified.

## Files to touch

- `package.json` — bump root package version to `1.0.4`.
- `package-lock.json` — keep root lockfile version metadata in sync.
- `docs/CHANGELOG.md` — record the v1.0.4 package surface.
- `.osc/releases/2026-05-27-107-work-dry-run-package-sync.md` — durable release-sync evidence.
- `.osc/releases/2026-05-26-104-osc-work-dry-run-target.md` — reconcile source-slice evidence after PR #129 reached `main`.
- This plan file and `MISSION.md` — closeout only after package/release proof exists.

## Acceptance criteria

- [x] Root package version is bumped to `1.0.4` and lockfile metadata matches.
- [x] Changelog documents v1.0.4 as the package-surface sync for `osc work --dry-run`.
- [x] Local gates pass before PR: `./verify.sh --strict`, focused package/CLI tests, `npm test`, `npm run build`, `npm pack --dry-run --json`, `npm publish --dry-run`, `git diff --check`.
- [ ] PR CI and latest-head Codex review are clean before PR integration.
- [ ] Trusted publishing succeeds for `open-scaffold@1.0.4` after PR integration and owner publish approval.
- [ ] `npm view open-scaffold version dist-tags --json` shows `1.0.4` / `latest: 1.0.4`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` includes `osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]`.
- [ ] GitHub Release `v1.0.4` exists, targets the integrated main commit, and is marked Latest if release publication is approved.

## Verification steps

1. Run `git diff --check`.
2. Run `./verify.sh --strict`.
3. Run focused package/CLI smokes for `osc work --dry-run`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `npm pack --dry-run --json` and confirm the package includes `dist/work.js` / `dist/work.d.ts` and excludes product dogfood plans/releases.
7. Run `npm publish --dry-run`.
8. After PR integration/publication, run `npm view open-scaffold version dist-tags --json`.
9. After publish, run fresh isolated-cache `npx --yes open-scaffold@latest --help` and verify `osc work` appears.
10. Check `gh release list --repo graphanov/open-scaffold --limit 5` for `v1.0.4` as Latest if the GitHub Release gate is approved.

## Open questions

- None for the package-sync candidate. Actual npm publishing and GitHub Release creation remain owner gates.
