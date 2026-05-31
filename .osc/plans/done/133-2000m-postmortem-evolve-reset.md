# Plan: 133-2000m-postmortem-evolve-reset

## Status

done

## Context

A local 2000m v1 two-lane run compared Codex/GPT-5.5 with and without Open Scaffold artifacts. Both lanes reached the same raw mechanical score, then plateaued. The result is useful because it falsifies a narrow score-amplifier claim and exposes the next product work: better evidence, better stop decisions, and a benchmark that tests recovery and handoff.

## Goal

Create a public-safe postmortem and backlog handoff package that records the negative benchmark result honestly and turns it into concrete next Open Scaffold and 2000m work without starting major `osc evolve` implementation.

## Constraints / Out of scope

- Do not claim Open Scaffold improved the raw 2000m v1 score.
- Do not claim adoption proof, product-market proof, or model-ranking proof.
- Do not copy raw logs, JSONL, screenshots, source packs, local absolute paths, or private operator discussion into public docs.
- Do not mutate, resume, or rerun the stopped benchmark.
- Do not implement major `osc evolve`, `osc eval`, benchmark v2, or scorer-adapter code in this slice.
- Stop before push, PR, merge, npm publish, GitHub Release, or public announcement.

## Files to touch

- `docs/benchmarks/README.md` — add a small public-safe index for benchmark learning notes.
- `docs/benchmarks/2000m-v1-two-lane-postmortem.md` — record the negative result, claim boundaries, routing table, and next order.
- `docs/benchmarks/2000m-v2-workflow-benchmark-proposal.md` — hand off benchmark v2 requirements to the benchmark repo without editing that repo here.
- `docs/decisions/2026-05-31-osc-evolve-v2-after-2000m.md` — record the v2 `osc evolve` direction exposed by the run.
- `docs/decisions/README.md` — index the new decision.
- `.osc/plans/backlog/134-osc-evolve-analyze-plateau-and-impossible-ac.md` — implementation plan for plateau/impossible-AC analysis and useful compare output.
- `.osc/plans/backlog/135-osc-eval-external-scorer-adapter.md` — implementation plan for external scorer to evaluation-envelope import.
- `.osc/plans/backlog/136-compact-evidence-mode.md` — implementation plan for compact evidence mode.

## Implementation Architecture Coverage

- Strengthens: evaluation honesty, audit trails, stop-condition recovery, and public claim boundaries.
- Audit envelope: this plan, the benchmark postmortem, the v2 proposal, the decision note, and the three backlog plans.
- Evaluation envelope: markdown review plus repository verification and public-safety scans over changed public files.
- Feedback routing: implementation work stays in backlog plans; benchmark v2 mechanics are handed to the benchmark repo; private raw evidence stays out of public docs.
- Boundary: no runtime execution, no benchmark rerun, no scorer mutation, no model ranking, no adoption claim, and no publish/release authority.

## Acceptance criteria

- [x] Public docs state that both lanes tied at `27/28`, composite `94.4892857143`, with AC28 as the only failing criterion.
- [x] Public docs state that the run falsified the narrow raw-score-amplifier claim and did not prove adoption or causality.
- [x] Public docs separate proven, plausible, unproven, and next-to-test conclusions.
- [x] The package routes findings into Open Scaffold artifacts, benchmark-repo follow-up, private-only material, and future code slices.
- [x] Backlog plans exist for `osc evolve` plateau/impossible-AC analysis, `osc eval` external-scorer adapter work, and compact evidence mode.
- [x] The benchmark-v2 proposal tests workflow/recovery/handoff rather than only protocol compliance.
- [x] Public-safety scan finds no local paths, private names, Discord/thread IDs, raw-log imports, raw-score win claim, or adoption-proof claim.

## Verification steps

1. Run `git diff --check` and expect no whitespace errors.
2. Run `npm test` and expect the suite to pass.
3. Run `npm run build` and expect TypeScript/package build success.
4. Run `./verify.sh --strict` and expect repository compliance to pass or document any worktree-specific warning.
5. Run public-safety scans over changed files for local paths, private names, private channel/thread identifiers, raw-score win claims, and adoption-proof claims.

## Open questions

- Should the benchmark v2 proposal be promoted into `graphanov/2000m` as a separate branch/PR after this planning slice is reviewed?
- Should the first implementation slice be `osc evolve analyze` before any controller/spawning work? This plan assumes yes.
