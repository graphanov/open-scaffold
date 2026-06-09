# Proof Harness

Status: lab/experimental, source-labeled, bounded comparison surface.

`osc prove` is Open Scaffold's answer to a hard question: *is the scaffold actually better than a naked agent run, or are we just telling ourselves a nice story?* Bounded fixture proof only: every result is tied to the supplied receipts and caveats.

The command does not run Codex, call an LLM, rank models, approve work, or certify correctness. It reads a committed manifest plus source-labeled receipts and renders the comparison honestly, including ties and regressions.

For Open Scaffold-owned reproduction runs, use `osc bench suite` and `osc bench handoff-lab` instead. `osc prove` compares checked-in proof receipts; `osc bench` creates local reproduction evidence and must still report `reproduced`, `partially_reproduced`, or `not_reproduced` without promoting source-prototype evidence into Open Scaffold proof.

```bash
osc prove check examples/proof/scaffold-vs-naked-codex/manifest.json
osc prove compare examples/proof/scaffold-vs-naked-codex/manifest.json --format markdown
```

## What the shipped fixture compares

The first checked-in fixture is deliberately narrow:

- **Control arm:** naked Codex receives raw evolution-loop artifacts as prompt payload.
- **Scaffolded arm:** Codex receives the Open Scaffold compact evolution controller signal generated from the same loop.
- **Task:** decide the next action for a cold-resume evolution loop without running tools.
- **Replicates:** three read-only Codex CLI runs per arm, `gpt-5.5`, low reasoning effort.
- **Quality rubric:** five machine-checked fields in the final answer: action/closeout route, all ACs pass, resume at `attempt-c`, required closeout fields, and boundary note.

This fixture asks whether the scaffold can preserve decision quality while making the handoff lighter and faster. It is not a universal benchmark for all AI work.

## Current result

From `examples/proof/scaffold-vs-naked-codex/receipts/aggregate.json`:

| Metric | Naked Codex/raw artifacts | Open Scaffold compact signal | Result |
|---|---:|---:|---|
| Prompt payload | 15,225 bytes | 1,308 bytes | scaffolded is 11.639908× smaller |
| Median Codex-reported total tokens | 35,380 | 31,635 | scaffolded is 1.118382× lighter |
| Median wall-clock time | 11.087 s | 10.469 s | scaffolded is 1.059031× faster |
| Median decision quality | 5/5 | 5/5 | tied; no quality regression |
| Decision quality per 1k Codex tokens | 0.141323 | 0.158053 | scaffolded is 1.118381× better |
| Evolution-loop frontier delta | 0 | +1 accepted criterion | scaffolded records improvement over repeated attempts |

The proof report therefore passes for this bounded fixture because Open Scaffold preserved decision quality, reduced prompt payload, reduced median Codex token receipt, reduced median wall time, and showed an evolution-loop improvement record.

## Honesty rules

1. **Source-label every number.** Each metric must point at committed files under `source_refs`.
2. **Do not infer hidden token or cost data.** If Codex/provider usage is unavailable, record prompt payload bytes separately and mark token receipts unavailable.
3. **Report ties and regressions.** A quality tie stays a tie. A token regression stays a regression.
4. **Keep raw private logs out of public artifacts.** Commit sanitized summaries, prompts, final answers, and aggregate receipts; keep local/private stdout/stderr under ignored research paths.
5. **Do not promote one fixture into a universal claim.** The command can support a bounded result: "this scaffolded handoff beat this naked control under these receipts." It cannot prove Open Scaffold is better for all tasks, all models, all operators, or all runtimes.

## Manifest shape

A manifest declares the two arms and a set of metrics:

```json
{
  "schema": "open-scaffold.proof-comparison.v1",
  "comparison_id": "scaffold-vs-naked-codex-2026-06-08",
  "title": "Scaffolded Codex vs naked Codex: compact evolution handoff",
  "question": "...",
  "arms": {
    "control": { "id": "naked-codex-raw-artifacts", "label": "Naked Codex over raw loop artifacts" },
    "scaffolded": { "id": "open-scaffold-compact-controller-signal", "label": "Open Scaffold compact evolution controller signal + Codex" }
  },
  "metrics": [
    {
      "id": "usage.codex_reported_total_tokens_median",
      "category": "tokens",
      "direction": "lower",
      "control": 35380,
      "scaffolded": 31635,
      "source_refs": ["receipts/aggregate.json"]
    }
  ]
}
```

Required metric categories are `quality`, `tokens`, `speed`, and `evolution`. `osc prove check` fails when a category is missing or a source ref is missing/private.

## Boundary

`osc prove` is a receipt comparator. It does not:

- spawn Codex or any other runtime;
- choose a model winner;
- prove model intelligence improved;
- prove a task is correct;
- approve merge, release, publish, deploy, or compliance decisions;
- replace a controlled A/B study for broader causal claims.
