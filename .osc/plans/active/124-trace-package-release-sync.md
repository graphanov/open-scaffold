# Plan: 124-trace-package-release-sync

## Status

active

## Context

PR #142 landed `osc trace <plan-slug>` on `main`, but the current public package `open-scaffold@latest` remains `0.20.0` and fresh `npx open-scaffold@latest --help` does not expose the new trace command. Local `main` is clean and green after that source slice, so the next narrow slice is a package/public-surface sync candidate.

## Goal

Prepare a package/public-surface release candidate that publishes the trace work-record replay command through the public install path as `open-scaffold@0.20.1`, while keeping npm publication and GitHub Release follow-through as separate owner-approved gates.

## Constraints / Out of scope

- Do not publish to npm in this PR.
- Do not create or update a GitHub Release in this PR.
- Do not change trace behavior beyond package/public-surface metadata unless verification exposes a candidate blocker.
- Do not deprecate historical `1.0.x` npm versions in this PR.
- Do not land this release-sync PR without owner approval.

## Files to touch

- `package.json` — set the next package candidate to `0.20.1`.
- `package-lock.json` — keep the lockfile root version aligned with `package.json`.
- `docs/CHANGELOG.md` — promote the trace package-sync candidate entry and link the source PR/evidence.
- `.osc/releases/2026-05-28-124-trace-package-release-sync.md` — record candidate evidence and owner-gated publication proof slots.
- `.osc/plans/active/124-trace-package-release-sync.md` — this active plan.

## Implementation Architecture Coverage

- Strengthens: adoption trust, package/public-surface truth, trace/work-record visibility.
- Audit envelope: source plan `117`, source PR #142, release-sync plan `124`, npm registry checks, fresh `npx` smoke after owner-approved publish.
- Evaluation envelope: local gates prove the candidate builds/tests/packs/publish-dry-runs; owner-gated public checks must prove npm/latest and GitHub Latest before final plan proof.
- Feedback routing: any publish, dist-tag, GitHub Release, or old-version deprecation decision remains an owner gate and should be recorded in the release evidence note or a follow-up plan.
- Boundary: no npm publish, GitHub Release, deprecated-package write, runtime execution, or feature implementation happens in this PR.

## Acceptance criteria

- [x] `package.json` and `package-lock.json` both declare `0.20.1`.
- [x] The candidate documents that `0.20.1` publishes the PR #142 package-visible trace command.
- [x] `docs/CHANGELOG.md` includes the `v0.20.1` package-sync candidate entry for `osc trace`.
- [x] Candidate package gates pass: `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm pack --dry-run --json`, `npm publish --dry-run --tag latest`, and `git diff --check`.
- [x] Local built CLI help exposes `osc trace <plan-slug> [--json] [--include-unverified]` before PR publication.
- [x] The PR stops before landing, npm publish, GitHub Release creation/update, and optional npm deprecation of historical `1.0.x` versions.

## Verification steps

1. `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — expect `0.20.1 / 0.20.1 / 0.20.1`.
2. `npm view open-scaffold version dist-tags versions --json` — confirm live npm before publish is still `0.20.0` and `0.20.1` is not already published.
3. `npm run build` then `node dist/cli.js --help` — help includes `osc trace <plan-slug> [--json] [--include-unverified]`.
4. `./verify.sh --strict` — all scaffold checks pass.
5. `npm test -- --run` — full test suite passes.
6. `npm pack --dry-run --json` — package candidate is packable as `open-scaffold@0.20.1` and includes trace docs/dist output.
7. `npm publish --dry-run --tag latest` — candidate publish dry-run succeeds; real trusted publishing remains owner-gated.
8. `git diff --check` — whitespace check passes.

## Open questions

- Owner gate after PR lands: publish `open-scaffold@0.20.1` via trusted publishing with npm dist-tag `latest`.
- Owner gate after publish: create/mark GitHub Release `v0.20.1` as Latest after fresh isolated-cache `npx` proof.
- Optional deferred decision: whether to deprecate historical `1.0.x` npm versions with a gentle cadence-correction message, or leave them as published history.
