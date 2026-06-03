# Plan: 144-next-action-packet-npx-release-sync

## Status

active

## Context

PR #175 added workflow-neutral next-action packets to `osc evolve analyze`, and PR #176 closed the shipped plan. The repository now exposes the new behavior on `main`, but npm `open-scaffold@latest` and GitHub Latest still point at `0.30.0`. A package/release sync is needed before fresh `npx open-scaffold@latest` users can see the new evolution handoff packet.

## Goal

Publish `open-scaffold@0.30.1` on the npm `latest` dist-tag, create GitHub Release `v0.30.1` as Latest, prove fresh isolated-cache `npx` exposes the next-action packet surface, and then close this release-sync plan with final evidence.

## Constraints / Out of scope

- Do not add product features beyond the package/release sync for already-merged PRs #175 and #176.
- Do not claim benchmark support, model improvement, score improvement, workflow support, compliance certification, runtime correctness, or production readiness.
- Do not spawn runtimes, select models, approve work, publish unrelated packages, or change runtime boundaries.
- Do not publish if package, local verification, CI, trusted publishing, npm, fresh `npx`, or GitHub Release gates fail.
- Keep the package line on the current pre-1.0 `v0.30.x` track.

## Files to touch

- `package.json` — bump the package version to `0.30.1`.
- `package-lock.json` — keep the lockfile root package version aligned with `package.json`.
- `docs/CHANGELOG.md` — add release-facing `v0.30.1` notes.
- `docs/VERSION_TRUTH.md` — reconcile repository, npm, and GitHub Release truth for the `0.30.1` release flow.
- `.osc/releases/2026-06-03-144-next-action-packet-npx-release-sync.md` — record candidate gates, public publish proof, GitHub Release proof, and final closeout evidence.
- `.osc/plans/done/144-next-action-packet-npx-release-sync.md` — final closed plan path after public npm/GitHub Release/fresh `npx` proof exists.

## Acceptance criteria

- [ ] `package.json`, `package-lock.json`, changelog/version-truth docs, and release evidence prepare target version `0.30.1` without claiming npm/GitHub publication before it happens.
- [ ] Candidate gates pass: `npm ci`, `git diff --check`, focused evolution/package tests, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `./verify.sh --strict`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [ ] Release candidate PR is merged only after CI is green, latest-head Codex review is clean if triggered, and unresolved current-head review threads are zero.
- [ ] Trusted publishing publishes `open-scaffold@0.30.1` with dist-tag `latest`, and `npm view open-scaffold version dist-tags --json --prefer-online` confirms `0.30.1` / `latest`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest` proof from outside the repository verifies top-level help and the `osc evolve analyze` next-action packet JSON/markdown surface.
- [ ] GitHub Release `v0.30.1` exists, targets the merged `main` commit, is marked Latest, and uses concise public-safe boundary language.
- [ ] Final evidence records npm URL, trusted-publishing run, GitHub Release URL, fresh `npx` commands/results, PR/merge commits, and remaining risks; this plan is moved to `done/` only after those public surfaces are verified.

## Verification steps

1. Sync and inspect live truth: `git status --short --branch`, `git fetch --prune origin`, `node -p "require('./package.json').version"`, `npm view open-scaffold version dist-tags --json --prefer-online`, `gh release list --repo graphanov/open-scaffold --limit 5`, and `gh pr list --repo graphanov/open-scaffold --state open`.
2. Candidate pre-publish gates: `npm ci`; `git diff --check`; focused evolution/package tests; `npm test -- --run`; `npm run build`; `npm run osc -- doctor --check secret-scan`; `./verify.sh --strict`; `npm pack --dry-run --json`; `npm publish --dry-run --tag latest`.
3. PR gate: create a release candidate PR, monitor CI, trigger/poll Codex if normal for the repo, and require unresolved current-head review threads = 0 before merge.
4. Publish gate: dispatch the trusted-publishing workflow for expected version `0.30.1` and npm tag `latest`, wait for success, and verify registry truth with `npm view`.
5. Public package smoke: run fresh isolated-cache `npx --yes open-scaffold@latest --help`, `npx --yes open-scaffold@latest evolve analyze <loop> --format json`, and markdown output from a temp directory outside the repository.
6. Release gate: create GitHub Release `v0.30.1`, mark it Latest, and verify release list/view output.
7. Closeout gate: patch final evidence, close this plan to `done`, run `git diff --check`, `./verify.sh --strict`, and `npm run osc -- plan validate .osc/plans/done/144-next-action-packet-npx-release-sync.md --strict` before any closeout PR/merge.

## Open questions

- None. Owner authorization for the end-to-end `0.30.1` release flow is explicit; any failed gate blocks publication and must be reported instead of forced.
