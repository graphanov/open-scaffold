# Release / Evidence Note: 082-evidence-new-plan-validation

## Summary

This pinpoint dogfood slice tightens the evidence flow by making `osc evidence new <slug>` refuse slugs that do not have a matching plan. Before the fix, `evidence new` could create an orphan release/evidence note and only `evidence collect` caught the missing plan later.

## Traceability

- Roadmap / issue / task: Pinpoint dogfood surface `evidence flow`; no GitHub issue; not mirrored to a task board.
- Plan: `.osc/plans/done/082-evidence-new-plan-validation.md`.
- Run ID / run packet: N/A — direct pinpoint scout execution advanced by John-Lo-Mein autopilot.
- Branch / PR: branch `fix/evidence-new-plan-validation`; PR pending.
- Automation provenance: Opened/advanced by John-Lo-Mein autopilot; cron job `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`; script `open-scaffold-prrunner-webhook-runner.py`; source `cron-open-scaffold-pr-runner`.
- Owner gates: merge, npm publish, GitHub Release.

## Verification

- Pre-fix reproduction in a temporary min-tier scaffold — confirmed `osc evidence new typo-noplan` created `.osc/releases/2026-05-20-typo-noplan.md`, then `osc evidence collect typo-noplan --dry-run` failed with `Plan not found`.
- Post-fix reproduction in a temporary min-tier scaffold — pass; `osc evidence new typo-noplan` exits 1 with `Plan not found: typo-noplan.md in .osc/plans/{active,backlog,blocked,done}. Create or move the plan before creating evidence.` and no evidence note is written.
- `npm test -- tests/scaffold.test.ts tests/cli-plan-evidence.test.ts tests/evidence.test.ts --run` — pass; 3 files / 17 tests.
- `git diff --check` — pass.
- `npm test -- --run` — pass; 27 files / 235 tests.
- `npm run build` — pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `node dist/cli.js evidence collect 082-evidence-new-plan-validation --dry-run` — pass; the collector finds the matching done plan and previews a collected evidence block without writing.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.

## Outcome

`createEvidenceNoteSkeleton` now validates that the slug exists as a plan in `.osc/plans/{active,backlog,blocked,done}` before writing into `.osc/releases/`. Evidence creation now fails at the first unsafe step instead of creating orphan notes that break the next command in the same flow.

## Follow-up

- Open the focused PR, patch this note with the PR URL, and run the latest-head Codex review loop.
- Merge and npm/GitHub Release publication remain owner-gated.
