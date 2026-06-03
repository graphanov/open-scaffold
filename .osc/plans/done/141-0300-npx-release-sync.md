# Plan: 141-0300-npx-release-sync

## Status

done

## Context

At plan creation, `main` contained the blueprint security/adoption work from PR #168 plus the follow-up Dependabot maintenance merges from PRs #169 and #170, while npm `open-scaffold@latest` and the GitHub Latest Release still pointed at `0.20.4`. This closeout published the package-visible CLI/help/docs surface as `open-scaffold@0.30.0` and marked GitHub Release `v0.30.0` Latest.

## Goal

Publish `open-scaffold@0.30.0` on the npm `latest` dist-tag, create GitHub Release `v0.30.0` as Latest, prove the fresh `npx` public surface from an isolated external directory, and then close this release-sync plan with final evidence.

## Constraints / Out of scope

- Do not add Korean adoption/localization work.
- Do not weaken the no-spawn core boundary or run real runtime/spawn-capable lanes.
- Do not implement `119-osc-work-execute-controller` or add new product features.
- Do not claim semantic correctness, compliance certification, production readiness, or runtime correctness.
- Do not publish if package, local verification, CI, Codex/latest-head review, trusted-publishing, npm, fresh `npx`, or GitHub Release gates fail.
- Do not use unquoted shell heredocs for release notes or any Markdown containing backtick command snippets.
- Do not deploy, use webhooks, or perform unrelated external side effects; this plan is limited to GitHub/npm release flow explicitly authorized by the owner.

## Files to touch

- `package.json` — bump the package version to `0.30.0`.
- `package-lock.json` — keep the lockfile root package version aligned with `package.json`.
- `docs/CHANGELOG.md` — add release-facing `v0.30.0` published notes.
- `docs/VERSION_TRUTH.md` — reconcile repository, npm, and GitHub Release truth for the `0.30.0` release flow.
- `README.md` and `docs/STABILITY.md` — align package-line language when the release target moves from `v0.20.x` to `v0.30.x`.
- `.osc/releases/2026-06-03-141-0300-npx-release-sync.md` — record candidate gates, public publish proof, GitHub Release proof, and final closeout evidence.
- `.osc/plans/done/141-0300-npx-release-sync.md` — final closed plan path after public npm/GitHub Release/fresh `npx` proof exists.

## Acceptance criteria

- [x] `package.json`, `package-lock.json`, changelog/version-truth docs, and release evidence prepare target version `0.30.0` without claiming npm/GitHub publication before it happens.
- [x] `npm pack --dry-run --json` and an extracted-tarball smoke prove the package payload includes the built CLI, README/help/docs, and package-visible surfaces from the OSB security/adoption work.
- [x] Pre-publish gates pass from the candidate branch: `npm ci`, `git diff --check`, focused package/help tests, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `./verify.sh --strict`, `npm run osc -- verify`, `npm pack --dry-run --json`, and extracted-package smoke from a temp directory outside the repository.
- [x] Release candidate PR is merged only after CI is green, latest-head Codex review is clean if triggered, and unresolved current-head review threads are zero.
- [x] Trusted publishing publishes `open-scaffold@0.30.0` with dist-tag `latest`, and `npm view open-scaffold version dist-tags --json --prefer-online` confirms `0.30.0` / `latest`.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest` proof from outside the repository verifies top-level help plus the package-visible command/help surfaces: `first-run`, `pr check`, adapter trust commands, schemas, and `--online-github` verification language.
- [x] GitHub Release `v0.30.0 — Blueprint security and adoption release` exists, targets the merged `main` commit, is marked Latest, and uses concise public-safe boundary language.
- [x] Final evidence records npm URL, trusted-publishing run, GitHub Release URL, fresh `npx` commands/results, PR/merge commits, and remaining risks; this plan is moved to `done/` only after those public surfaces are verified.

## Verification steps

1. Sync and inspect live truth: `git status --short --branch`, `git fetch --prune origin`, `node -p "require('./package.json').version"`, `npm view open-scaffold version dist-tags --json --prefer-online`, `gh release list --repo graphanov/open-scaffold --limit 5`, and `gh pr list --repo graphanov/open-scaffold --state open`.
2. Candidate pre-publish gates: `npm ci`; `git diff --check`; focused package/help tests; `npm test -- --run`; `npm run build`; `npm run osc -- doctor --check secret-scan`; `./verify.sh --strict`; `npm run osc -- verify`; `npm pack --dry-run --json`; extracted-tarball smoke from an external temp directory.
3. PR gate: create a release candidate PR, monitor CI, trigger/poll Codex if normal for the repo, and require unresolved current-head review threads = 0 before merge.
4. Publish gate: dispatch the trusted-publishing workflow for expected version `0.30.0` and npm tag `latest`, wait for success, and verify registry truth with `npm view`.
5. Public package smoke: run fresh isolated-cache `npx --yes open-scaffold@latest --help`, `first-run --help`, command/help greps for `pr check`, `adapter check`, `adapter trust`, `schemas`, and `--online-github` from a temp directory outside the repository.
6. Release gate: create or update GitHub Release `v0.30.0`, mark it Latest, and verify release list/view output.
7. Closeout gate: patch final evidence, close this plan to `done/`, run `git diff --check`, `./verify.sh --strict`, `npm run osc -- verify`, and `npm run osc -- plan validate .osc/plans/done/141-0300-npx-release-sync.md --strict` before any closeout PR/merge.

## Open questions

- None. Owner authorization for the end-to-end `0.30.0` release flow is explicit in the release coordination prompt; any failed gate blocks publication and must be reported instead of forced.
