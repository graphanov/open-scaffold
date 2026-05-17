# Spawning Boundary and Runtime Adapter Contract

Open Scaffold Milestone 16 asks whether core should remain non-spawning, add thin adapter invocation, move execution into adapter packages, or eventually grow a native runtime. Here, `spawning` means launching real agent/runtime processes. This document records the current boundary decision and the contract shape for the next safe step. Public/private tool labels are defined in [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md).

## Current decision

Open Scaffold core should **not** implement real autonomous runtime spawning yet.

Core should first define the adapter/runtime boundary, dispatch receipt (handoff proof), authority vocabulary (permission words), and evidence expectations. Real spawning belongs in runtime-specific adapters or a future explicitly governed runtime product.

```text
Open Scaffold core packages work.
A coordinator chooses the execution lane.
A bridge/binding — external translation/launch glue — translates the package.
A runtime/harness — the agent environment or workflow wrapper — executes in its own bounded environment.
Evidence returns to the repo/task/PR chain.
Human approval and merge authority stay explicit.
```

## Why this boundary exists

Spawning is not only process launch. A credible runtime surface must eventually handle:

- runtime backend identity;
- workspace/worktree isolation;
- sandbox and permission translation;
- process/session lifecycle;
- cancellation and resume;
- log and artifact capture;
- blocker and question routing;
- credential and network policy;
- commit/push/merge authority;
- evidence receipts;
- human approval gates;
- replay or audit reconstruction.

If Open Scaffold core owns those too early, it becomes a runtime by drift. The current product value is stronger as a runtime-neutral protocol and black-box recorder that many runtimes can consume.

## Layer model

| Layer | Owns | Must not silently own |
|---|---|---|
| Open Scaffold core | mission, roadmap, plans, `run.json` work packages (run packets), evidence schema, approval/commit policy, verification expectations | runtime-specific launch mechanics, provider auth, live process control |
| Coordinator / task bridge | intake, task selection, operator Q&A, lane choice, retry/block/review state | final evidence by itself |
| Runtime adapter / bridge | translating `.osc` run packets into runtime-specific invocation, returning status/artifacts/evidence | canonical project truth, uncontrolled repo mutation |
| Runtime / harness | execution, local session state, tool use, local logs, generated artifacts | approval authority or canonical task state unless explicitly granted |
| Operator surface — chat/dashboard for status and approvals | visible status, blockers, questions, approvals | source of truth |
| GitHub / repo evidence | durable review, CI, release, audit references | raw runtime transcript as canonical truth |

## Minimum v1 adapter conformance vocabulary

The adapter contract uses vendor-neutral fields before any provider-specific implementation exists.

Minimum concepts:

```yaml
adapter_id: string                 # e.g. fake-local, omx-hermes, claude-code, codex
runtime_backend: string            # runtime family, not Open Scaffold core identity
runtime_handle: string | object    # opaque session/process/run handle returned by adapter
run_packet_path: string            # .osc/runs/<run_id>/run.json
dispatch_receipt_path: string      # durable receipt written by adapter or dry-run invoker
evidence_paths: string[]           # outputs promoted into .osc/docs/PR/release evidence
status: created | dispatched | running | blocked | completed | failed | cancelled
blocker_code: string | null
question_id: string | null
approval_policy: string
commit_policy: string
```

The adapter may attach runtime-specific metadata, but the portable contract should remain small enough that Claude Code, Codex, OpenCode, OMX, OMC, Ouroboros, GSD, human/manual lanes, or future runtimes can implement it without contaminating core.

## Authority and sandbox vocabulary — permission/isolation words

Open Scaffold should not adopt Claude, Codex, OpenCode, or OMX permission strings as its lingua franca. It should define its own small policy vocabulary and let adapters translate.

Suggested initial vocabulary:

| Policy | Meaning |
|---|---|
| `read_only` | Runtime may inspect files and produce analysis, but not write. |
| `write_artifacts_only` | Runtime may write evidence/artifacts in designated output paths. |
| `edit_worktree` | Runtime may edit the selected worktree/branch within scope. |
| `run_commands` | Runtime may execute bounded commands needed for verification. |
| `network_allowed` | Runtime may access network when explicitly needed. |
| `secrets_forbidden` | Runtime must not read secrets or credential files. |
| `commit_forbidden` | Runtime must not commit. |
| `commit_allowed` | Runtime may commit only within stated scope. |
| `push_forbidden` | Runtime must not push. |
| `merge_forbidden` | Runtime must not merge. |
| `human_approval_required` | Runtime or coordinator must stop before the named gate. |

Default posture:

```text
read_only or write_artifacts_only
commit_forbidden
push_forbidden
merge_forbidden
human_approval_required for publication
```

## Dispatch receipt

A dispatch receipt is repo-local proof of what was invoked, with what authority, from what package. It proves handoff/dispatch facts; it is not approval, not a merge gate, and not proof that acceptance criteria passed.

Minimum receipt fields:

