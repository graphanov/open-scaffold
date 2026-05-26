# Release / Evidence Note: 103-osc-dispatch-adapter-glue

## Summary

Added explicit `osc dispatch <run.json> --adapter <id>` glue for existing Open Scaffold run packets. The command invokes a reviewed project-local adapter config, captures adapter stdout/stderr logs plus explicitly reported receipt/evidence paths under the run directory, preserves multiple evidence artifacts, avoids stale artifact inference, and keeps runtime launch policy outside Open Scaffold core. PR validation workflows also use public unauthenticated Git fetches so required checks can run without repository-token checkout credentials.

## Traceability

- Roadmap / issue / task: Milestone 19 — Post-v1 adoption workflow target.
- Plan: `.osc/plans/done/103-osc-dispatch-adapter-glue.md`.
- Run ID / run packet: local scratch `osc run` -> `osc dispatch` smoke used temporary `.osc/runs/<run_id>/run.json` artifacts that were removed after verification.
- Branch / PR: branch `runtime/osc-dispatch-adapter-glue`; Pull Request pending owner review.

## Verification

- `npm test -- tests/cli-dispatch.test.ts` — PASS, 9 dispatch tests.
- Scratch `osc run .osc/plans/active/123-health-endpoint.md --runtime codex --repo <tmp>` followed by `osc dispatch <run.json> --adapter fake-smoke` — PASS, wrote dispatch receipt, adapter evidence, stdout log, and stderr log under `.osc/runs/<run_id>/`.
- `npm test -- tests/github-actions-workflows.test.ts tests/cli-dispatch.test.ts packages/runtime-omx/tests/no-spawn-boundary.test.ts` — PASS, 14 focused tests.
- `npm test` — PASS, 42 files / 372 tests.
- `npm run build` — PASS, core and runtime-omx TypeScript builds.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- Manual unauthenticated public Git fetch smoke for `refs/pull/125/merge` and `origin/main` — PASS, checked out the PR merge ref without using stored GitHub credentials.
- `git diff --check` — PASS.
- Independent pre-commit review — PASS after symlink/output-path, adapter-executable denylist, stale-output, multi-evidence, and workflow-checkout hardening; no blocking security or logic issues remained.

## Outcome

The repo now has an explicit dispatch bridge between generated run packets and local adapter packages without turning core into a hidden provider runtime. Missing, unknown, unsafe, URL-based, shell-wrapper, platform-shim, network-fetching, auto-installing, unsafe-output, and symlinked-run-directory adapter cases are refused by default. Commit, push, PR, merge, publish, credential, and provider-runtime authority remain out of scope and human-gated. Required PR validation jobs also avoid authenticated checkout so public CI can still validate the merge ref when repository-token Git fetches are unavailable.

## Follow-up

- Next product slice: `104-osc-work-dry-run-target` for the first natural-language composition layer.
- Package/public-surface sync remains a separate owner-gated follow-through after this PR merges because the root CLI surface changes.
