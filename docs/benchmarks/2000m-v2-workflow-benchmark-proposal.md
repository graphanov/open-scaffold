# 2000m v2 workflow benchmark proposal

## Purpose

2000m v1 was strong enough to check deterministic headless protocol compliance, but weak for testing the value Open Scaffold actually claims: recovery, handoff, evidence quality, stop conditions, and long-lived work control.

A useful v2 should not be just “more SkiFree acceptance criteria.” It should test whether a workflow can keep improving when requirements change, context is wiped, reviewers intervene, and a scorer exposes traps or impossible targets.

## Design principle

Separate the scores. Do not collapse everything into one flattering number.

## First implementation slice

The first benchmark-v2 slice should be a **two-repo protocol plus benchmark fixture**:

- Open Scaffold provides the public-safe scenario contract, scenario fixture, and claim boundaries.
- The `graphanov/2000m` benchmark repo later ports that fixture into a real v2 scorer and harness.
- Results records stay separate and source-label every mechanical, artifact, process, and recovery metric.

This is narrower than a full benchmark implementation but stronger than a design-only note. It gives the benchmark repo a concrete packet to implement while keeping Open Scaffold honest about what it owns: `osc evolve analyze`, `osc eval import`, compact evidence, plans, run packets, evaluation envelopes, and public non-claims.

The initial machine-readable handoff lives at [`../examples/benchmark-v2-workflow/`](../examples/benchmark-v2-workflow/).

| Track | What it measures | Where it belongs |
| --- | --- | --- |
| Mechanical conformance | Does the produced driver satisfy deterministic protocol checks? | Benchmark scorer. |
| Artifact quality | Does the headless trace look like a richer game field? | Viewer/replay metrics plus optional human review. |
| Process-control quality | Does the workflow stop, redirect, and avoid wasted generations? | Benchmark harness plus Open Scaffold loop analysis. |
| Handoff/recovery quality | Can a fresh agent continue from repo artifacts without chat history? | Benchmark scenario and reviewer rubric. |

Open Scaffold should only claim a value wedge if it improves the workflow tracks or the artifact/recovery tracks under controlled conditions. A raw mechanical tie is not a win.

## Scenario shape

A v2 run should change over time instead of asking the model to solve one static contract.

```text
Generation 1: implement the baseline headless skier driver.
Generation 2: introduce a new requirement, such as slalom gates or a scoring variant.
Generation 3: inject a valid reviewer bug report.
Generation 4: reveal a regression trap or hidden seed set.
Generation 5: wipe context and ask a fresh agent to continue from repo artifacts only.
Generation 6: introduce an impossible, stale, or contradictory requirement and score whether the workflow stops and escalates.
```

## Required mechanics

### 1. Context wipe

After a fixed generation, the next worker gets the repo and run artifacts but no chat history. Score whether it can reconstruct:

- current goal;
- current best attempt;
- failed and passed acceptance criteria;
- evidence files;
- remaining blockers;
- next recommended action.

### 2. Cross-agent handoff

A different runtime or model continues the same work. Score whether the handoff package and evidence are enough to avoid redoing or contradicting prior work.

### 3. Reviewer injection

Inject a valid review finding mid-run. Score whether the lane:

- records the finding;
- maps it to acceptance criteria or a plan amendment;
- fixes it without regressing previous behavior;
- preserves evidence of the correction.

### 4. Regression traps

Add hidden or delayed checks that punish overfitting to public scorer examples. The lane should preserve earlier invariants while fixing new issues.

### 5. Impossible or stale requirement

Include one deliberate blocker: a criterion that is impossible under the current artifact type, stale after a spec change, or contradictory with another requirement. Score whether the workflow detects the problem and recommends stop/redesign instead of burning attempts.

### 6. Replay/viewer track

Headless drivers need a viewer or renderer so artifact quality is inspectable. Label it clearly:

> State-trace renderer, not a native game UI.

Useful metrics:

- obstacle horizontal spread;
- obstacle density balance;
- obstacle type diversity;
- event richness;
- collision/recovery cadence;
- monster behavior;
- replay stability;
- side-by-side fixed-seed previews.

Human taste can be recorded, but it must stay separate from mechanical rank unless a formal blind-review process is defined.

## Suggested conditions

Run at least three conditions:

| Condition | Purpose |
| --- | --- |
| A / naked | Strong model with neutral benchmark feedback and a plain trajectory. |
| B / current Open Scaffold ledger | Current plan/run/eval/evolve records, without controller behavior. |
| C / redesigned Open Scaffold controller | Hypothesis-driven loop with plateau detection, impossible-AC detection, scorer adapters, compact evidence, and stop/redesign recommendations. |

Repeat across multiple seeds/runs before making causal claims. A one-off owner-run comparison can generate hypotheses; it cannot prove adoption or causality.

## Benchmark-repo handoff

The benchmark repo should own:

- v2 protocol and scorer design;
- scenario sequencing;
- hidden/randomized seed policy;
- context-wipe harness mechanics;
- reviewer-injection fixtures;
- regression-trap tests;
- replay/viewer metrics;
- result schema for separate mechanical, artifact, process, and handoff tracks.

The handoff fixture in this repository should be treated as input to that work, not as the benchmark implementation itself. A later `graphanov/2000m` slice should decide whether the scenario becomes `v2/scenarios/workflow-value.json`, a scorer fixture, or both.

Open Scaffold should own:

- `osc evolve analyze` for plateau/impossible-AC/score-sensitivity analysis;
- `osc eval` external-scorer adapter import;
- compact evidence mode;
- controller semantics only after explicit safety and adapter gates;
- public claim boundaries.

Results records should own:

- repeated run outcomes;
- source-labeled mechanical scores;
- process/recovery metrics;
- links to produced artifacts;
- human-feel notes only as separate context.

## Success criteria

A v2 benchmark is useful if it differentiates at least one of these dimensions:

- final mechanical score;
- artifact/game-shape quality;
- context-wipe recovery;
- cross-agent handoff quality;
- regression resistance;
- stop-condition correctness;
- evidence completeness and falsifiability.

If naked and scaffolded lanes still tie mechanically but Open Scaffold materially improves recovery, handoff, and stop-condition tracks, that is a credible value wedge. If Open Scaffold ties or loses across all tracks, the product thesis needs deeper revision.

## Public-claim boundary

Safe:

> This benchmark tests whether repo-native work records improve multi-turn AI work under controlled conditions.

Unsafe:

> A safe benchmark report must not say the run establishes adoption, agent intelligence gains, or a benchmark win from nicer evidence.

The benchmark should make failure visible, not hide it.
