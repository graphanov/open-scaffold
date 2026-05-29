# Plan: 128-methodology-pr-summary-ab-package-sync

## Status

active

## Context

PR #145 reached `main` with the package-visible `osc study` methodology evidence command. PR #146 reached `main` with the package-visible `osc pr-summary <plan-slug>` reviewer mirror and `osc ab check <path>` A/B pilot packet validator.

Local `main` is verified at `d089574`, but the public install surface is still `open-scaffold@0.20.1`; fresh isolated-cache `npx open-scaffold@latest --help` does not expose `osc study`, `osc pr-summary`, or `osc ab check`. Because `0.20.1` is already published, the next narrow package candidate is `open-scaffold@0.20.2`.

## Goal

Prepare a package/public-surface release candidate that publishes the PR #145 and PR #146 package-visible commands through the public install path as `open-scaffold@0.20.2`, while keeping npm publication, GitHub Release follow-through, and final plan closeout as separate owner-approved gates.

## Constraints / Out of scope

- Do not publish to npm in this PR.
- Do not create or update a GitHub Release in this PR.
- Do not change `osc study`, `osc pr-summary`, or `osc ab check` behavior beyond package/public-surface candidate metadata unless verification exposes a candidate blocker.
- Do not run the actual A/B experiment or claim any outcome improvement.
- Do not deprecate historical `1.0.x` npm versions in this PR.
- Do not land this release-sync PR without owner approval.

## Files to touch

- `package.json` — set the next package candidate to `0.20.2`.
- `package-lock.json` — keep the lockfile root version aligned with `package.json`.
- `docs/CHANGELOG.md` — add the `v0.20.2` candidate entry for the methodology evidence, PR-summary, and A/B pilot package surface.
- `.osc/releases/2026-05-29-128-methodology-pr-summary-ab-package-sync.md` — record candidate evidence and owner-gated publication proof slots.
- `.osc/plans/active/128-methodology-pr-summary-ab-package-sync.md` — this active release-sync plan.

## Implementation Architecture Coverage

- Strengthens: adoption trust, package/public-surface truth, methodology evidence visibility, PR review ergonomics, and honest A/B pilot instrumentation.
- Audit envelope: source plans `125`, `126`, and `127`; source PRs #145 and #146; release-sync plan `128`; npm registry checks; fresh `npx` drift baseline; package dry-run and publish dry-run gates.
- Evaluation envelope: candidate verification proves the local package builds, tests, packs, and dry-runs publication; owner-approved public checks later prove npm/latest and GitHub Latest.
- Feedback routing: any actual A/B protocol run, public methodology claim, dist-tag correction, historical-version deprecation, or release-line decision remains an owner gate and should be recorded in a follow-up plan or final evidence.
- Boundary: the release-sync PR prepares package metadata and adoption-facing release notes only; publish and GitHub Release follow-through remain outside the PR until explicitly approved.

## Acceptance criteria

- [x] `package.json` and `package-lock.json` both declare `0.20.2`.
- [x] The candidate documents that `0.20.2` publishes PR #145 `osc study` and PR #146 `osc pr-summary` / `osc ab check`.
- [x] `docs/CHANGELOG.md` includes the `v0.20.2` package-sync candidate entry with an explicit not-yet-published status.
- [x] Candidate package gates pass: `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm pack --dry-run --json`, `npm publish --dry-run --tag latest`, and `git diff --check`.
- [x] Local built CLI help exposes `osc study [--json] [--since <date>] [--out <path>]`, `osc pr-summary <plan-slug> [--format <markdown|json>]`, and `osc ab check <path>` before PR publication.
- [ ] The release-sync PR stops before landing, npm publish, GitHub Release creation/update, and optional npm deprecation of historical `1.0.x` versions.
- [ ] After owner-approved merge, trusted publishing publishes `open-scaffold@0.20.2` with npm dist-tag `latest`.
- [ ] Fresh isolated-cache `npx open-scaffold@latest --help` exposes `osc study`, `osc pr-summary`, and `osc ab check`.
- [ ] GitHub Release `v0.20.2` exists and is marked Latest.

## Verification steps

1. `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — expect `0.20.2 / 0.20.2 / 0.20.2`.
2. `npm view open-scaffold version dist-tags versions --json --prefer-online` — confirm live npm before publish is still `0.20.1` and `0.20.2` is not already published.
3. `npm run build` then `node dist/cli.js --help` — help includes the three package-visible commands from PR #145/#146.
4. `./verify.sh --strict` — all scaffold checks pass.
5. `npm test -- --run` — full test suite passes.
6. `npm pack --dry-run --json` — package candidate is packable as `open-scaffold@0.20.2` and includes the relevant `dist/*` outputs and docs/examples.
7. `npm publish --dry-run --tag latest` — candidate publish dry-run succeeds; real trusted publishing remains owner-gated.
8. `git diff --check` — whitespace check passes.

## Open questions

- Owner gate: merge the package-sync PR?
- Owner gate after merge: publish `open-scaffold@0.20.2` through trusted publishing with npm dist-tag `latest`?
- Owner gate after publish: create or update GitHub Release `v0.20.2` and mark it Latest?
- Deferred: should the actual A/B pilot be run after the package surface is public, and if so which task sample should be pre-registered?
- Deferred: should historical `1.0.x` npm versions be deprecated with a cadence-correction message, or left as published history?
