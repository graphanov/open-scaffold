# Evolution Loop Contract

Open Scaffold's normal close loop handles one slice or one run:

```text
slice -> run -> evidence -> evaluation -> decision -> correction route
```

`osc evolve` adds the next contract layer for repeated attempts against the same objective:

```text
plan/spec
  -> run attempts
  -> evaluation envelopes
  -> attempt journal
  -> frontier promotion
  -> next attempt | next slice | close | block
```

The feature is intentionally contract-first. Open Scaffold records the loop state and evidence. It does not execute the loop.

## Why this exists

Agentic runtime work often improves through multiple attempts: one planner draft, one implementation run, one review/fix run, one stronger runtime package, or one better prompt. Without a durable loop record, teams lose which attempt was best, why it was promoted, what evidence was used, and what should happen next.

The evolution loop contract gives coordinators and runtime adapters a shared place to write that state without making Open Scaffold core a scheduler, model router, benchmark lab, or approval authority.

## Files

A loop lives under `.osc/evolution/<loop_id>/`:

```text
.osc/evolution/<loop_id>/
  loop.json        # objective, constraints, scorer, strategy metadata, stop condition, boundaries
  attempts.jsonl   # append-only curated attempt summaries; one JSON object per attempt
  frontier.json    # current promoted best attempt plus rationale and promotion history
```

These files are curated evidence. They should not contain raw runtime transcripts, secrets, private research notes, or hidden session state.

## CLI

Initialize a loop from a plan or run packet:

```bash
osc evolve init .osc/plans/active/087-demo.md \
  --out .osc/evolution/demo-loop \
  --strategy greedy
```

Record an attempt from a run packet, optional evaluation envelope, and optional adapter-output refs:

```bash
osc evolve record .osc/evolution/demo-loop \
  --run .osc/runs/demo-run/run.json \
  --evaluation docs/evidence/demo-evaluation.json \
  --receipt .osc/runs/demo-run/dispatch-receipt.json \
  --evidence .osc/runs/demo-run/runtime-omx-evidence.md \
  --evidence .osc/runs/demo-run/runtime-omx.log \
  --decision retry \
  --score 0.93 \
  --repair-hypothesis "Replace brittle parser branch with tokenized row scan so malformed rows report row and column." \
  --target-metric "accepted_ac_count" \
  --expected-gain 1 \
  --actual-delta 0 \
  --tokens-total 89542 \
  --usage-source "runtime stderr" \
  --rationale "Retry because AC2 still fails and the next attempt has a measurable parser hypothesis."
```

`--receipt` is specialized for `open-scaffold.dispatch-receipt.v1` dispatch receipts and must match the run packet `run_id`. `--evidence` is repeatable for curated repo-local adapter evidence or logs. Missing refs, outside-repo refs, and private/internal refs are rejected before the attempt journal or frontier is mutated.

`retry` is a continue decision, so it must record a concrete `--repair-hypothesis` before the next attempt. `--target-metric`, `--expected-gain`, `--actual-delta`, and usage fields are optional but should be filled when known. Usage numbers are receipts, not score. If only total tokens are reliable, record only `--tokens-total`; do not invent input/output/cache/reasoning splits or dollar cost.

Check loop structure:

```bash
osc evolve check .osc/evolution/demo-loop
```

Analyze a stopped or in-flight loop without recording a new attempt:

```bash
osc evolve analyze .osc/evolution/demo-loop
osc evolve analyze .osc/evolution/demo-loop --format json
osc evolve analyze .osc/evolution/demo-loop --format markdown --out docs/evidence/evolution-analysis.md
osc evolve analyze .osc/evolution/demo-loop --compact
osc evolve analyze .osc/evolution/demo-loop --efficiency
```

