# Release / Evidence Note: 115-downstream-example-proof

## Summary

Added a downstream proof page documenting [`graphanov/tally`](https://github.com/graphanov/tally), a small standalone CLI built outside this repository where one real feature was planned, executed, verified, and closed as an Open Scaffold work record. README links the proof from the Dogfooded section. Documentation only; no Open Scaffold product code changed.

## Traceability

- Roadmap / issue / task: `.osc/plans/active/115-downstream-example-proof.md` (this slice); strategy direction from `references/adoption-wedge-strategy-swarm-2026-05-27.md` ("one external/downstream example before broad launch").
- Plan: `.osc/plans/done/115-downstream-example-proof.md` after closeout; `.osc/plans/active/115-downstream-example-proof.md` during implementation.
- Run ID / run packet: N/A — documentation slice.
- Branch / PR: branch `docs/downstream-proof-tally`; PR pending.

## Verification

- `git diff --check` — PASS.
- `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- `npm test` — PASS (no product code changed; suite stays green).
- Private-marker scan over the new docs page — PASS: no private operating-workshop, assistant-internal, private-workspace, or raw-agent-log markers.
- All links in `docs/examples/downstream-proof.md` verified against the live public `graphanov/tally` repository, including `MISSION.md`, `.osc/plans/done/streak-and-json.md`, `src/streak.ts`, `tests/streak.test.ts`, the evidence note, and PR #1.
- Downstream reproduction verified in the tally repo: `npm test` (2 files / 15 tests), `./verify.sh --standard` (6 pass / 0 fail / 0 warn), and `osc trace streak-and-json` reconstructs the slice.

## Outcome

Shipped: `docs/examples/downstream-proof.md` plus a README proof link. The example is honestly labeled owner-created, demonstrates reconstructability rather than certification, and uses CLI/package names matching npm latest (`open-scaffold@0.20.4`). Pending owner PR review and merge.

## Follow-up

- Owner gate: review and merge the PR for `docs/downstream-proof-tally`.
- Optional later: a collaborator- or third-party-built example would strengthen the proof beyond owner-created dogfood.
