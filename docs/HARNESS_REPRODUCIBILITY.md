# Harness reproducibility and benchmark boundary

The harness includes local benchmark/reproduction machinery so Open Scaffold can test whether the workflow helped. It does not turn a smoke test into a broad model or framework claim.

## Backend commands

```bash
osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke
osc bench handoff-lab --out .osc/bench/handoff-lab-15
osc bench suite --mode live \
  --fixture token-efficient-handoff-resume \
  --include-ablations \
  --ablation-fixture token-efficient-handoff-resume \
  --allow-spawn \
  --effort low \
  --out .osc/bench/targeted-live-handoff
```

Live mode only counts as runtime evidence when `--allow-spawn` is present. Without that flag, the suite writes a dry-run receipt and the proof gate stays blocked.

The suite writes:

```text
.osc/bench/<suite-id>/aggregate.json
.osc/bench/<suite-id>/REPORT.md
```

The handoff lab writes:

```text
.osc/bench/<suite-id>/methods/<method>/resume.md
.osc/bench/<suite-id>/methods/<method>/score.json
.osc/bench/<suite-id>/aggregate.json
.osc/bench/<suite-id>/REPORT.md
```

Generated `.osc/bench/...` and `.osc/runs/...` evidence is local run evidence. Keep raw live logs and local runtime residue out of commits; use a short evidence note when a PR needs a durable readout.

## Aggregate fields

`osc.bench-suite-aggregate.v1` records:

- quality, token, duration, and round metrics for control and harness lanes;
- clean completion for every live lane;
- receipt/evidence paths for live lanes;
- ablation fixture count and ablation run count;
- proof-gate reasons;
- benchmark feedback and repair hypothesis when reproduction is failed or partial;
- one reproduction verdict: `reproduced`, `partially_reproduced`, or `not_reproduced`.

If runtime token usage is unavailable, the aggregate records token values as `null` and includes prompt/output byte counts as proxy-only context. Proxy bytes are not token proof. Trusted runtime adapters may report token usage by printing a standalone stderr side-channel line shaped as:

```text
OPEN_SCAFFOLD_TOKEN_USAGE: {"promptTokens": 80, "completionTokens": 20, "totalTokens": 100}
```

When that marker is present in stderr, the runtime receipt and benchmark aggregate record `promptTokens`, `completionTokens`, and `totalTokens` from the adapter instead of treating tokens as unavailable. The same text in stdout/model answer content is ignored so benchmark prompts cannot forge token proof.

Live control, harness, and ablation lanes must receive distinct work packages. Representative/full live runs are invalid for proof if non-handoff fixtures send the same prompt to control, harness, and ablation lanes, because deltas would be runtime noise rather than scaffold-vs-control evidence.

## Proof gate

The current proof gate refuses broad claims unless the run clears the required standard:

- live paired runs;
- enough fixtures;
- explicit ablations for every fixture in any broad-proof run;
- clean final markers and complete lane evidence;
- no timeout, signal, non-zero exit, missing marker, duplicate marker, non-final marker, blocked/needs-human marker, or incomplete evidence;
- no prompt-quality confound;
- no feedback/handoff/token-budget confound;
- no quality regression;
- no token, duration, or round regression;
- no fabricated command evidence.

Simulated smoke always reports broad dominance as not proven. That is intentional.

## Source prototype evidence

The source prototype showed:

- strong cost/speed signal in some live runs;
- a narrow compact handoff/compiler win;
- mixed broad dominance against naked Codex.

Open Scaffold read those source aggregates as provenance only:

- full live all-ablations run: quality 3 wins / 1 loss / 6 ties, token wins 10/10, duration wins 10/10, proof gate `not_proven` due quality regression and ablation confounds;
- full live repeat without ablations: quality 4 wins / 2 losses / 4 ties, token wins 10/10, duration wins 8/10, proof gate `not_proven` due missing ablations and regressions;
- 15-method handoff lab: best candidates passed deterministically, but it was candidate-only evidence;
- targeted live handoff run: quality tie with lower tokens/duration, but proof gate `not_proven` due one fixture and ablation confounds.

Open Scaffold may cite this as source prototype research. Open Scaffold proof requires Open Scaffold-run evidence under Open Scaffold schemas.

## Reproduction stages

Use stages, not one big overclaim:

1. **Simulated smoke** — verify schema, aggregate, report, feedback, ablations, and proof gate behavior.
2. **Handoff lab** — test 15 deterministic handoff candidates and keep the best under budget.
3. **Targeted live handoff** — budget-gated live run for compact handoff reproduction.
4. **Representative live** — optional, multiple fixtures with selected ablations.
5. **Full live** — optional, all fixtures and all ablations; ask before running if runtime/cost is significant.

If Open Scaffold does not reproduce the source signal, say so. Exact token and duration numbers can differ; compare directionally and keep raw evidence paths.

## Current shipped scope

This scope hardens the reproduction machinery:

- simulated suite with aggregate/report/feedback;
- handoff lab with all 15 candidates;
- live-mode spawn gate and lane receipts;
- distinct control/harness/ablation work packages for non-handoff live fixtures;
- adapter-reported token usage capture in runtime receipts when available;
- dirty live completion handling for timeouts, signals, non-zero exits, missing/non-final/duplicate markers, blocked/needs-human markers, and incomplete evidence;
- explicit ablation fixture selection with no silent cap when supplied;
- reproduction verdicts that stay `not_reproduced` or `partially_reproduced` unless strict gates clear;
- benchmark feedback and repair hypotheses for failed or partial reproduction;
- safe artifact writes.