`osc evolve analyze` reads `loop.json`, `attempts.jsonl`, `frontier.json`, and linked evaluation envelopes. It reports plateau/stagnation, current-vs-previous and current-vs-frontier acceptance-criteria deltas, observed score sensitivity, criteria flagged as probe-only / hardcoded non-pass / skipped / stale / impossible, the current attempt's repair hypothesis and usage, and a next-action recommendation: `continue`, `stop`, `redesign`, or `inspect_scorer`. Criterion-level hints can come from evaluation/scorer metadata such as `analysis.score_sensitivity`, `analysis.impossible`, `analysis.reason`, and `analysis.source`, or from explicit evidence/rationale wording.

The JSON, terminal, and markdown analysis outputs also include a next-action packet. `--compact` renders only the controller signal: recommended action, reasons, current/frontier resume point, plateau state, current pass/fail counts, remaining failing criteria, required next fields, usage receipt completeness, safe evidence refs, and boundary notes. Use it to hand a loop to a fresh human, agent, or coordinator without copying bulky logs into prompt context. The packet is not an executor, benchmark result, approval, model ranking, or proof that Open Scaffold improved output quality.

`--efficiency` is the diagnostic/experimental local measurement harness for controller-output overhead. It compares baseline full terminal analysis against compact controller output and reports:

- output bytes per useful decision field;
- evidence reference bytes per action recommendation;
- token/cost telemetry completeness;
- blind retries prevented in the analyzed fixture;
- next-action packet byte size;
- analyze-input-to-recommendation step count;
- required control fields present versus total report size.
- an additional measured target matrix for section-level full-to-compact controller surfaces.

The primary efficiency definition is: preserve the same required workflow-control decision fields while compact output uses no more than 66.7% of baseline output bytes. The secondary definition is: at least 1.5x fewer output bytes per useful decision field. The report computes those ratios from rendered artifacts. It does not score evidence volume, infer missing token/cost receipts, claim a benchmark win, or claim Open Scaffold made a model smarter.

The additional target matrix is deliberately narrow and diagnostic. It measures report overhead surfaces such as full markdown to compact markdown, full JSON to controller-signal JSON, verbose score-sensitivity tables to compact acceptance lines, AC delta tables to remaining-failure summaries, and full criteria JSON to remaining-failure JSON. A target counts diagnostically when required controller fields are preserved and the compact surface is at least 1.5x smaller. Public-summary language should prefer strong targets and label marginal rows instead of headlining a raw `N/N` count. This is still not a product-wide efficiency proof.

For a source-labeled scaffolded-vs-naked-Codex fixture that uses this compact controller signal as the scaffolded arm, run:

```bash
osc prove compare examples/proof/scaffold-vs-naked-codex/manifest.json --format markdown
```

That fixture reports quality, prompt-payload/token, speed, and evolution-loop metrics from committed receipts. It is bounded proof for one cold-resume decision task, not a universal model benchmark.

The analysis command is a decision aid. It does not mutate loop files unless `--out` is supplied for a rendered report, and even then it writes only the requested report path. It does not spawn runtimes, rerun benchmarks, rank models, certify compliance, promote a frontier, or approve work.

### Enforced loop (coordinator-driven)

The loop earns its overhead only when the coordinator — not the agent under evaluation — runs the bookkeeping. Enforcement lives in the coordinator's control flow; Open Scaffold core only records and analyzes. The intended usage is:

- The coordinator runs `osc evolve record <loop-dir> --run <run-packet> --evaluation <evaluation-json>` after each attempt. When the caller omits `--target-metric`/`--actual-delta`, record stores `target_metric: accepted_ac_count` and an `actual_delta` computed as this evaluation's passing-criteria count minus the previous attempt's (first attempt: versus 0). Explicit caller flags always win. The agent never has to hand-type that telemetry, so the fields plateau detection consumes are populated by construction.
- Before every retry, the coordinator runs `osc evolve analyze <loop-dir> --compact` and injects the controller signal into the worker's context. Analyze reports a plateau when three or more consecutive attempts share an identical per-acceptance-criterion pass/fail fingerprint — even when score, target metric, and actual delta are all absent. On a zero-sensitivity plateau (one or more criteria failing in every attempt with no observed delta) the packet recommends `redesign` and names those criteria with explicit language that the requirement itself may be unsatisfiable and should be questioned, not only that the scorer should be inspected.
- Retrying without addressing the packet's recommendation is a protocol violation. The coordinator should surface it (for example, refuse the retry or flag the handoff) rather than letting the worker claim completion against an unchanged plateau.

