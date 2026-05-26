# Plan: 105-codex-runtime-adapter-package-release-sync

## Status

done

## Context

PR #121 put the Codex-first runtime adapter hardening slice onto `main`. That changed package-visible CLI/runtime-profile behavior and public docs: `osc runtimes list` on `main` now includes the broad user-facing `codex` preset, and README/docs now recommend `--runtime codex`. The published npm `latest` package is still `open-scaffold@1.0.1`, whose fresh `npx` runtime list does not include `codex`, so GitHub/main and npm/latest are temporarily out of sync.

## Goal

Publish and verify `open-scaffold@1.0.2` so npm `latest`, fresh `npx`, and the GitHub Latest Release include the Codex runtime preset and the `runtime-omx` adapter naming decision from PR #121.

## Constraints / Out of scope

- Do not add new runtime behavior beyond the PR #121 package-visible changes.
- Do not publish `@open-scaffold/runtime-omx`; it remains private/repo-source only.
- Do not add core spawning, auto-install, credential handling, or direct `runtime-codex` implementation.
- Do not change the Codex/OMX adapter decision in this release-sync slice.

## Files to touch

- `package.json` — bump root package version to `1.0.2`.
- `package-lock.json` — keep the root package-lock version in sync.
- `docs/CHANGELOG.md` — record the v1.0.2 public package surface.
- `.osc/releases/2026-05-26-105-codex-runtime-adapter-package-release-sync.md` — durable release-sync evidence.
- This plan file and `MISSION.md` — closeout only after package/release proof is complete.

## Acceptance criteria

- [ ] Root package version is bumped to `1.0.2` and lockfile metadata matches.
- [ ] Changelog documents v1.0.2 as a package-surface sync for the Codex runtime preset / `runtime-omx` adapter decision.
- [ ] Local gates pass before PR: `./verify.sh --strict`, `npm test`, `npm run build`, `npm pack --dry-run --json`, `git diff --check`.
- [ ] PR CI and latest-head Codex review are clean before PR integration.
- [ ] Trusted publishing succeeds for `open-scaffold@1.0.2` after PR integration.
- [ ] `npm view open-scaffold version dist-tags` shows `1.0.2` / `latest: 1.0.2`.
- [ ] Fresh isolated-cache `npx open-scaffold@latest runtimes list` includes `codex`.
- [ ] GitHub Release `v1.0.2` exists, targets the integrated main commit, and is marked Latest.

## Verification steps

1. Run `./verify.sh --strict`.
2. Run `npm test`.
3. Run `npm run build`.
4. Run `npm pack --dry-run --json`.
5. Run `git diff --check`.
6. After PR integration/publication, run `npm view open-scaffold version dist-tags --json`.
7. After publish, run fresh isolated-cache `npx --yes open-scaffold@latest runtimes list` and verify `codex` appears.
8. Check `gh release list --repo graphanov/open-scaffold --limit 5` for `v1.0.2` as Latest.

## Open questions

- None.
