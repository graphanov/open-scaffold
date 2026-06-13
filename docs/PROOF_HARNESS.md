# Proof Harness

Status: lab/experimental, source-labeled, bounded comparison surface.

## The benchmark program (2026-06): the claim ledger

Plan 163's benchmark evidence is public in the independent
[harness-bench](https://github.com/graphanov/harness-bench) repo, pinned here to
commit [`7caa1e4`](https://github.com/graphanov/harness-bench/commit/7caa1e4044af642938ef391c06c43b3db09cf494).
Method: preregistration with amendments-only changes, hidden seed/input pairs
with pre-committed hashes, a clean-room blind second implementation proving the
task spec unambiguous, submission-mode central scoring, per-invocation usage
receipts, and pre-committed kill rules. Every number below is pilot-grade (n=1
per cell unless stated; one worker model, claude-sonnet-4-6) and traces to the
pinned [`results/`](https://github.com/graphanov/harness-bench/tree/7caa1e4044af642938ef391c06c43b3db09cf494/results) tree; the headline reviewability claim uses
[`results/review-1`](https://github.com/graphanov/harness-bench/tree/7caa1e4044af642938ef391c06c43b3db09cf494/results/review-1), including `answers.jsonl`, `grades.json`, and `receipts.jsonl`.

**Measured dead (kept at equal prominence — the credibility asset):**

- In-session task improvement for a strong model: naked matched or beat every
  scaffolded arm across the retry-trap, cold-resume, and multi-slice campaigns.
- Retry discipline as a strong-model benefit: the self-administered protocol arm
  failed both decision cells (a five-attempt false-claim plateau and a
  regression chase); the naked arm stopped correctly.
- Unconditional "cheaper resumes": with near-zero recoverable state at
  interruption, every gram of harness overhead was pure cost.
- Cross-session memory carry at five slices: all four arms produced identical
  perfect conformance; the record added 7-10% cost and no quality.

**Measured alive:**

- **Reviewability (review-1; the core claim):** six real finished workspaces,
  each judged by a fresh reviewer with and without the record, graded
  mechanically against pre-committed keys — accuracy **94% vs 30%**, confident
  wrong history answers **0 vs 8** (sensitivity analysis included), review cost
  **halved** (24.9k vs 46.5k judge tokens). All three preregistered hypotheses
  confirmed; the pre-committed kill rule passed in the record's favor.
- **Conditional resume value:** with substantial recoverable state, the
  runner-carried record packet re-established a fresh session's context ~3x
  cheaper than naked rediscovery (8.5k vs 25.2k tokens); with no state it paid
  nothing. Resume value is a function of recoverable state, not a constant.
- **Enforcement as self-repair:** the judgment checkpoint plus a clean-context
  judge converted the protocol's own worst failure (the false-claim plateau)
  into a correct stop carrying a 100,000-seed impossibility proof — at 67% of
  the failed arm's cost, still above naked.

**Untested:** weak-model rescue (haiku tier), ambient zero-worker-cost records
(C-ambient; review-2 in flight at the time of writing), the D-light minimal-gate
overhead floor, human-reviewer replication, multi-agent coordination.

The sections below describe the older bounded `osc prove` fixture, which remains
a separate, narrower comparison surface.

`osc prove` is Open Scaffold's answer to a hard question: *is the scaffold actually better than a naked agent run, or are we just telling ourselves a nice story?* Bounded fixture proof only: every result is tied to the supplied receipts and caveats.

The command does not run Codex, call an LLM, rank models, approve work, or certify correctness. It reads a committed manifest plus source-labeled receipts and renders the comparison honestly, including ties and regressions.

For Open Scaffold-owned reproduction runs, use `osc bench suite` and `osc bench handoff-lab` instead. `osc prove` compares checked-in proof receipts; `osc bench` creates local reproduction evidence and must still report `reproduced`, `partially_reproduced`, or `not_reproduced` without promoting source-prototype evidence into Open Scaffold proof. The current Open Scaffold-run harness migration verdict is `partially_reproduced`, with broad dominance still `mixed_not_proven`.

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

## Reproducing the fixture

Run the bench commands in order. Each writes results under `.osc/bench/<suite-id>/`:

```bash
# 1. Simulated smoke — verifies schema, aggregate, report, feedback, and proof gate
osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke

# 2. Handoff lab — tests 15 deterministic handoff candidates, keeps the best under budget
osc bench handoff-lab --out .osc/bench/handoff-lab-15

# 3. Live adapter runs — external harness only
# Open Scaffold core retired live mode for `osc bench suite` in plan 168.
# Run live adapter benchmarks in a runtime-specific/external harness, then
# record compact source-labeled receipts or an evidence note back in this repo.
```

Core bench suites write `.osc/bench/<suite-id>/aggregate.json` and `.osc/bench/<suite-id>/REPORT.md`; the handoff lab also writes per-method `resume.md` and `score.json` under `.osc/bench/<suite-id>/methods/<method>/`. Raw live logs and local runtime residue stay gitignored; commit a short evidence note when an external live run needs a durable readout.

## Current evidence status

| Claim | Status | Notes |
|---|---|---|
| Checked-in fixture passes `osc prove check` | demonstrated | `examples/proof/scaffold-vs-naked-codex/` |
| Decision quality preserved (5/5 both arms) | demonstrated | committed receipts |
| Prompt payload reduction (~11.6×) | demonstrated | committed receipts |
| Token and wall-clock reduction | demonstrated | committed receipts |
| Live-lane reproduction of efficiency win | partially_reproduced | Compact handoff did not reproduce the source efficiency win in the rerun; runtime token receipts unavailable from live Codex adapter output |
| Broad dominance over naked Codex | mixed_not_proven | Ablations did not isolate a harness-specific causal effect; fixture count below broad proof gate |
| Third-party or production adoption | not_demonstrated | No entries beyond placeholder in the adoption index |

Live-lane reproduction has not yet fully succeeded; raw attempts are in `.osc/bench/`. Do not claim Open Scaffold broadly beats naked Codex from the current evidence.

## Adoption proof entries

When recording adoption proof, keep it factual and reproducible:

- Project, date, reporter, labels, and Open Scaffold version or commit.
- Scenario: what work was recorded and which part of the loop was exercised.
- Reproduction commands for clone/install, scaffold inspection, tests/verifier, and trace/PR/evidence-chain checks.
- Expected result and actual result.
- Evidence refs: plan, run packet, evidence note, PR/check link, logs/artifacts.
- Friction and caveats: manual, slow, flaky, private, environment-specific, or not reproducible parts.
- Boundary statement: what the proof demonstrates, and what broader claim would need separate evidence.
