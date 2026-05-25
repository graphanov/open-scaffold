# Release / Evidence Note: 074-v1-launch-docs-polish

## Summary

Polished launch-facing documentation for the v1.0.0 release candidate. The README now exposes a working Quickstart anchor before release-candidate detail, key docs point to the Minimum Viable Scaffold guide, release-state wording reflects that the repo candidate is merged while npm/GitHub Release publication remains external, and FAQ/runtime pages avoid launch-risky overclaims.

## Traceability

- Roadmap / issue / task: Milestone 18 v1.0.0 stability launch docs polish.
- Plan: `.osc/plans/done/074-v1-launch-docs-polish.md`
- Run ID / run packet: N/A — docs-only branch, no runtime handoff package.
- Branch / PR: `docs/v1-launch-polish`; PR URL is recorded in GitHub once the branch is pushed.

## Verification

- `git diff --check` — passed.
- `npm test -- --run` — passed, 356 tests.
- `npm run build` — passed.
- Targeted launch-doc hygiene checks — passed: stale merge-gate wording, stale `v0.4.19`, risky FAQ claims, and broken Quickstart anchor were absent or fixed.
- `npm pack --dry-run --json` — passed, `open-scaffold@1.0.0`, 145 files, `open-scaffold-1.0.0.tgz`.
- `./verify.sh --standard` — passed after plan closure: 6 pass, 0 fail, 0 warn.
- `./verify.sh --strict` — passed after plan closure: 10 pass, 0 fail, 0 warn.
- `npm run osc -- verify` — passed after plan closure with 5 pre-existing warnings from older artifacts, no new failure.

## Outcome

The docs now present Open Scaffold as a clear repo-native work record for AI-assisted software while keeping advanced runtime/native-spawn material outside the v1 stable promise. No product behavior, package code, workflow behavior, npm publication, GitHub Release mutation, deployment, or launch announcement happened in this slice.

## Follow-up

Owner gates remain: review/merge this docs PR, publish `open-scaffold@1.0.0` to npm if approved, create or mark GitHub Release `v1.0.0` as Latest if approved, then decide whether to launch publicly.
