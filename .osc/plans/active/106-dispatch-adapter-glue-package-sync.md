# Plan: 106-dispatch-adapter-glue-package-sync

## Status

active

## Context

PR #125 put explicit `osc dispatch <run.json> --adapter <id>` glue on `main`. That changed package-visible CLI/help behavior and runtime-adoption docs: local `main` now exposes `osc dispatch`, while the published npm `latest` package is still `open-scaffold@1.0.2` and fresh `npx open-scaffold@latest --help` does not show `osc dispatch`.

## Goal

Prepare and verify `open-scaffold@1.0.3` as the package/public-surface sync for dispatch adapter glue so npm `latest`, fresh `npx`, and the GitHub Latest Release can match `main` after the publish/release gate.

## Constraints / Out of scope

- Do not add new dispatch behavior beyond PR #125.
- Do not implement `osc work`, native runtime spawning, provider SDK imports, credential management, or auto-install behavior.
- Do not publish adapter packages in this slice.
- Keep npm publishing and GitHub Release creation as explicit public-surface follow-through after PR integration.

## Files to touch

- `package.json` — bump root package version to `1.0.3`.
- `package-lock.json` — keep root lockfile version metadata in sync.
- `docs/CHANGELOG.md` — record the v1.0.3 package surface.
- `.osc/releases/2026-05-26-106-dispatch-adapter-glue-package-sync.md` — durable release-sync evidence.
- This plan file and `MISSION.md` — closeout only after package/release proof exists.

## Acceptance criteria

- [ ] Root package version is bumped to `1.0.3` and lockfile metadata matches.
- [ ] Changelog documents v1.0.3 as the package-surface sync for `osc dispatch` adapter glue and PR validation checkout resilience.
- [ ] Local gates pass before PR: `./verify.sh --strict`, `npm test`, `npm run build`, `npm pack --dry-run --json`, `git diff --check`.
- [ ] PR CI and latest-head Codex review are clean before PR integration.
- [ ] Trusted publishing succeeds for `open-scaffold@1.0.3` after PR integration.
- [ ] `npm view open-scaffold version dist-tags --json` shows `1.0.3` / `latest: 1.0.3`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` includes `osc dispatch <run-json> --adapter <adapter-id>`.
- [ ] GitHub Release `v1.0.3` exists, targets the integrated main commit, and is marked Latest.

## Verification steps

1. Run `./verify.sh --strict`.
2. Run `npm test`.
3. Run `npm run build`.
4. Run `npm pack --dry-run --json`.
5. Run `git diff --check`.
6. After PR integration/publication, run `npm view open-scaffold version dist-tags --json`.
7. After publish, run fresh isolated-cache `npx --yes open-scaffold@latest --help` and verify `osc dispatch` appears.
8. Check `gh release list --repo graphanov/open-scaffold --limit 5` for `v1.0.3` as Latest.

## Open questions

- None.
