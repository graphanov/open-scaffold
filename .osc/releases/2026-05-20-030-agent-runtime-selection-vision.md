# Release / Evidence Note: 030-agent-runtime-selection-vision

## Summary

This validation slice closes the old runtime-selection vision backlog item without adding runtime implementation. The resolved v1 stance is: no `osc init --runtime` picker; runtime choice stays in the run-packet/profile/adapter layer until adapter-package evidence justifies anything stronger.

## Traceability

- Roadmap / issue / task: backlog plan selected by the deterministic slice selector; no GitHub issue existed.
- Plan: `.osc/plans/done/030-agent-runtime-selection-vision.md`.
- Run ID / run packet: N/A for this PR; existing local forensic evidence lives under `.osc/runs/20260515T125857-v1-runtime-choice-sparring/` and remains ignored/private.
- Branch / PR: branch `vision/030-agent-runtime-selection`; PR https://github.com/graphanov/open-scaffold/pull/78.
- Automation provenance: opened/advanced by John Lomein autopilot; cron job `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`; script `open-scaffold-prrunner-webhook-runner.py`; source `cron-open-scaffold-pr-runner`; selected source `backlog_plan`.
- Owner gates: merge, npm publish, and GitHub Release creation/latest movement remain owner-gated.

## Verification

- Research evidence inventory: three runtime-choice sparring lane reports end with `REPORT_COMPLETE`; the Hermes synthesis records the unified verdict.
- `git diff --check` → pass.
- `./verify.sh --strict` → pass; 10 pass / 0 fail / 0 warn.
- `npm test -- --run` → pass; 29 files / 253 tests.
- `npm run build` → pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- Public wording check: changed docs avoid private owner context, runtime certification claims, installer claims, provider credentials, and core spawning claims.

## Outcome

The runtime-selection vision slice is closed as a validation/reconciliation decision, not as new runtime implementation.

Decision:

- Open Scaffold v1 should not add an `osc init --runtime` picker or imply runtime certification.
- Runtime choice is already the safe v1-compatible extension point at the run-packet/profile/adapter layer: `--runtime`, `--workflow`, runtime profiles, `run.json`, dispatch receipts, and evidence return.
- Explicit agentic runtime packages such as `packages/runtime-omx/` may consume packages and launch only behind their own opt-in gates; Open Scaffold core remains non-spawning.
- Native runtime ownership remains long-term research, gated by proofability, auditability, or governed-execution evidence rather than convenience spawning.

No package publication, GitHub Release latest movement, deployment, runtime launch, or secret/credential change was performed.

Changed files:

- `.osc/plans/done/030-agent-runtime-selection-vision.md` — closed the validation plan and recorded resolved/future-gated questions.
- `.osc/releases/2026-05-20-030-agent-runtime-selection-vision.md` — this evidence note.
- `docs/wiki/concepts/agent-runtime-selection.md` — updated the concept from open v1 question to resolved v1 stance.
- `docs/wiki/index.md` — updated the concept summary.
- `docs/wiki/summaries/runtime-orchestration-sparring-synthesis.md` — updated the source path after closing the plan.
- `docs/wiki/log.md` — appended the reconciliation entry and removed the stale backlog plan path from the old capture entry.
- `MISSION.md` — changelog stamp from `osc close`.

## Follow-up

Future work should start from concrete adapter/package evidence, such as runtime profile checks, adapter conformance, or `packages/runtime-*` proof slices. Do not reopen init-time runtime selection, runtime registry, installer, certification, or native-runtime work without a tracked plan and owner approval.
