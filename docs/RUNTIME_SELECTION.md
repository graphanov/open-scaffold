# Runtime selection

Runtime selection is the user-facing layer for choosing an execution target. It answers one question: **which execution target should this `run.json` package — the run packet — be prepared for?**

```text
User selects a runtime / outside tool
  -> Open Scaffold reads its runtime profile
  -> Open Scaffold creates the run.json work package (run packet)
  -> Adapter/coordinator launches the actual runtime outside core
  -> Runtime does the work
  -> Evidence comes back into Open Scaffold
```

This page covers the first two Open Scaffold steps: choosing `--runtime` / `--workflow`, then writing those choices into the `run.json` package. For profile schema and custom project-local runtimes, read [`RUNTIME_PROFILES.md`](RUNTIME_PROFILES.md). For the external adapter/coordinator contract, read [`RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md). For the accepted executable architecture direction, read [`AGENTIC_RUNTIME_LAYER.md`](AGENTIC_RUNTIME_LAYER.md).

## Product intent

A user should be able to say, in Open Scaffold terms:

```bash
npm run osc -- run .osc/plans/active/001-demo.md \
  --runtime omx \
  --workflow plan \
  --repo /path/to/repo \
  --branch feat/demo
```

and get a concrete `.osc/runs/<run_id>/run.json` package that records:

- selected runtime preset;
- selected workflow;
- executor lane — the execution target;
- harness skill — the runtime command or mode;
- repo/worktree/branch binding — the checkout/branch the adapter may use;
- package quality;
- evidence/approval expectations;
- `executor.spawning: false` — core will not launch the agent/process until an external adapter/coordinator launches it.

The selected runtime is dispatchable by an adapter, but Open Scaffold core still does not launch Claude Code, Codex, OMC, OMX, tmux, or any provider process by itself. Dispatchable means the `run.json` contains enough structured lane/workflow/profile data for an external adapter or an explicit agentic runtime package to consume if such a package exists; it does not mean the adapter is installed or certified.

The first executable package track is OMX-first: `--runtime omx --workflow plan` produces the `$ralplan`-targeted packet that [`packages/runtime-omx/`](https://github.com/graphanov/open-scaffold/tree/main/packages/runtime-omx) can validate and preview from the GitHub source tree before any real launch behavior is added. That runtime package path is not shipped inside the root `open-scaffold` npm payload today.

## Runtime presets

| Runtime preset | Executor lane | Default backend | Purpose |
|---|---|---|---|
| `omc` | `omc-claude` | Claude Code + OMC / oh-my-claudecode | Claude Code-oriented planning/execution workflows. |
| `omx` | `omx-codex` | Codex + OMX / oh-my-codex | Codex-oriented planning/execution workflows. |
| `plain` | `plain-agent` | Any capable agent or human-operated CLI | Runtime-neutral prompt package. |
| `human` | `human` | Human/manual | Manual execution while preserving evidence gates. |
| `custom` | `custom` | Adapter-defined | Future/private runtime adapter. |

Built-in presets are profile IDs and lane targets, not installed adapters. `--runtime omx` records the OMX/Codex lane in `run.json`; it does not run OMX, Codex, or any provider process from core.

## Workflow presets

| Workflow | OMC harness skill | OMX harness skill | Meaning |
|---|---|---|---|
| `interview` | `/deep-interview` | `$deep-interview` | Clarify fuzzy requirements before execution. |
| `plan` | `/ralplan` | `$ralplan` | Critique/refine/approve a plan. |
| `team` | `/team` | `$team` | Parallel fan-out when plan groups are independent. |
| `loop` | `/ralph` | `$ralph` | Persistent completion loop against approved scope. |
| `execute` | `/ultrawork` | `$ultrawork` | Larger bounded implementation pass. |
| `goal` | `/ultrawork` | `$ultragoal` | Goal-maintenance / next-slice inheritance. |

For `omc` and `omx`, `--workflow` defaults to `plan` so `--runtime omx` and `--runtime omc` produce dispatchable run packets without requiring the user to remember the matching `$ralplan` or `/ralplan` spelling. For `plain`, `human`, or `custom`, workflow is recorded but no harness skill is inferred unless the user provides `--harness-skill` explicitly.

## Boundary

```text
Open Scaffold core = select + package + record evidence expectations
Runtime adapter     = translate + launch + return receipt/evidence
Runtime harness     = execute while alive
Operator            = approve merge/publish gates
```

Open Scaffold core owns the run-packet contract. Runtime-specific adapters and agentic runtime packages own process launch, authentication, tmux/session lifecycle, hooks, and runtime logs. Runtime state is forensic — useful for investigation, not durable project truth — until promoted into `.osc/runs`, tracked evidence docs, PRs, issues, or release notes. This boundary is the same one enforced by runtime profiles and the binding contract; this page only describes the selection surface.

## Adapter checklist

A runtime adapter that consumes Open Scaffold packages should:

- read `schemaVersion: open-scaffold.run.v1` from `.osc/runs/<run_id>/run.json`;
- respect `runtimeSelection.runtime` and `runtimeSelection.workflow`;
- validate `executor.lane` and `executor.harnessSkill`;
- reject packages where `packageQuality.executable !== true` or blockers are present;
- preserve `commitPolicy` and human approval gates;
- keep receipts, artifacts, and evidence repo-local;
- write an `open-scaffold.dispatch-receipt.v1` dispatch receipt — repo-local proof of handoff/invocation;
- return completion, blocker, verification, and review evidence into the Open Scaffold/GitHub chain;
- never claim completion from runtime-local state alone.

Passing this checklist proves structural adapter receipt/evidence conformance only. It does not prove task correctness, runtime quality, production adapter support, or runtime-support endorsement.

## Non-goals in core

This slice does not:

- delete, migrate, or bless historical adapter repositories;
- install or authenticate OMC/OMX/Claude/Codex;
- spawn a runtime process from Open Scaffold core;
- add provider-specific hooks to core;
- grant commit/push/merge/publish authority by default;
- make model/orchestration-lab claims.

The practical next step after this core selection surface is a runtime adapter package or coordinator integration that reads the package and performs any launch outside core. The accepted first package boundary is [`packages/runtime-omx/`](https://github.com/graphanov/open-scaffold/tree/main/packages/runtime-omx), starting with `$ralplan`; it writes receipts/evidence by default without spawning and can launch OMX only through its explicit `--allow-spawn` package gate. It is a repository/GitHub package path for now, not an installable subpackage shipped by the root npm tarball.

For schema-backed runtime profiles, built-in profile ids, and project-local custom profiles, see [`RUNTIME_PROFILES.md`](RUNTIME_PROFILES.md). Runtime profiles are data-only in v0: they let users select and document an adapter lane, but they do not install or spawn the runtime from core.
