# Runtime Binding Contract

This is the execution boundary layer: the rules for what external launchers may do after Open Scaffold creates a package. Runtime selection chooses a lane; runtime profiles describe that lane; the binding contract says what an external adapter/coordinator must do with the `run.json` package (run packet).

Named harnesses in this contract, including OMC and OMX, are runtime lanes or adapter candidates rather than Open Scaffold core dependencies. Use [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md) for public/private/future reference labels.

Open Scaffold core creates bounded run packages. Runtime bindings — external launch glue/adapters for a chosen lane — consume those packages and launch outside core. This document defines the contract between the repo-native Open Scaffold package and any coordinator, adapter, harness, agent, or human lane that executes it.

For the accepted executable architecture direction, see [`docs/AGENTIC_RUNTIME_LAYER.md`](AGENTIC_RUNTIME_LAYER.md): Open Scaffold starts execution support through explicit in-repo agentic runtime packages, with `packages/runtime-omx/` as the first target package and `$ralplan` as the first OMX workflow to prove.

## Executive rule

```text
Open Scaffold core packages.
A coordinator/adapter launches outside core.
A harness or human executes.
Evidence returns.
Postflight closes.
```

`spawning: false` in `run.json` means core did not launch a real agent/process. It is not a missing feature. It is the boundary that keeps generic Open Scaffold portable while runtime packages prove execution behavior explicitly.

## What is a runtime binding?

A runtime binding is the external launch glue that turns a run packet — a repo-written `run.json` execution package — into a concrete execution attempt.

Examples:

- a coordinator script that reads `.osc/runs/<run_id>/run.json` and starts an OMX `$ralplan` session;
- an in-repo agentic runtime package such as `packages/runtime-omx/` that validates an OMX `$ralplan` handoff by default and launches only behind an explicit package-level allow-spawn gate;
- an OMC-specific command that turns a plan into a Claude Code `/team` handoff;
- an adapter that reads a project-local runtime profile in `.osc/runtimes/<id>.json` and translates its lane/workflow/evidence contract;
- a GitHub bot that assigns a plain agent to a branch and links the PR;
- a human operator who reads the generated prompt package and performs the work manually.

A project-local runtime profile is not itself a binding. It is declarative data that tells an external adapter which lane, workflow, command token, and evidence expectation to use.

A binding is not the Open Scaffold core. It may be a separate repo, plugin, bot, shell script, GitHub Action, IDE extension, or manual procedure.

## Layer ownership

| Layer | Owns | Must not own |
|---|---|---|
| Open Scaffold core | plan/spec/run package, package-quality fields, prompt artifacts, evidence locations, commit policy | runtime auth, process lifecycle, autonomous spawning |
| Coordinator/task bridge | selecting work, choosing lane, assigning owner, retry/block/review state | final evidence by itself |
| Runtime binding / agentic runtime package | translating package to a specific handoff or launch, attaching runtime metadata, returning artifacts | project truth, hidden default spawning, merge authority unless granted |
| Harness/agent/human lane | execution while alive | canonical task database, approval gate |
| Operator surface — chat/dashboard for status, questions, and approvals | status/questions/approval messages | source of truth |
| GitHub/evidence | public review, CI, release, proof | runtime session truth |

## Binding lifecycle

```text
1. Select task or plan
2. Create or read .osc/runs/<run_id>/run.json
3. Validate packageQuality.executable
4. Validate executor lane and harness skill — runtime command/mode
5. Check safety and isolation requirements
6. Launch or hand off to selected lane outside core
7. Attach runtime bindings back to run metadata/evidence
8. Route questions by question_id -> run_id
9. Promote outputs, logs, diffs, PRs, and verification evidence
10. Produce completion report or blocker
11. Postflight using slice-close protocol
12. Close, retry, amend, block, or create next slice
```

## Required input: `run.json` package (run packet)

A binding should expect a `run.json` package (run packet) like:

```json
{
  "schemaVersion": "open-scaffold.run.v1",
  "runId": "20260512T120000Z-runtime-binding",
  "taskId": "issue:42",
  "mode": "run",
  "status": "created",
  "namespace": ".osc",
  "plan": {
    "path": ".osc/plans/active/004-runtime-binding-contract.md",
    "goal": "Define the runtime binding contract.",
    "acceptanceCriteria": [],
    "verificationSteps": [],
    "openQuestions": []
  },
  "packageQuality": {
    "executable": true,
    "blockers": [],
    "requiredAction": null
  },
  "executor": {
    "lane": "omx-codex",
    "harnessSkill": "$ralplan",
    "spawning": false
  },
  "runtime": {
    "repoPath": "/repo",
    "worktreePath": null,
    "branch": "docs/runtime-binding-contract",
    "tmuxSession": null,
    "processId": null
  },
  "bindings": {
    "operatorSurface": "github-pr",
    "operatorThreadId": null,
    "githubIssue": "42",
    "githubPr": null
  },
  "artifacts": {
    "runDir": ".osc/runs/20260512T120000Z-runtime-binding",
    "manifest": ".osc/runs/20260512T120000Z-runtime-binding/run.json",
    "prompts": [],
    "logs": [],
    "outputs": [],
    "evidence": []
  },
  "commitPolicy": "no commit/push unless explicitly approved by the operator"
}
```