This is bounded bookkeeping enforced around the model by the coordinator. It does not make a model smarter, judge correctness, or approve work; whether enforcement changes outcomes is a separate measured experiment, not a claim of this contract.

Historical/repositioned migration note: earlier builds exposed `osc eval import` and `osc evidence compact` for richer external scorer conversion and compact public-safe evidence bundles. Those helpers are outside the reduced maintained CLI after the framework cleanup. Current reduced CLI support is narrower:

```bash
osc eval init .osc/plans/active/<plan>.md --out docs/evidence/<plan>-evaluation.json
osc audit init .osc/plans/active/<plan>.md --artifact evidence docs/evidence/<external-score>.json --out docs/evidence/<plan>-audit.json
osc audit check docs/evidence/<plan>-audit.json
```

Use `osc eval init <plan-path>` to draft an acceptance-criteria envelope from a plan, then attach external scorer output as curated evidence/audit artifacts. If a project still needs the retired import or compact-evidence behavior, keep that converter in an optional integration or migration appendix rather than treating it as a live core command.

`osc evolve` does not create a run, launch a runtime, call an LLM, publish benchmark rankings, certify compliance, approve a merge, or decide product taste. It does not make a model smarter. It only records and analyzes curated loop state so recoverability, control, handoff, governance, and efficiency can be inspected instead of assumed.

## See it in one screen

The quickest low-friction payoff is the bare attempt comparison command. Use it when you have two local attempt folders and want a PR-pasteable work-record artifact without first creating a full evolution loop:

```bash
osc compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b
osc compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b --json
osc compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b --output comparison.md
```

A bare attempt folder may contain:

```text
attempt-a/
  diff.patch       # optional, but at least diff.patch or rationale.txt must be meaningful
  rationale.txt    # optional, but at least diff.patch or rationale.txt must be meaningful
  transcript.md    # optional; JSON output records metadata only, not full transcript content
  ac-status.json   # optional criteria/score metadata supplied by the user/reviewer
```

`osc compare` reads local files only. It does not spawn a runtime, score attempts automatically, promote a frontier, or approve work. Scores in `ac-status.json` are displayed as user-provided judgment metadata, not benchmark results.

Use the full evolution loop when the project needs durable loop state, append-only attempt history, frontier rationale, run/evaluation binding, or adapter receipts:

```text
one task -> attempt A -> attempt B -> osc evolve compare -> frontier rationale
```

Read [`docs/examples/evolution-loop-compare.md`](examples/evolution-loop-compare.md) for a small public-safe example that shows two attempts, linked evaluation envelopes, a PR-ready markdown comparison, and an acceptance-criteria delta table.

To run the same full-loop shape against checked-in files, see [`examples/evolution-ledger-demo/`](../examples/evolution-ledger-demo/). It ships recorded attempts, evaluation envelopes, a promoted frontier, and committed expected `osc evolve compare` output so the proof can be checked mechanically.

For the prerequisite-free comparison fixture, see [`examples/attempt-compare/`](../examples/attempt-compare/).

## Concepts

### Loop

`loop.json` defines the bounded improvement question:

