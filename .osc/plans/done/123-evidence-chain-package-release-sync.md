# Plan: 123-evidence-chain-package-release-sync

## Status

done

## Context

PR #137 added `osc verify --evidence-chain` to `main`, but the current public package `open-scaffold@latest` does not expose the new verifier help or behavior. While preparing the package sync, the owner also decided the project should return to a pre-1.0 cadence because the current product surface is still under active credibility, runtime-boundary, and adoption hardening.

## Goal

Prepare a package/public-surface release candidate that publishes the evidence-chain verifier through the public install path as `open-scaffold@0.20.0`, while documenting the version-cadence correction from the historical `1.0.x` line back to pre-1.0 hardening.

## Constraints / Out of scope

- Do not publish to npm in this PR.
- Do not create or update a GitHub Release in this PR.
- Do not deprecate the historical `1.0.x` npm versions in this PR.
- Do not implement `117-osc-trace-work-record-replay` or any new evidence-chain feature behavior.
- Do not rewrite historical release evidence; preserve `1.0.x` as historical package/release history.

## Files to touch

- `package.json` — set the next package candidate to `0.20.0`.
- `package-lock.json` — keep the lockfile root version aligned with `package.json`.
- `README.md` — replace the current-release framing so the public story no longer pressures a `1.0.x` maturity claim.
- `docs/STABILITY.md` — explain the version-cadence correction and current stable/lab boundary without pretending the previous `1.0.x` tarballs vanished.
- `docs/CHANGELOG.md` — add the `v0.20.0` package-sync candidate entry and preserve `1.0.x` as historical.
- `AGENTS.md` and `CLAUDE.md` — keep paired agent-entry descriptions aligned with the corrected stability/current-cadence wording.
- `.osc/releases/2026-05-28-123-evidence-chain-package-release-sync.md` — record candidate evidence and post-merge/publication gates.
- `.osc/plans/done/123-evidence-chain-package-release-sync.md` — this plan after closeout.

## Implementation Architecture Coverage

- Strengthens: adoption trust, package/public-surface truth, evidence-chain visibility, release cadence clarity.
- Audit envelope: plan `123`, source plan `071`, PR #137, this package-sync PR, npm registry checks, fresh `npx` smoke after owner-approved publish.
- Evaluation envelope: local gates prove the candidate builds/tests/packs/publish-dry-runs; post-merge owner-gated checks must prove npm/latest and GitHub Latest before closeout.
- Feedback routing: any publish, dist-tag, GitHub Release, or old-version deprecation decision remains an owner gate and should be recorded in the release evidence note or a follow-up plan.
- Boundary: no npm publish, GitHub Release, deprecated-package write, runtime execution, registry migration tool, or feature implementation happens in this PR.

## Acceptance criteria

- [x] `package.json` and `package-lock.json` both declare `0.20.0`.
- [x] The candidate documents that `0.20.0` is an intentional pre-1.0 cadence correction, while historical `1.0.x` versions remain published history.
- [x] `docs/CHANGELOG.md` includes a `v0.20.0` candidate entry for `osc verify --evidence-chain`, first-read `osc compare` help grouping, and version-cadence correction.
- [x] `README.md`, `docs/STABILITY.md`, `AGENTS.md`, and `CLAUDE.md` no longer frame the current line as a pressure-heavy `v1.0.x` stable line.
- [x] Candidate package gates pass: `./verify.sh --strict`, `npm test`, `npm run build`, `npm pack --dry-run --json`, `npm publish --dry-run --tag latest`, and `git diff --check`.
- [x] Local built CLI help exposes `osc verify --evidence-chain` and the first-read `osc compare` help grouping before PR publication.
- [x] The PR stops before merge, npm publish, GitHub Release creation/update, and optional npm deprecation of historical `1.0.x` versions.

## Verification steps

1. `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — expect `0.20.0 / 0.20.0 / 0.20.0`.
2. `npm view open-scaffold version dist-tags versions --json` — confirm live npm before publish is still `1.0.5` and `0.20.0` is not already published.
3. `npm run build` then `node dist/cli.js verify --help` — help includes `--evidence-chain` flags.
4. `node dist/cli.js --help` — top-level help includes the first-read `osc compare` section.
5. `./verify.sh --strict` — all scaffold checks pass.
6. `npm test` — full test suite passes.
7. `npm pack --dry-run --json` — package candidate is packable as `open-scaffold@0.20.0`.
8. `npm publish --dry-run` — expected to fail for this cadence correction because npm will not implicitly move `latest` to a lower semver than `1.0.5`.
9. `npm publish --dry-run --tag latest` — publish dry-run succeeds and proves the real trusted-publishing workflow must pass `npm-tag=latest` explicitly.
10. `git diff --check` — whitespace check passes.

## Open questions

- Owner gate after PR merge: resolved — `open-scaffold@0.20.0` was published via trusted publishing and GitHub Release `v0.20.0` was marked Latest.
- Owner gate after public sync: still deferred — optionally deprecate the historical `1.0.x` npm versions with a gentle cadence-correction message, or leave them alone as normal history.