Bindings may enrich this record, but they should not rewrite past attempts. A retry is a new run.

## Package validation gate

Before launching anything, the binding must verify:

```yaml
package_quality:
  executable: true
  blockers: []
plan:
  goal: present
  acceptance_criteria: present and testable
  verification_steps: present
executor:
  lane: supported by this binding
  harness_skill: allowed for this lane or null for plain/manual lanes
runtime:
  repo_path: exists or intentionally remote
  branch_or_worktree: isolated enough for planned work
commit_policy: explicit
open_questions: no blocking questions
```

If the package is not executable, do not improvise implementation. Route to clarification, deep-interview, plan amendment, blocker, or manual correction.

## Minimum v1 adapter conformance contract

A v1 adapter consumes one `open-scaffold.run.v1` run packet. It either refuses the packet with a clear failure code or writes repo-local handoff proof:

1. an `open-scaffold.dispatch-receipt.v1` dispatch receipt, normally at `.osc/runs/<run_id>/dispatch-receipt.json`;
2. one or more repo-local evidence artifacts cited by that receipt.

The receipt records which adapter consumed which packet, the selected lane/workflow/profile, what authority was used, whether a real runtime was spawned, and where evidence/logs/artifacts live. The evidence artifact records factual handoff/result proof. Neither artifact proves that the task acceptance criteria passed; postflight/evaluation still decides correctness, approval, merge, and release.

A no-spawn conformance adapter must refuse packets when required fields are missing, blockers/open questions remain, `executor.spawning` is not `false`, the lane/harness does not match the selected workflow, commit policy is absent, or receipt/evidence paths would leave `runtime.repoPath`.

For the fake/local conformance fixture specifically, success means: packet consumed, `spawning: false` enforced, dispatch receipt written, evidence written, and no runtime, network, credentials, commit, push, merge, or publish authority used.

For the OMX track, [`packages/runtime-omx/`](../packages/runtime-omx/) is the first explicit agentic runtime package. It consumes a run packet, validates the OMX `$ralplan` lane/workflow (`runtimeSelection.runtime=omx`, `runtimeSelection.workflow=plan`, `executor.lane=omx-codex`, `executor.harnessSkill=$ralplan`, `executor.spawning=false`), writes deterministic receipt/evidence artifacts by default without spawning, and can launch only behind its package-level `--allow-spawn` gate after branch/worktree/version checks.

## Binding responsibilities

For the detailed spawning/adapter boundary, dispatch receipt shape (handoff proof), authority vocabulary (permission words), and OMX v0.17.0 Hermes MCP bridge evidence, see [`docs/SPAWNING_BOUNDARY.md`](SPAWNING_BOUNDARY.md). This contract remains the lifecycle-level agreement; the boundary document defines the safer next-step vocabulary before any real `osc spawn` implementation.

A binding should:

1. Read the `run.json` package (run packet) and generated prompts.
2. Refuse unsupported lanes, unsafe packages, and blocking open questions.
3. Preserve the commit policy.
4. Create or select an isolated worktree/session when needed.
5. Launch the runtime or produce a manual handoff outside core.
6. Attach runtime metadata:
   - session ID;
   - process ID;
   - tmux/session name;
   - worktree path;
   - branch;
   - log path;
   - operator thread/comment ID;
   - PR number if opened.
7. Emit glass-cockpit events — operator-dashboard/control-room messages — for status, blockers, questions, approval requests, completion, and evidence receipts when an operator surface is bound.
8. Route human answers by `question_id -> run_id`.
9. Promote final artifacts and evidence to `.osc/runs`, tracked evidence docs, PRs, issues, or release notes.
10. Leave approval/merge/release to the configured gate.

## Audit and evaluation envelope responsibilities

Open Scaffold core defines audit/evaluation envelope shapes — structured records for integrity reconstruction and acceptance-criteria evidence review; runtime bindings and adapters fill the execution-specific parts of those envelopes.

A binding should return enough structured information for postflight to build evaluation and audit records:

