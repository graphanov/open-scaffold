# Benchmark v2 workflow-value scenario fixture

This folder is a public-safe handoff packet for the next 2000m benchmark phase.
It is not a benchmark run, a leaderboard, or evidence that Open Scaffold improved a
model's raw score.

The fixture exists because 2000m v1 showed no raw-score advantage for the Open
Scaffold lane. A useful v2 must test the product claim Open Scaffold can actually
make: long-lived AI work should be easier to recover, hand off, inspect, stop,
and redirect.

## Files

- `scenario.schema.json` — machine-readable shape for workflow-value benchmark
  scenarios.
- `workflow-value-scenario.json` — first concrete 2000m v2 scenario proposal.

## Ownership split

```text
Open Scaffold repo
  owns: work-record/control surfaces, public claim boundaries, this handoff
        fixture, and tests that keep the fixture from becoming score-only.

2000m benchmark repo
  owns: v2 scorer, context-wipe harness, hidden seeds, reviewer fixtures,
        replay/viewer metrics, and benchmark result schema.

Results records
  own: repeated run outcomes, source-labeled metrics, produced-artifact links,
        and human-feel notes when a formal review track exists.
```

## What the fixture should make hard

A v2 scenario should fail if it only ranks final mechanical score. It should ask:

- can a fresh worker recover after context wipe from repo artifacts only;
- does a handoff package preserve current goal, passed/failed criteria, blockers,
  evidence, and next action;
- does reviewer feedback become an explicit fix route instead of chat drift;
- do regression traps catch overfitting to public examples;
- does the lane stop or redesign when a requirement is impossible, stale, or
  contradictory;
- do `osc evolve analyze`, `osc eval import`, and `osc evidence compact` improve
  the decision record without pretending to be a scorer or runtime.

## Non-claims

This fixture does not claim adoption, benchmark victory, model intelligence gains,
compliance, or production readiness. It is a design contract for the next benchmark
implementation slice.
