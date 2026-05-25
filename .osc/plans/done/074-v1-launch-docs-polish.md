# Plan: v1-launch-docs-polish

## Status

done

## Context

The v1.0.0 release-candidate branch has merged into `main`, but the launch-facing docs still contain small bits of pre-merge wording, stale publishing guidance, a broken README quickstart anchor, and a few overclaim/meme FAQ lines that weaken the first serious public read.

This slice is the final docs-only launch polish before the owner decides whether to publish `open-scaffold@1.0.0` and mark the GitHub Release latest.

## Goal

Make the README and key public docs accurately describe the current release truth: repo `main` is a v1.0.0 candidate, npm/GitHub Latest still show the previous public release until publication, runtime/native-spawn material is clearly experimental or historical, and first-time readers get a sharper adoption path.

## Constraints / Out of scope

- Do not change product behavior, package code, schemas, workflow YAML behavior, or runtime implementation.
- Do not publish to npm, create or move GitHub Releases, deploy a website, or announce launch.
- Do not broaden the v1 stable contract.
- Do not rewrite historical research into current product promises.
- Keep public wording owner-neutral; do not mention private operator names.

## Files to touch

- `README.md` — sharpen first-read flow, add the missing quickstart anchor, promote minimum viable scaffold guidance, and update release-state wording.
- `docs/STABILITY.md` — remove stale merge gate language and state the remaining external publication gates.
- `docs/CHANGELOG.md` — align v1 candidate wording with the already-merged repository state.
- `ROADMAP.md` — align Milestone 18 release status with the merged repo candidate.
- `docs/CI.md` — document both trusted publishing and legacy token/tag publishing accurately.
- `docs/GITHUB_WORKFLOW.md` — align CI/publishing bullet with current workflow reality.
- `docs/examples/README.md` — fix the broken README quickstart anchor.
- `docs/FAQ.md` — tighten launch-risky tone and unsupported claims without removing personality.
- `docs/RUNTIME_HARNESS_DISPATCH.md` and `docs/RUNTIME_STRATEGY_RESEARCH_SYNTHESIS.md` — label historical/research scope clearly where needed.
- `docs/index.html` — align the landing-page owner gate footer.
- `AGENTS.md` and `CLAUDE.md` — keep paired first-read product wording aligned with launch docs if changed.
- `.osc/releases/2026-05-25-074-v1-launch-docs-polish.md` — record evidence for this docs slice.

## Acceptance criteria

- [x] README has a working `#quickstart` anchor and explains install/adoption before deep release-candidate detail.
- [x] README key docs point fresh users to `docs/MINIMUM_VIABLE_SCAFFOLD.md`.
- [x] Release-state wording says merge is done and remaining gates are npm publication, GitHub Release latest movement, and launch/deploy choices.
- [x] CI/publishing docs describe trusted publishing as the preferred v1 path and legacy token/tag publishing as an alternative.
- [x] Runtime strategy/research pages are clearly framed as historical/research or private-deployment examples, not v1 promises.
- [x] FAQ removes unsupported/meme launch-path claims such as "over 9000" and "zero re-explanation cost forever".
- [x] No product behavior, package code, workflow behavior, npm publication, GitHub Release mutation, or deploy occurs.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `./verify.sh --standard` — scaffold methodology passes for this docs slice.
3. `npm run osc -- verify` — CLI verification path passes.
4. `npm test -- --run` — docs-linked tests and package tests pass.
5. `npm run build` — TypeScript/package build passes.
6. Targeted grep checks — stale launch blockers and risky FAQ lines are absent from launch-facing docs.
7. `npm pack --dry-run --json` — package payload remains valid after docs changes.

## Open questions

None for this docs-only polish. Merge, npm publication, GitHub Release latest movement, deployment, and launch announcement remain owner gates after the PR is reviewed.