```yaml
schema_version: open-scaffold.dispatch-receipt.v1
receipt_id: string
run_id: string
task_id: string | null
adapter_id: string
runtime_backend: string
invoked_by: string
invoked_at: ISO-8601 timestamp
working_directory: string
worktree_path: string | null
branch: string | null
run_packet_path: string
prompt_or_package_path: string | null
runtime_selection:
  runtime: string | null
  workflow: string | null
  profile_id: string | null
  profile_source: string | null
authority:
  sandbox_policy: string[]
  commit_policy: string
  approval_policy: string
spawned: boolean
spawn_command_redacted: string | null
runtime_handle: string | object | null
logs: string[]
artifacts: string[]
status: dispatched | dry_run | rejected | failed
failure:
  code: string | null
  message: string | null
```

For the first prototype, `spawned` should be `false` or use a fake/local adapter only. The point is to validate the receipt and evidence shape before launching real agents.

## Failure taxonomy

Use explicit failure codes rather than prose-only failure reports.

Baseline codes:

| Code | Meaning |
|---|---|
| `package_not_executable` | Goal, AC, verification, or scope is missing. |
| `unsupported_adapter` | Requested adapter is not installed or not allowed. |
| `unsupported_lane` | Adapter cannot run the requested runtime/harness lane. |
| `unsafe_scope` | Requested permissions exceed package policy. |
| `missing_authority` | Human approval or configured authority is absent. |
| `missing_access` | Required repo/path/runtime access is missing. |
| `missing_tool` | Runtime CLI/tool is unavailable. |
| `missing_configuration` | Adapter config/env is incomplete. |
| `prompt_not_accepted` | Runtime rejected or could not parse the handoff. |
| `artifact_missing` | Runtime claims completion but expected evidence is missing. |
| `artifact_outside_safe_roots` | Artifact path escapes allowed roots. |
| `verification_failed` | Verification command or acceptance criterion failed. |
| `runtime_error` | Runtime process/session/transport failed. |
| `cancelled` | Run was intentionally stopped. |

Adapters may add runtime-specific codes, but should map back to this portable set.

## OMX v0.17.0 evidence: Hermes MCP bridge

OMX `v0.17.0` is a concrete external example of this boundary pattern. It is not Open Scaffold conformance evidence for an OMX adapter and not a certified launch integration.

The release adds a bounded, opt-in Hermes MCP bridge:

```bash
omx mcp-serve hermes
```

The bridge states the same responsibility split Open Scaffold should preserve:

```text
Hermes or another coordinator owns intake, operator Q&A, package shaping, and external approval policy.
OMX owns planning, execution, review, and local artifact production inside a bounded worktree/session.
The bridge only connects those product-facing responsibilities.
```

Read tools:

- `hermes_list_sessions`
- `hermes_read_status`
- `hermes_read_tail`
- `hermes_list_artifacts`
- `hermes_read_artifact`

Mutation-gated tools require `allow_mutation: true`:

- `hermes_start_session`
- `hermes_send_prompt`
- `hermes_report_status`

Safety boundaries:

- bridge disabled by default in plugin metadata;
- no tmux scrollback exposure;
- no raw private state exposure;
- safe artifact paths under `.omx/...` roots;
- byte-truncated artifact reads;
- `OMX_MCP_WORKDIR_ROOTS` to restrict working directories;
- explicit JSON failures such as `no_session`, `prompt_not_accepted`, `artifact_missing`, `artifact_outside_safe_roots`, `mutation_not_allowed`, and `command_failed`.

This confirms the adapter/binding thesis: coordinators and project protocols do not need to own the runtime. They need a bounded bridge that can dispatch, poll, read safe artifacts, report status, and preserve approval boundaries.

## What Open Scaffold should do next

Near-term:

1. Keep core non-spawning.
2. Keep `docs/RUNTIME_BINDING_CONTRACT.md` aligned with this adapter/receipt vocabulary.
3. Treat OMX v0.17.0 Hermes MCP as a reference pattern for coordinator-to-runtime bridges, not as Open Scaffold adapter certification.
4. Use the fake/local conformance fixture to prove run-packet consumption, dispatch receipt writing, evidence writing, and no-spawn behavior before any real runtime adapter package.
5. Keep real Claude/Codex/OpenCode/OMX/Ouroboros spawning in adapter packages or external runtimes.

Longer-term:

- Revisit native runtime ownership only if Open Scaffold's compliance-grade agentic OS vision requires stronger proofability, tamper-evident event capture, governed evolution, or approval enforcement than external runtime bridges can provide.

## Non-goals for the next implementation slice

The next slice should not:

- launch real Claude/Codex/OpenCode sessions from core;
- add provider dependencies to core;
- add Hermes-specific assumptions to Open Scaffold core;
- expose tmux or runtime scrollback as project truth;
- grant commit/push/merge authority by default;
- treat user-global runtime state as canonical evidence.

## Relationship to existing docs

- `docs/RUNTIME_BINDING_CONTRACT.md` defines the current package-to-binding lifecycle.
- `docs/RUNTIME_STRATEGY_RESEARCH_SYNTHESIS.md` captures the Milestone 16 framework research synthesis.
- `docs/TASK_RUN_MODEL.md` defines task/run/question IDs.
- `docs/GLASS_COCKPIT_PROTOCOL.md` defines operator-surface events.
- `docs/SLICE_CLOSE_PROTOCOL.md` defines evidence-backed postflight and approval strength.

This document narrows those ideas into the spawning/adapter boundary that must hold before any `osc spawn` or runtime adapter implementation is attempted.