- dispatch receipt path or runtime handoff reference;
- selected lane, workflow, adapter, and runtime handle when available;
- branch/worktree/session metadata;
- authority actually used: edit, command, commit, push, approval, and sandbox posture;
- changed files, outputs, promoted logs, screenshots, or generated artifacts;
- verification commands and results;
- blocker/failure code and `question_id` when blocked;
- evidence paths that can be evaluated against acceptance criteria.

A binding may also return evaluator output from CI, a review bot, a domain tool, or a human operator. That output is evidence for the Open Scaffold evaluation envelope; it is not final approval unless the run package explicitly grants that authority.

Bindings must not claim completion from runtime-local state alone. They must promote durable artifacts back into the repo/task/PR/evidence chain and leave final approval, merge, release, legal compliance, and business-risk decisions to the configured gate.

## Explicit non-responsibilities

Generic Open Scaffold core does not own:

- installing or authenticating Claude, Codex, OMC, OMX, or any other runtime;
- tmux/process supervision;
- background daemons or watchdogs;
- Discord/Slack/Telegram/GitHub bot implementation;
- automatic commits, pushes, merges, or releases;
- runtime-specific state folders;
- resolving product ambiguity after dispatch.

Runtime-specific projects or coordinators may own these, but must promote durable outcomes back into the Open Scaffold chain.

## Example lane packet shapes, not certified launch support

These examples document `run.json` packet shapes and external binding behavior. They do not certify that OMC, OMX, Claude Code, Codex, OpenCode, or any runtime is installed, launched, or endorsed by Open Scaffold core.

### OMC / Claude Code lane

Use when Claude Code plus OMC workflow modes are intentionally selected.

Example executor:

```json
{
  "lane": "omc-claude",
  "harnessSkill": "/ralplan",
  "spawning": false
}
```

Binding behavior:

```text
Read .osc/runs/<run_id>/package.md.
Launch or hand off to Claude Code/OMC with /ralplan, /team, /ralph, or /ultrawork as selected.
Do not mutate unrelated worktrees.
Return plan/output/evidence paths to .osc/runs or PR.
If blocked, emit BLOCKED with question_id.
```

OMC runtime state is forensic until promoted.

### OMX / Codex lane

Use when Codex plus OMX workflow modes are intentionally selected.

Example executor:

```json
{
  "lane": "omx-codex",
  "harnessSkill": "$ralplan",
  "spawning": false
}
```

Binding behavior:

```text
Read .osc/runs/<run_id>/package.md.
Launch or hand off to Codex/OMX with $ralplan, $team, $ralph, $ultrawork, or $ultragoal as selected.
Attach session/log/worktree metadata back to the run.
Return completion report, artifacts, verification, and blocker questions by ID.
Never treat OMX state as canonical truth unless promoted.
```

OMX is not automatically the runtime engine for Hermes, OMC, or Open Scaffold. It is a selected Codex execution lane.

### Plain-agent lane

Use when a capable coding agent can read the package directly without a harness.

Example executor:

```json
{
  "lane": "plain-agent",
  "harnessSkill": null,
  "spawning": false
}
```

Binding behavior:

```text
Give the agent the package.md and relevant files.
Require it to report changed files, verification, evidence paths, open blockers, and commit policy compliance.
If it cannot answer with evidence, do not close the slice.
```

### Human/manual lane

Use when a person performs the work.

Example executor:

```json
{
  "lane": "manual",
  "harnessSkill": null,
  "spawning": false
}
```

Binding behavior:

```text
Show the human objective, scope, acceptance criteria, verification, and evidence expectations.
The human updates files/PR/evidence manually.
Postflight still uses the same slice-close protocol.
```

## Failure-state taxonomy

Use these states when a binding cannot complete cleanly:

| State | Meaning | Required action |
|---|---|---|
| `package_not_executable` | Missing goal, AC, verification, or blocking questions exist | Clarify, amend, or regenerate package |
| `unsupported_lane` | Binding cannot run requested executor lane or skill | Choose another binding/lane or update package |
| `prompt_rejected` | Runtime refused or could not parse the handoff | Repair prompt/package; retry as new run if substantial |
| `session_blocked` | Runtime is waiting on a decision, auth, dependency, or environment | Emit `question_id`/blocker and wait |
| `artifact_missing` | Runtime claims completion but required output/evidence is absent | Do not close; request repair or retry |
| `verification_failed` | Tests/checks/AC verification failed | Fix in same branch/run if small, otherwise create retry run |
| `human_input_needed` | Operator decision required | Send approval/question event with correlation IDs |
| `cancelled` | Run intentionally stopped | Preserve partial artifacts if useful; record reason |
| `runtime_error` | Harness/process crashed or transport failed | Preserve logs; classify retry/blocker |

