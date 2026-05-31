# `osc evolve` v2 after the 2000m negative result

Date: 2026-05-31

Status: accepted for backlog planning; implementation gated by follow-up plans

## Verdict

The 2000m v1 two-lane run showed that current `osc evolve` is useful as a record of repeated attempts, but not yet good enough to call an improvement controller.

The next `osc evolve` work should start with analysis and stop decisions, not with more runtime execution. The first useful slice is an `osc evolve analyze`-style command that reads existing loop/evaluation/scorer evidence and answers:

- are we plateaued;
- which criteria still fail;
- can those failures affect score;
- what changed versus the previous and best attempts;
- should the next action be retry, stop, redesign, or ask a human.

## Why now

The local two-lane run tied mechanically:

| Lane | Result |
| --- | --- |
| Naked Codex/GPT-5.5 | `27/28`, composite `94.4892857143`, determinism PASS. |
| Codex/GPT-5.5 with Open Scaffold | `27/28`, composite `94.4892857143`, determinism PASS. |

Both lanes reached the final best score by generation 2 and plateaued through generation 7. AC28 was probe-only visual polish; event strings could improve telemetry but could not create a mechanical pass.

That makes more blind generations wasteful. A controller-grade evolution loop should have said so around the plateau instead of continuing to record retries.

## Decision

### 1. Keep current `osc evolve` honest

Current `osc evolve` records loop state: attempts, evidence, frontier, and comparisons. It does not run agents, inspect scorer code, infer impossible criteria, choose a benchmark winner, or approve work.

Docs and CLI copy should keep that boundary until controller behavior exists.

### 2. Build analysis before execution

The first v2 slice should be read-only analysis over existing loop evidence.

Minimum output:

- plateau status;
- best attempt;
- no-improvement count;
- current-vs-previous and current-vs-frontier AC deltas;
- remaining failing criteria;
- score-sensitivity assessment;
- impossible/probe-only/stale criterion flags when evidence supports them;
- recommended next action;
- JSON and markdown forms.

This is backlog plan `134-osc-evolve-analyze-plateau-and-impossible-ac`.

### 3. Add scorer adapters before more hand-filled evaluation records

The run exposed brittle hand-filled evaluation envelopes. `osc eval` should support external scorer import so a domain tool can mechanically map its output into an Open Scaffold evaluation envelope.

The first adapter should target 2000m v1 conformance JSON because it has enough structure:

- `passCount` / `totalAcs`;
- per-AC ids, names, pass/skipped states, quality, detail, and breakdown;
- determinism verdict;
- composite score.

The adapter must not mark the evaluation `approved` while any mechanical criterion fails.

This is backlog plan `135-osc-eval-external-scorer-adapter`.

### 4. Add compact evidence mode

Open Scaffold made the benchmark lane easier to reconstruct, but at high evidence volume. The v2 direction needs compact committed evidence:

- raw logs stay local or ignored;
- curated summaries, manifests, and digests are promoted;
- canonical attempts/frontier remain controller-owned;
- model-authored notes can be attached as candidate evidence, not canonical state.

This is backlog plan `136-compact-evidence-mode`.

### 5. Do not turn this into a model-ranking claim

The 2000m run was useful because it failed a narrow claim. The next benchmark must test recovery, handoff, stop-condition correctness, and artifact quality. It must not market Open Scaffold as making models smarter by default.

## Implementation order

1. Postmortem and backlog reset package.
2. `osc evolve analyze`: plateau, impossible-AC, score-sensitivity, AC deltas, and stop/redesign recommendation.
3. `osc eval` external-scorer import, starting with 2000m v1 conformance JSON.
4. Compact evidence mode for repeated attempts.
5. Benchmark v2 in the benchmark repo: context wipe, handoff, reviewer injection, regression traps, hidden seeds, replay/viewer track, and impossible/stale requirement handling.
6. Re-run the comparison only after the above exists, with at least three conditions: naked, current Open Scaffold ledger, and redesigned Open Scaffold controller.

## Non-goals

- No major `osc evolve` implementation in the postmortem slice.
- No runtime spawning or controller execution before the existing `osc work` controller gates mature.
- No raw-log import into public docs.
- No claim that Open Scaffold won the benchmark.
- No adoption or product-market claim from an owner-run local experiment.

## Consequence

The product direction gets sharper:

> `osc evolve` should turn repeated attempts into a reviewable improvement loop with hypotheses, evidence, deltas, stop conditions, and handoff-ready decisions.

That statement is aspirational until the v2 backlog work lands. Today, the honest term is still ledger/record plus compare.
