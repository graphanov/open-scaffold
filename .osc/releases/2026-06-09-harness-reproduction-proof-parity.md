# Harness reproduction proof parity evidence — 2026-06-09

Plan: `.osc/plans/active/157-reproduction-proof-parity.md`
Branch: `feat/harness-reproduction-proof-parity`
PR: pending

## Summary

Open Scaffold now has its own reproduction aggregate/report path for plan 157. The run evidence partially reproduced the source-prototype signal: targeted compact handoff completed cleanly with tied quality and lower wall-clock duration, but representative live did not reproduce the signal. Token receipts were unavailable, representative live had dirty/blocked lanes, and ablations did not isolate a harness-only effect.

## Traceability

- Roadmap: `docs/JOHN_LOMEIN_MIGRATION_ROADMAP.md`
- Repro docs: `docs/HARNESS_REPRODUCIBILITY.md`
- Proof boundary docs: `docs/PROOF_HARNESS.md`
- Plan: `.osc/plans/active/157-reproduction-proof-parity.md`
- Branch: `feat/harness-reproduction-proof-parity`
- Local generated evidence root: `.osc/bench/` (gitignored local run evidence, not raw logs)
- Local generated runtime receipts/logs: `.osc/runs/` (gitignored runtime evidence)

## Outcome

- Reproduction verdict: `partially_reproduced`
- Broad dominance verdict: `mixed_not_proven`
- Full live suite: not run; it remains owner-gated because cost/runtime is significant.

## Source-prototype provenance

Source-prototype aggregates were read as provenance only. They are not Open Scaffold proof.

- Full live all-ablations source run: 10 paired fixtures, 50 ablations, quality 3 wins / 1 loss / 6 ties, token wins 10/10, duration wins 10/10, proof gate `not_proven` because quality regression and ablation confounds remained.
- Full live repeat source run: 10 paired fixtures, 0 ablations, quality 4 wins / 2 losses / 4 ties, token wins 10/10, duration wins 8/10, proof gate `not_proven` because ablations were missing and regressions remained.
- Source handoff lab: 15 deterministic method candidates; best candidates passed, but this was candidate-only evidence.
- Source targeted live handoff: 1 paired fixture, 5 ablations, quality tied with lower source-prototype token/duration use, proof gate `not_proven` because fixture count and ablation confounds remained.

## Open Scaffold reproduction stages run

### A. Simulated smoke

Evidence path: `.osc/bench/20260609-repro-simulated-smoke/aggregate.json`
Report path: `.osc/bench/20260609-repro-simulated-smoke/REPORT.md`

Result:

- Mode: `simulated`
- Fixtures: 3
- Lane runs: 6
- Ablation fixtures: 3
- Ablation runs: 15
- Reproduction verdict: `not_reproduced`
- Proof gate: `not_proven`
- Broad dominance: `mixed_not_proven`
- Main blockers: not live, insufficient fixture count, ablation confounds intentionally uncleared.

### B. Handoff lab

Evidence path: `.osc/bench/20260609-repro-handoff-lab-15/aggregate.json`
Report path: `.osc/bench/20260609-repro-handoff-lab-15/REPORT.md`

Result:

- Methods tested: 15
- Best method: `risk-first`
- Best score: 6/6
- Best length: 773 characters
- Narrow claim: candidate-only; not broad proof.

### C. Targeted live handoff

Evidence path: `.osc/bench/20260609-repro-targeted-live-handoff-low/aggregate.json`
Report path: `.osc/bench/20260609-repro-targeted-live-handoff-low/REPORT.md`

Result:

- Mode: `live`
- Fixture: `token-efficient-handoff-resume`
- Lane runs: 2
- Ablation runs: 5
- Clean completion: yes for all targeted lanes
- Quality: control 7, harness 7, delta 0
- Duration: control 12,842 ms, harness 8,993 ms, delta -3,849 ms
- Tokens: unavailable from Open Scaffold adapter receipts; prompt/output bytes are proxy-only and not token proof
- Reproduction verdict: `partially_reproduced`
- Proof gate: `not_proven`
- Broad dominance: `mixed_not_proven`
- Main blockers: insufficient fixture count, unavailable token receipts, and ablation confounds.

### D. Representative live

Evidence path: `.osc/bench/20260609-repro-representative-live-low/aggregate.json`
Report path: `.osc/bench/20260609-repro-representative-live-low/REPORT.md`

Result:

- Mode: `live`
- Fixtures: `token-efficient-handoff-resume`, `debugging-protocol-improvement`, `blocker-handling-missing-context`
- Lane runs: 6
- Ablation runs: 15
- Clean completion: no; 7 live/ablation lanes were blocked/dirty by `runtime_blocked` or `runtime_marker_blocked`
- Quality aggregate: control 17, harness 16
- Duration aggregate: control 26,133 ms, harness 27,666 ms
- Tokens: unavailable from Open Scaffold adapter receipts; prompt/output bytes are proxy-only and not token proof
- Reproduction verdict: `not_reproduced`
- Proof gate: `not_proven`
- Broad dominance: `mixed_not_proven`
- Main blockers: insufficient fixture count, token receipts unavailable, quality/duration regressions, dirty/blocked live lanes, and ablation confounds.

## Reproduction verdict

Open Scaffold partially reproduced the source-prototype signal.

What reproduced:

- The targeted compact handoff lane completed cleanly.
- Targeted quality tied at 7/7.
- The targeted compact handoff lane had lower harness wall-clock duration in this rerun.

What did not reproduce cleanly:

- Runtime token receipts were not available from the Open Scaffold adapter, so the source token-efficiency signal was not proven.
- Representative live did not reproduce the source signal: aggregate quality and duration regressed.
- Representative live included dirty/blocked lanes.
- Ablations did not isolate a harness-specific causal effect.
- Fixture count stayed below the broad proof gate.

## Broad dominance verdict

Broad dominance remains `mixed_not_proven`.

No broad Open Scaffold > naked Codex claim is allowed from this evidence.

## Benchmark feedback / repair hypotheses

Failed or partial reproduction wrote benchmark feedback under local run paths. The repair hypothesis is:

> Repair live lane, token capture, ablation, and fixture-count blockers before stronger claims.

## Remaining owner gates

- Decide whether to run a full live suite. This is not run here because full live is cost/runtime significant and owner-gated.
- Decide whether token capture should be added to the adapter before rerunning a proof suite.
- Decide whether dirty representative lanes should be repaired first or treated as evidence for the next slice.
- Merge remains owner-gated.
- npm publish and GitHub Release creation are not authorized by this evidence.

## Verification

Final verification commands are recorded in the PR body and session final report after the full local gate run.