- `loop_id` — stable id for the loop.
- `subject` — plan/run/task identity.
- `objective` — the thing attempts are trying to improve.
- `constraints` — hard/soft boundaries inherited from the plan/spec.
- `acceptance_criteria` — criteria attempts should satisfy.
- `scorer` — declared evaluator source; evidence only, not automatic approval.
- `mutation_surface` — what future attempts may change.
- `strategy` — metadata such as `manual`, `greedy`, `tournament`, `novelty`, `map_elites`, or `custom`.
- `stop_condition` — when the loop should stop.
- `boundary` — explicit non-claims: no core spawning, benchmarking, compliance certification, approval, or external anchoring.

### Attempt

Each `attempts.jsonl` line summarizes one candidate attempt:

- `attempt_id`
- `run_id`
- `run_packet`
- optional `evaluation_id` / `evaluation`
- `decision`: `promote`, `reject`, `retry`, or `block`
- optional numeric `score`
- required `rationale`
- evidence refs, including optional adapter dispatch receipts;
- boundary flags

The journal is append-only in spirit: record another attempt rather than rewriting what happened.

### Frontier

`frontier.json` records the currently promoted attempt:

- current attempt id / run id / evaluation id;
- score if available;
- promotion rationale;
- evidence refs;
- promotion history.

A frontier is not proof of correctness. It is the current best recorded attempt under the chosen evidence and human/operator judgment.

## Strategy names are metadata

The v1 strategy field describes how an external coordinator may be thinking about attempts:

- `manual` — human/operator selects attempts.
- `greedy` — promote the best current score/evidence so far.
- `tournament` — compare attempts pairwise or in groups.
- `novelty` — prefer meaningfully different approaches.
- `map_elites` — preserve best attempts across categories.
- `custom` — project-defined strategy.

Open Scaffold core does not run these algorithms. An OMX-based agentic runtime package, Hermes coordinator, GitHub workflow, or another external adapter may use the metadata to decide what to launch next, then write the result back as a run/evaluation/attempt.

## Boundary rules

Allowed:

- record a loop from a plan or run packet;
- append curated run/evaluation attempts;
- record adapter dispatch receipts and repo-local adapter evidence/log refs as attempt evidence;
- promote a frontier with rationale;
- validate structure, refs, duplicate attempt ids, private-path leaks, and unsupported boundary claims;
- compose with `osc run`, `osc eval`, and `osc audit`.

Not allowed in core:

- spawning agents or managing tmux/session state;
- selecting/ranking AI models as a benchmark product;
- treating a score as approval;
- certifying compliance or production readiness;
- storing raw runtime logs or private owner context in public artifacts;
- copying runtime-specific code into core.

## Relationship to OMX

Open Scaffold can be heavily invested in an agentic runtime/engine path based on OMX / oh-my-codex while keeping the layer split clean:

```text
Open Scaffold core = plan/run/eval/audit/evolution contracts
packages/runtime-omx = OMX-specific execution adapter / engine path
OMX/Codex = actual runtime lane
operator/human = approval and taste/risk authority
```

That makes OMX the first serious runtime-engine direction without making the core CLI silently spawn processes or depend on one runtime.

## Minimal example

```text
1. `osc evolve init <plan-or-run> --out .osc/evolution/<loop_id>` creates the loop.
2. `osc run <plan> --runtime codex --workflow plan` creates a run packet.
3. `open-scaffold-runtime-omx .osc/runs/<run_id>/run.json` validates the Codex/OMX `$ralplan` handoff and writes receipt/evidence without spawning by default.
4. `osc eval init <plan-path>` can scaffold an acceptance-criteria evaluation envelope when needed; richer eval checking is repositioned outside the reduced maintained CLI.
5. `osc evolve record ... --receipt .osc/runs/<run_id>/dispatch-receipt.json --evidence .osc/runs/<run_id>/runtime-omx-evidence.md` appends the attempt.
6. If the attempt is best so far, `--decision promote` updates `frontier.json`.
7. The coordinator chooses: retry, create next slice, close, or block.
```

This is the durable shape behind an agentic improvement loop: attempts can be executed by OMX or another lane, but the project can still reconstruct what was tried, what evidence exists, which attempt is current frontier, and why.
