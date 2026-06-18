# Release / Evidence Note: v1-public-positioning-polish

## Summary

Polished Open Scaffold's public product identity so first-touch surfaces consistently describe it as a repo-native work record for AI-assisted work: ambient capture, handoff/resume, review/gate, and evidence boundaries. Removed or labeled older harness/control-room/runtime language from the release path, clarified the current `v0.32.x` pre-1.0 package truth versus historical `v1.0.x` artifacts, and added tests that guard the public positioning and retired-command boundaries.

This note records local release-readiness evidence only. It does not claim merge, npm publication, GitHub Release movement, website deployment, or launch approval.

## Traceability

- Roadmap / issue / task: owner-scoped public v1 positioning polish request in this session.
- Plan: `.osc/plans/done/v1-public-positioning-polish.md` after close.
- Run ID / run packet: `N/A` — documentation/code polish executed directly on branch, no external runtime package was dispatched.
- Branch / PR: `docs/v1-public-positioning-polish`, https://github.com/graphanov/open-scaffold/pull/225; merge remains pending owner decision.

## Verification

- `npm run -s osc -- plan validate .osc/plans/done/v1-public-positioning-polish.md --strict` — `0 issues found`.
- Targeted public/readiness tests: `npm test -- tests/public-positioning.test.ts tests/reduced-cli-docs.test.ts tests/first-run-docs.test.ts tests/cli-lifecycle-help.test.ts tests/package-payload.test.ts tests/section-parser.test.ts` — passed: `6 passed`, `57 tests passed`.
- `npm run build` — passed (`build:core` and `build:runtime-omx`).
- `npm test -- --run` — passed: `48 passed`, `544 tests passed`.
- `./verify.sh --strict` — passed: `10 pass, 0 fail, 0 warn`.
- `git diff --check` — passed with no output.
- `npm run -s osc -- --help` and `npm run -s osc -- help --all` — rendered successfully.
- Retired-command smoke loop for `work dispatch adapter metrics dashboard task study ab harness` — each exited `2` and included `removed/repositioned` plus `docs/STABILITY.md#command-maturity`.
- Added-line public-safety scan over the diff — passed for local paths, personal names/emails/phone, and known Discord IDs.
- `npm run -s osc -- doctor --check secret-scan` — `PASS secret-scan: no obvious token/webhook strings found.`
- `npm pack --dry-run --json` — passed after prepack build; package payload contained `224` files, dry-run package size `387002` bytes.

## Outcome

The branch now has a coherent public v1-candidate product story across README, mission, start docs, agent entrypoints, docs landing page, examples, stability/version truth, trust boundaries, workflow docs, and CLI help. The public offer is one thing: repo-native records, handoff/resume, review/gate, and evidence for AI-assisted work that must survive sessions, PRs, clients, audits, or repeated attempts.

Out of scope remains unchanged: Open Scaffold still does not run agents, host orchestration, certify compliance, prove production readiness, publish npm, move GitHub Release Latest, merge, deploy, or launch publicly without owner approval.

## Follow-up

- Owner gate: decide whether to commit/push/open a PR from `docs/v1-public-positioning-polish`.
- Owner gate: decide any later package/version/release train. Current live surfaces remain `open-scaffold@0.32.1` on npm and GitHub Latest `v0.32.1` until explicitly changed.
