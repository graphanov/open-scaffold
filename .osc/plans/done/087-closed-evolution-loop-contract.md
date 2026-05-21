# Plan: 087-closed-evolution-loop-contract

## Status

active


## Context

Open Scaffold already ships the human-gated closed loop in `docs/SLICE_CLOSE_PROTOCOL.md` and the first mechanical evaluation/audit envelope surfaces via `osc eval` and `osc audit`. That loop currently answers whether one slice/run can close and what correction route it should take.

`clarence-lee-sheng/oh-my-darwin` is a useful external reference because it makes the next layer visible: a repeated improvement loop with a meta-spec, attempt journal, scorer, frontier, stop condition, and explicit strategies such as greedy/tournament/novelty/MAP-Elites. The useful Open Scaffold lesson is the state contract, not the runtime. The source repo has no license at the time of inspection, so this plan is pattern-only: do not copy code, text, assets, or bundled skills.

This plan turns the closed evolutionary loop into a concrete Open Scaffold feature without changing the core boundary: Open Scaffold records loop intent, attempts, evaluation outcomes, frontier promotion, and next-action routing; external coordinators/adapters/runtimes perform execution.

## Goal

Define and implement a contract-first `osc evolve` feature that lets a project represent multiple attempts against the same plan/run goal, compare their evaluation evidence, promote a current frontier, and route the next attempt or next slice without Open Scaffold core spawning agents or claiming model benchmark authority.

## Proposed v1 contract

The first implementation should be deliberately small and JSON-first:

```text
.osc/evolution/<loop_id>/
  loop.json        # open-scaffold.evolution-loop.v1: objective, scorer, constraints, stop condition, strategy metadata, human gates
  attempts.jsonl   # append-only curated attempt summaries; one line per run/evaluation candidate
  frontier.json    # current promoted best attempt plus rationale and promotion decision
```

Core concepts:

- `loop_id` — stable id for a bounded evolutionary loop tied to one plan, roadmap item, issue, or run family.
- `objective` — one sentence goal inherited from the plan/spec.
- `scorer` — declared scoring/evaluation source: human, maintainer, CI, adapter, domain-tool, external-review, or custom. Scorer output is evidence, not approval by itself.
- `constraints` — hard/soft constraints copied or referenced from the plan.
- `mutation_surface` — what future attempts may change: implementation files, plan amendment, prompt/handoff, runtime profile, evaluator, docs, or other bounded surface.
- `strategy` — metadata only in v1: greedy, tournament, novelty, map_elites, manual, or custom. Core records intent; it does not run the algorithm.
- `attempt` — one candidate attempt with `run_id`, optional `evaluation_id`, changed artifacts, score/decision, evidence refs, and known gaps.
- `frontier` — explicitly promoted current best attempt with rationale, promotion actor, evidence refs, and do-not-assume notes.
- `stop_condition` — max attempts, all ACs pass, human approval, blocked dependency, budget limit, or explicit owner stop.

CLI shape to implement:

```bash
osc evolve init <plan-or-run> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]
osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] --decision <promote|reject|retry|block> [--score <number>] [--rationale <text>]
osc evolve check <loop-dir>
```

The CLI should initialize/check/record curated loop artifacts only. It must not execute a run, call an LLM, mutate source files, publish benchmark rankings, or infer approval from score.

## Constraints / Out of scope

- Do not copy code/text from `oh-my-darwin`; use it only as public pattern inspiration because license status is unclear.
- Do not make Open Scaffold core responsible for agent spawning, process supervision, model routing, runtime auth, tmux/session state, or long-running loops.
- Do not claim model/task-fit recommendations, benchmark authority, compliance certification, or autonomous approval.
- Do not store raw runtime transcripts, secrets, private owner state, `.osc/research/`, `.osc-dev/`, `.hermes/`, `node_modules/`, or other private/internal paths in evolution artifacts.
- Do not replace `docs/SLICE_CLOSE_PROTOCOL.md`, `osc eval`, or `osc audit`; this feature composes them into multi-attempt loop state.
- Keep public wording owner-neutral and runtime-neutral. OMX/Codex, OMC/Claude, Hermes, and custom coordinators are possible external lanes, not required dependencies.

