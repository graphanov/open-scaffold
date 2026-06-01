# 2000m v1 two-lane postmortem

## Summary

A local two-lane 2000m v1 run compared two conditions:

| Lane | Condition | What it had |
| --- | --- | --- |
| A | Naked Codex/GPT-5.5 | Benchmark docs, neutral judge feedback, and a runner-owned trajectory. |
| B | Codex/GPT-5.5 with Open Scaffold | The same benchmark target plus Open Scaffold plans, run records, evaluation envelopes, and evolution-loop records. |

Mechanical result: **no raw-score advantage for Open Scaffold was shown**.

| Lane | Best mechanical result | Final-best timing | Persistent failure |
| --- | --- | --- | --- |
| A / naked | `27/28`, composite `94.4892857143`, determinism PASS | reached by generation 2 and then plateaued | AC28 |
| B / Open Scaffold | `27/28`, composite `94.4892857143`, determinism PASS | reached by generation 2 and then plateaued | AC28 |

AC28 was probe-only visual polish in the v1 scorer. It records event-string richness as quality/context telemetry, but it does not mechanically pass from headless event strings. In the observed scorer, `28/28` was structurally unreachable for this run.

## What this falsifies

This run falsifies the narrow claim:

> Open Scaffold, as wired into this 2000m v1 loop, makes Codex/GPT-5.5 score higher than naked Codex/GPT-5.5.

That claim should not be repeated without new evidence from a different benchmark shape or a redesigned controller.

## What remains plausible but unproven

The broader Open Scaffold claim remains untested here:

> Repo-native work records can make AI work easier to inspect, recover, compare, govern, and hand off when the work outlives one chat or one attempt.

This run did show better reconstructability in the Open Scaffold lane: run records, evaluation files, and evolution-loop state made the postmortem easier. That is evidence for the work-record value, not evidence that Open Scaffold made the model score higher.

The Open Scaffold lane also produced a more game-like headless trace in the observed preview: wider obstacle spread, richer events, and a less scorer-shaped field. Treat that as a plausible artifact-quality signal only. It is not causal proof. It may be sample variance, prompt/context framing, scaffold-shaped planning, or some mix of those.

## Proven, plausible, unproven, next to test

| Category | Conclusion |
| --- | --- |
| Proven by this run | Both lanes tied mechanically at `27/28`, composite `94.4892857143`, determinism PASS. |
| Proven by this run | Both lanes reached final best score by generation 2 and plateaued through generation 7. |
| Proven by scorer design | AC28 was probe-only and could not become a mechanical pass from event strings. |
| Proven by artifact inspection | Current `osc evolve` was mostly a record/ledger surface in this run, not the loop controller. |
| Plausible | The Open Scaffold lane may bias work toward more product-shaped artifacts. |
| Unproven | Open Scaffold caused the visual/game-shape difference. |
| Unproven | Open Scaffold improves benchmark score for strong models on contained coding tasks. |
| Unproven | Owner-run local benchmark results prove adoption or product-market fit. |
| Next to test | Recovery, handoff, stop-condition correctness, and repeated controlled runs across more seeds. |

## Open Scaffold findings

| Finding | Product implication |
| --- | --- |
| `osc evolve compare` was often empty or self-comparing. | Add useful current-vs-frontier and current-vs-previous deltas, not only frontier-history rendering. |
| The loop did not flag plateau. | Add plateau detection before burning more generations. |
| The loop did not flag an impossible/probe-only AC. | Add score-sensitivity and impossible-AC detection. |
| Evaluation records were brittle when filled by hand. | Add a benchmark-neutral external scorer import contract that maps structured AC results into evaluation envelopes. |
| Score frontier and acceptance approval were too easy to confuse. | Keep best-score promotion separate from acceptance/compliance decisions. A best-scoring attempt can still fail acceptance criteria. |
| Candidate/model-authored attempt notes coexisted with canonical attempts. | Canonical attempts/frontier must be controller- or judge-owned. Model notes can be inputs, not truth. |
| Evidence volume was high. | Add compact evidence mode: raw logs local, curated summaries promoted. |
| The benchmark lane kept generic scaffold boilerplate. | Benchmark/product lanes need task-shaped mission, README, and run docs. |
| `osc run` did not control Codex. | Either call current behavior recorder/ledger, or design explicit `osc evolve step/run` controller semantics before claiming control. |

## Routing table

| Finding type | Correct home |
| --- | --- |
| Blunt negative result and public claim boundary | This postmortem and the `osc evolve` v2 decision note. |
| Plateau/impossible-AC/current-vs-frontier analysis | Open Scaffold backlog plan `134-osc-evolve-analyze-plateau-and-impossible-ac`. |
| External scorer to evaluation-envelope import | Open Scaffold backlog plan `135-osc-eval-external-scorer-adapter`. |
| Evidence bloat and canonical-summary mode | Open Scaffold backlog plan `136-compact-evidence-mode`. |
| Benchmark v2 mechanics such as context wipe, reviewer injection, hidden seeds, and handoff scoring | The benchmark repo owns benchmark design, scorer mechanics, harnesses, fixtures, and result schemas. Open Scaffold should not host the benchmark-v2 proposal or fixture contract. |
| Raw logs, process lists, local paths, screenshots, JSONL traces, and private operator notes | Do not promote into public docs. Keep local/private only. |
| Qualitative artifact-quality observation | Safe to mention as unproven signal; not safe as causality or adoption proof. |

## Way forward

1. Land this postmortem and backlog reset package.
2. Build `osc evolve analyze` before more benchmark runs:
   - plateau detection;
   - impossible/probe-only AC detection;
   - score-sensitivity analysis;
   - current-vs-frontier and current-vs-previous AC deltas;
   - JSON plus markdown output;
   - stop/redesign recommendations.
3. Build benchmark-neutral external scorer import for `osc eval`:
   - import a generic AC-result JSON shape from any external domain tool;
   - generate a full evaluation envelope without hand-filled missing criteria;
   - reject or block when mechanical ACs fail, are skipped, or are probe-only;
   - never call non-pass evidence `approved`;
   - keep benchmark-specific converters in the benchmark repo or optional integrations, not Open Scaffold core.
4. Add compact evidence mode:
   - raw logs stay local;
   - committed evidence is a curated summary, manifest, and digest list;
   - model-authored candidate notes do not become canonical attempts.
5. Design benchmark v2 in the benchmark repo, independent of Open Scaffold:
   - context wipe;
   - fresh-agent handoff;
   - staged requirements;
   - reviewer injection;
   - regression traps;
   - hidden or randomized seeds;
   - impossible/stale requirement handling;
   - replay/viewer track for headless artifacts.
6. Repeat the experiment only after independent benchmark-v2 mechanics and generic Open Scaffold controller improvements exist:
   - A / naked;
   - B / current Open Scaffold ledger;
   - C / redesigned Open Scaffold controller;
   - multiple seeds/runs before causal claims.

## Non-claims

This note does not claim:

- A benchmark win for Open Scaffold.
- A raw 2000m v1 score lift from Open Scaffold.
- The visual artifact difference was caused by Open Scaffold.
- Adoption, market demand, or user value.
- The headless drivers are playable games.
- `osc evolve` is already a controller.

The honest result is narrower and still useful: the current setup tied on score, exposed a benchmark ceiling, and showed exactly what Open Scaffold must build next if it wants to prove workflow value rather than record it after the fact.
