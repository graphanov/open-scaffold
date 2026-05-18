# Release / Evidence Note: 047-roadmap-open-question-reconciliation

## Summary

Reconciles historical Open Scaffold plan `## Open questions` after the visible implementation backlog was exhausted. The slice records the current answer layer in a decision note, keeps broad runtime/orchestration hypotheses parked, and creates one compact concrete follow-up backlog plan for CLI lifecycle parity.

## Traceability

- Roadmap / issue / task: Kanban `t_c9f97b1a`.
- Plan: `.osc/plans/done/047-roadmap-open-question-reconciliation.md`.
- Run ID / run packet: `N/A` — roadmap stewardship / documentation reconciliation, no runtime run packet needed.
- Branch / PR: `roadmap/open-question-reconciliation`; PR pending at evidence-note creation.

## Verification

- Source inventory cutoff: `main@a8640ce84b874f7b94c5e58599c3a7c3e75fed1b` after PR #52.
- Inputs inspected: active/backlog/blocked/done plans, `.osc/releases`, `ROADMAP.md`, `docs/wiki/concepts/*`, GitHub PR/branch state, and Hermes Kanban state.
- Historical open questions counted: 88 bullets across current backlog and done parent plans at cutoff, excluding this reconciliation plan and new follow-up plan.
- `docs/decisions/2026-05-18-open-question-reconciliation.md` records bucket counts, high-signal answered questions, current backlog classification, product-direction gates, and recommended next slice.
- `.osc/plans/backlog/048-cli-lifecycle-parity.md` created as the single concrete follow-up backlog plan.
- `docs/decisions/README.md` updated to link the reconciliation note and explain why old plan questions are answered in new notes instead of edited in place.
- Final verification bundle: `unset TMPDIR; npm run build && npm test && ./verify.sh --strict && npm run osc -- verify && git diff --check` → pass.
- `npm test` → 20 files / 179 tests passed.
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn; 58 plan files.
- `npm run osc -- verify` → pass; 58 plan file(s), 0 warning(s).

## Outcome

Open Scaffold's backlog is intentionally small again rather than empty. `030-agent-runtime-selection-vision` and `031-agentic-orchestration-model-lab-vision` remain broad hypotheses, not immediate execution plans. `048-cli-lifecycle-parity` is the recommended next implementation slice after this reconciliation.

Out of scope: product feature implementation, roadmap/mission claim changes, runtime/model-lab/compliance expansion, editing done plans, closing or deleting `030` / `031`, merge, and publish.

## Follow-up

- Recommended next slice after merge: `.osc/plans/backlog/048-cli-lifecycle-parity.md` on branch `cli/lifecycle-parity`.
- Owner approval remains required before changing roadmap/mission product direction or superseding broad hypothesis plans.