## Files to touch

- `docs/EVOLUTION_LOOP.md` — new public contract doc explaining loop state, frontier promotion, strategy metadata, stop conditions, and boundaries.
- `docs/SLICE_CLOSE_PROTOCOL.md` — add a short bridge from one-run evaluation envelopes to multi-attempt evolution loops.
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — add the evolution loop as a core evidence/contract surface, not a runtime.
- `docs/wiki/concepts/agentic-orchestration.md` — update the contested hypothesis page to distinguish this concrete contract from model-lab/native-runtime scope.
- `src/evolution.ts` — new deterministic renderer/validator/recorder for `open-scaffold.evolution-loop.v1` artifacts.
- `src/cli.ts` — add `osc evolve init|record|check` help text, parsing, and command dispatch.
- `src/audit.ts` — allow curated evolution artifacts as audit roles or document the intended `other` role usage if explicit roles are too much for v1.
- `tests/evolution.test.ts` — schema/render/validate/record/frontier tests.
- `tests/cli-evolution.test.ts` — CLI init/record/check and failure-mode tests.
- `.osc/plans/backlog/031-agentic-orchestration-model-lab-vision.md` — do not edit in place; if this plan supersedes part of 031, capture that in release evidence or a future amendment/close decision.

## Acceptance criteria

- [ ] `docs/EVOLUTION_LOOP.md` explains the loop with a plain diagram: plan/spec -> run attempts -> evaluation envelopes -> attempt journal -> frontier -> next attempt/next slice/close.
- [ ] `osc evolve init` can create a valid `loop.json`, empty `attempts.jsonl`, and initial `frontier.json` from either a plan file or a run packet without writing outside the selected output directory.
- [ ] `osc evolve record` appends an attempt summary from a run packet and optional evaluation envelope, validates the decision, and updates `frontier.json` only when the decision is `promote`.
- [ ] `osc evolve check` rejects invalid schemas, missing source refs, duplicate attempt ids, private/internal path refs, unsupported decisions, missing rationale for promotion/rejection/blocking, and any boundary flag that implies spawning, benchmarking, compliance certification, or approval authority.
- [ ] Evolution artifacts can reference existing `open-scaffold.evaluation.v1` and `open-scaffold.audit-envelope.v1` records without duplicating their full contents.
- [ ] Strategy names are recorded as metadata only; no strategy executes attempts or ranks models in core.
- [ ] Docs and tests explicitly state that scorer output is evidence for the human/maintainer decision, not an automatic approval gate.
- [ ] The feature is demonstrated with a fake/local or human/manual example, not a real OMX/OMC spawned loop.

## Verification steps

1. `npm test -- tests/evolution.test.ts tests/cli-evolution.test.ts` — targeted tests pass.
2. `npm test` — full suite passes.
3. `npm run build` — package builds.
4. `./verify.sh --strict` — scaffold checks pass.
5. `git diff --check` — no whitespace errors.
6. Manual boundary grep: public docs must not claim native spawning, automatic model ranking, compliance certification, or copied `oh-my-darwin` implementation.

## Open questions

- Should `.osc/evolution/` be tracked by default as curated evidence, generated under `.osc/runs/`, or configurable per repo? Initial recommendation: track curated loop contracts, not raw runtime logs.
- Should v1 store attempts in JSONL for append-only ergonomics or a single JSON document for easier validation? Initial recommendation: JSONL plus deterministic check.
- Should `osc eval` offer `--evolution <loop-dir>` to record directly, or should `osc evolve record` stay separate for first implementation?
- Does this concrete contract let us close or amend part of the broader 031 model-lab hypothesis, while keeping model/task-fit recommendations deferred?
