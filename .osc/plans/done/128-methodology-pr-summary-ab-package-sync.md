# Plan: 128-methodology-pr-summary-ab-package-sync

## Status

done

## Context

PR #145 reached `main` with the package-visible `osc study` methodology evidence command. PR #146 reached `main` with the package-visible `osc pr-summary <plan-slug>` reviewer mirror and `osc ab check <path>` A/B pilot packet validator.

Local `main` reached the package-sync merge commit `542db9bddb6ee4c51f3e6ab20d119ae2da306a5b`. Trusted publishing then published `open-scaffold@0.20.2` with npm dist-tag `latest`, fresh isolated-cache `npx open-scaffold@latest --help` exposes `osc study`, `osc pr-summary`, and `osc ab check`, and GitHub Release `v0.20.2` is marked Latest.

## Goal

Publish the PR #145 and PR #146 package-visible commands through the public install path as `open-scaffold@0.20.2`, verify npm/latest plus fresh `npx`, create GitHub Release `v0.20.2`, and close the package-sync work record.

## Constraints / Out of scope

- Do not change `osc study`, `osc pr-summary`, or `osc ab check` behavior beyond package/public-surface metadata unless verification exposes a blocker.
- Do not run the actual A/B experiment or claim any outcome improvement.
- Do not deprecate historical `1.0.x` npm versions in this release-sync.

## Files to touch

- `package.json` — set the package to `0.20.2`.
- `package-lock.json` — keep the lockfile root version aligned with `package.json`.
- `docs/CHANGELOG.md` — record the published `v0.20.2` methodology evidence, PR-summary, and A/B pilot package surface.
- `.osc/releases/2026-05-29-128-methodology-pr-summary-ab-package-sync.md` — record final package/release proof.
- `.osc/plans/done/128-methodology-pr-summary-ab-package-sync.md` — this closed release-sync plan.

## Implementation Architecture Coverage

- Strengthens: adoption trust, package/public-surface truth, methodology evidence visibility, PR review ergonomics, and honest A/B pilot instrumentation.
- Audit envelope: source plans `125`, `126`, and `127`; source PRs #145 and #146; release-sync plan `128`; npm registry checks; fresh `npx` drift baseline; trusted publishing workflow; GitHub Release proof.
- Evaluation envelope: trunk verification proves the package builds, tests, packs, and dry-runs publication; public checks prove npm/latest, fresh `npx`, and GitHub Latest.
- Feedback routing: any actual A/B protocol run, public methodology claim, dist-tag correction, historical-version deprecation, or release-line decision remains a separate owner gate.
- Boundary: this release-sync publishes the package surface only; it does not run the A/B pilot or claim outcome improvement.

## Acceptance criteria

- [x] `package.json` and `package-lock.json` both declare `0.20.2`.
- [x] The candidate documents that `0.20.2` publishes PR #145 `osc study` and PR #146 `osc pr-summary` / `osc ab check`.
- [x] `docs/CHANGELOG.md` includes the published `v0.20.2` package-sync entry.
- [x] Candidate package gates pass: `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm pack --dry-run --json`, `npm publish --dry-run --tag latest`, and `git diff --check`.
- [x] Local built CLI help exposes `osc study [--json] [--since <date>] [--out <path>]`, `osc pr-summary <plan-slug> [--format <markdown|json>]`, and `osc ab check <path>` before PR publication.
- [x] The release-sync PR landed with owner approval before npm publish, GitHub Release creation/update, and optional npm deprecation of historical `1.0.x` versions.
- [x] After owner-approved merge, trusted publishing published `open-scaffold@0.20.2` with npm dist-tag `latest`.
- [x] Fresh isolated-cache `npx open-scaffold@latest --help` exposes `osc study`, `osc pr-summary`, and `osc ab check`.
- [x] GitHub Release `v0.20.2` exists and is marked Latest.

## Verification steps

1. `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — expect `0.20.2 / 0.20.2 / 0.20.2`.
2. `npm view open-scaffold version dist-tags versions --json --prefer-online` — confirm live npm before publish is still `0.20.1` and `0.20.2` is not already published.
3. `npm run build` then `node dist/cli.js --help` — help includes the three package-visible commands from PR #145/#146.
4. `./verify.sh --strict` — all scaffold checks pass.
5. `npm test -- --run` — full test suite passes.
6. `npm pack --dry-run --json` — package candidate is packable as `open-scaffold@0.20.2` and includes the relevant `dist/*` outputs and docs/examples.
7. `npm publish --dry-run --tag latest` — candidate publish dry-run succeeds; trusted publishing workflow publishes the real package after owner approval.
8. `git diff --check` — whitespace check passes.

## Open questions

- Resolved: owner approved merge plus publish/release follow-through for PR #147.
- Resolved: npm `open-scaffold@latest` is `0.20.2`.
- Resolved: GitHub Release `v0.20.2` is Latest.
- Deferred: should the actual A/B pilot be run after the package surface is public, and if so which task sample should be pre-registered?
- Deferred: should historical `1.0.x` npm versions be deprecated with a cadence-correction message, or left as published history?