Do not hide failures in chat. Record them in the run/evidence/task chain.

## Evidence return contract

At completion, the binding should produce or point to:

```yaml
run_id: 20260512T120000Z-runtime-binding
status: completed | blocked | failed | cancelled
changed_files:
  - docs/RUNTIME_BINDING_CONTRACT.md
artifacts:
  - .osc/runs/<run_id>/output.md
logs:
  - .osc/runs/<run_id>/runtime.log
verification:
  - command: ./verify.sh --standard
    result: pass
  - command: npm test
    result: pass
known_gaps:
  - "No executable adapter implemented in core."
questions: []
next_action: postflight
```

Then use `docs/SLICE_CLOSE_PROTOCOL.md` to decide whether the slice is approved, weak-approved, rejected, or blocked.

## Cockpit events

If an operator surface is bound, the binding may emit events using `docs/GLASS_COCKPIT_PROTOCOL.md`:

- `session_start` when execution begins;
- `status` for progress;
- `blocker` when stuck;
- `question` when human input is required;
- `completion_report` when work finishes;
- `evidence_receipt` when proof is available;
- `approval_request` before merge/release;
- `cancellation` when stopped.

Events must carry `task_id`, `run_id`, `question_id`, evidence path, issue, PR, or release links when applicable.

## PR and release handoff

When a binding opens or updates a PR, the PR body should include:

- roadmap item or issue/task ID;
- plan/spec path;
- run ID and run packet path;
- executor lane and harness skill;
- changed files summary;
- verification commands and results;
- evidence/postflight path;
- Codex/CI/human review status;
- commit/merge policy.

GitHub is the publication layer, not the runtime transcript.

## Anti-patterns

Avoid:

- adding runtime-specific spawning to generic Open Scaffold core;
- letting a binding execute packages with blocking questions;
- launching OMC/OMX/plain agents from vague prose instead of a run packet;
- treating runtime state folders as durable truth;
- routing answers by latest chat message instead of `question_id`;
- allowing multiple runtimes to mutate one worktree without explicit isolation;
- allowing a binding to merge/publish unless the package grants that authority;
- calling a run complete without artifacts and verification evidence.

## Relationship to other protocols

- `docs/TASK_RUN_MODEL.md` defines task/run/question/operator identity.
- `docs/RUNTIME_HARNESS_DISPATCH.md` explains the high-level coordinator-to-harness flow.
- `docs/GLASS_COCKPIT_PROTOCOL.md` defines visible operator events emitted during binding execution.
- `docs/SLICE_CLOSE_PROTOCOL.md` defines postflight, approval strength, correction routing, and next-slice inheritance.
- `docs/GITHUB_WORKFLOW.md` defines the issue/branch/PR/review/release publication chain.

## Product implication

Open Scaffold can support many runtimes precisely because core does less:

```text
Core stays portable.
Bindings become specific.
Evidence stays durable.
Operators stay in control.
```

The first concrete executable track is OMX-first rather than runtime-generic: prove `packages/runtime-omx/` and `$ralplan`, then expand to other OMX workflows or other `packages/runtime-*` packages only with evidence.

## Dry-run and conformance examples

For concrete, credential-free consumers of this contract, see [`docs/examples/runtime-binding-dry-run.mjs`](examples/runtime-binding-dry-run.mjs), [`docs/examples/runtime-binding-conformance/fake-local-adapter.mjs`](examples/runtime-binding-conformance/fake-local-adapter.mjs), [`packages/runtime-omx/README.md`](../packages/runtime-omx/README.md), and [`docs/examples/README.md`](examples/README.md). For the current OMC/OMX runtime-selection surface and refreshed-adapter checklist, see [`docs/RUNTIME_SELECTION.md`](RUNTIME_SELECTION.md).

The dry-run example reads a generated `.osc/runs/<run_id>/run.json`, validates the executable-package and `spawning: false` boundary, prints the handoff summary an external binding would use, and exits without launching any runtime.

The fake/local adapter conformance fixture goes one step further: it consumes the same run packet, writes an `open-scaffold.dispatch-receipt.v1` receipt and a deterministic evidence artifact, and still exits without launching any runtime, reading credentials, or requiring network access. `packages/runtime-omx/` applies that pattern to the OMX `$ralplan` lane specifically. These prove structural handoff/evidence behavior only; task correctness, runtime availability, and adapter production support remain separate gates.

These examples are intentionally not a supported adapter SDK and not Open Scaffold launchers. They are reference proofs that run packets are concrete enough for external coordinators, runtime bindings, or humans to consume while core remains runtime-neutral.
