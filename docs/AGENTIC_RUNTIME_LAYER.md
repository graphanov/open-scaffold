# Agentic Runtime Layer

Open Scaffold should become executable through explicit agentic runtime packages while preserving the core source-of-truth, evidence, and audit model.

This page records the accepted architecture direction after plan `046-executable-open-scaffold-architecture`. Plan `042-reference-adapter-package-no-spawn` adds the first no-spawn package scaffold for that direction; it is not a claim that real runtime launching already exists.

## Decision

```text
Open Scaffold core packages work.
Agentic runtime packages consume the package.
A selected runtime does the work only when explicitly allowed.
Receipts and evidence return to the repo/GitHub chain.
Human approval gates remain explicit.
```

The first package boundary is:

```text
packages/runtime-omx/
```

Package distribution note: `packages/runtime-omx/` is a GitHub source path in this repository, not part of the root `open-scaffold` npm payload. The root package ships core CLI/scaffold/docs only; publishing an installable runtime package remains a separate owner-approved release decision.

The first runtime target is Codex through OMX / oh-my-codex. In user-facing commands, prefer `--runtime codex`; use `--runtime omx` only when the operator intentionally wants the harness name.

The first workflow to prove is:

```text
$ralplan
```

Later OMX workflows such as `$deep-interview`, `$ralph`, `$ultrawork`, `$ultragoal`, and team-style modes can follow only after the package boundary, receipts, evidence, and safety model are proven.

## Layer model

| Layer | Owns | Must not silently own |
|---|---|---|
| Open Scaffold core | mission, roadmap, plans, `run.json`, runtime profile data, package quality, evidence expectations, approval/commit policy | real runtime launch, provider auth, process lifecycle, credential handling, autonomous merge/publish authority |
| Agentic runtime package | runtime-specific validation, command preview, dry-run receipt/evidence, adapter-specific launch policy when explicitly allowed | canonical project truth, hidden default spawning, broad runtime certification, merge/publish decisions |
| OMX / oh-my-codex runtime | selected Codex/OMX execution workflow while alive | Open Scaffold core identity, final approval gate, durable evidence by itself |
| Operator / GitHub / evidence chain | review, CI, approval, PR, release, and durable proof | raw runtime transcript as unquestioned truth |

## Command shape

The safe first shape is package-first and dry-run-first:

```bash
npm run osc -- run .osc/plans/active/001-demo.md \
  --runtime codex \
  --workflow plan
```

That creates a dispatchable `run.json` package. It does not launch OMX.

The first `packages/runtime-omx/` slice consumed that package and proved the `$ralplan` handoff path without real process launch. The follow-up runtime spike adds an explicit `--allow-spawn` package gate for OMX `$ralplan`; launch remains outside Open Scaffold core, requires safe branch/worktree/version checks, and still returns receipt/evidence before any human approval, merge, or publish decision.

## Authority defaults

Default authority should stay strict:

- dry-run / preview first;
- no secrets or credential reads;
- no hidden network dependence;
- no destructive filesystem authority;
- no commit, push, merge, release, or package publish authority;
- real launch only after explicit operator opt-in;
- evidence/log paths returned to the Open Scaffold run/evidence chain;
- human approval required before publication gates.

An agentic runtime package can translate these policies to a specific runtime, but it cannot erase them.

## Backlog impact

Plan 046 sets the next execution order:

1. `042-reference-adapter-package-no-spawn` added the in-repo `packages/runtime-omx/` no-spawn package scaffold.
2. `043-one-real-runtime-adapter-spike` added the first OMX `$ralplan` explicit launch path behind `--allow-spawn`, keeping core non-spawning. The current user-facing preset for that Codex lane is `--runtime codex`; `--runtime omx` remains the explicit harness-name form.
3. `044-cli-friction-reduction` remains later unless ceremony blocks the execution proof.
4. `030-agent-runtime-selection-vision` and `031-agentic-orchestration-model-lab-vision` stay as broader hypotheses until adapter/runtime evidence justifies promotion.

## Non-goals

This architecture slice does not:

- implement default runtime launch from core;
- make `osc run` spawn a process;
- claim full OMX support;
- certify oh-my-codex as production-supported by Open Scaffold;
- add credentials, daemon behavior, process supervision, hosted registries, marketplace behavior, or model benchmarking;
- move approval/merge/release authority into the runtime package.

## Why this preserves the Open Scaffold advantage

Open Scaffold's advantage is not that it runs a particular agent. It is that every agent run can be tied back to mission, plan, scope, acceptance criteria, verification, evidence, and approval.

The agentic runtime layer makes Open Scaffold executable without throwing away that advantage. Runtime packages may become specific and useful; core remains the durable black-box recorder and control contract.
