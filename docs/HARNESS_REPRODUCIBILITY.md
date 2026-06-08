# Harness reproducibility and benchmark boundary

The harness includes local benchmark/reproduction machinery so Open Scaffold can test whether the workflow helped. It does not turn a smoke test into a broad model or framework claim.

## Backend commands

```bash
osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke
osc bench handoff-lab --out .osc/bench/handoff-lab-15
```

The simulated suite writes:

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

## Proof gate

The current proof gate refuses broad claims unless the run clears the required standard:

- live paired runs,
- enough fixtures,
- explicit ablations,
- no prompt-quality confound,
- no feedback/handoff/token-budget confound,
- no quality regression,
- no token, duration, or round regression,
- no fabricated command evidence,
- clean completion.

Simulated smoke always reports broad dominance as not proven. That is intentional.

## Source prototype evidence

The source prototype showed:

- strong cost/speed signal in some live runs,
- a narrow compact handoff/compiler win,
- mixed broad dominance against naked Codex.

The broad claim remains mixed / not proven because the prototype evidence had prompt-quality, no-evolution/no-signal, quality-regression, and token-budget-proxy confounds.

Open Scaffold may cite this as source prototype research. Open Scaffold proof requires Open Scaffold-run evidence under Open Scaffold schemas.

## Reproduction stages

Use stages, not one big overclaim:

1. **Simulated smoke** — verify schema, aggregate, report, and proof gate behavior.
2. **Handoff lab** — test 15 deterministic handoff candidates and keep the best under budget.
3. **Targeted live handoff** — optional, budget-gated live run for compact handoff reproduction.
4. **Representative live** — optional, multiple fixtures with selected ablations.
5. **Full live** — optional, all fixtures and all ablations.

If Open Scaffold does not reproduce the source signal, say so. Exact token and duration numbers can differ; compare directionally and keep raw evidence paths.

## Current shipped scope

This PR scope ships the foundation:

- simulated suite,
- handoff lab,
- aggregate/report files,
- proof gate that refuses broad claims,
- explicit ablation fixture selection with no silent cap when supplied,
- safe artifact writes.

It does not ship live Codex spawning from Open Scaffold core.
