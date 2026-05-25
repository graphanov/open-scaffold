# Runtime Strategy Research Synthesis

> Status: research synthesis, not the v1 stable contract. The v1 product keeps runtime launch outside Open Scaffold core; native spawning remains future research unless promoted by a separate plan, safety review, and owner approval.

This synthesis consolidates the Milestone 16 framework research lanes produced from `docs/RUNTIME_STRATEGY_RESEARCH_CRITERIA.md`. Named runtimes and coordinators in this research are evidence sources, runtime lanes, private deployment examples, or adapter candidates as labeled in [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md); they are not Open Scaffold core dependencies.

Raw worker reports are local evidence, not yet public project truth. The report inventory and evidence-quality caveats are summarized in `docs/RUNTIME_STRATEGY_RESEARCH_EVIDENCE.md`.

Included reports:

- `oh-my-codex.md`
- `oh-my-claudecode.md`
- `oh-my-openagent.md`
- `oh-my-openagent-v4-hashing.md`
- `get-shit-done.md`
- `ouroboros.md`

## Executive conclusion

Open Scaffold should **not implement real autonomous spawning in core** as the next move.

The evidence supports this direction:

1. Keep Open Scaffold core as the **runtime-neutral repo-native protocol, run-packet contract, evidence recorder, and decision surface**.
2. Define a vendor-neutral **adapter/runtime contract** before any spawn command ships.
3. Treat real runtime execution as **adapter-package or sibling-runtime territory**, not accidental core creep.
4. If `osc spawn` is explored, limit the first slice to a **fake/local adapter dispatch receipt** behind explicit experimental language. It should prove command shape and audit trail, not mutate code through Claude/Codex/OpenCode.
5. Borrow methodology patterns from the surveyed frameworks: sandbox-class translation, dispatch receipts, run handles, marker-bounded overlays, completion markers, worktree isolation, hash/content anchors, and evidence gates.

In one sentence:

> Open Scaffold should be the repo-native contract and black-box recorder that any runtime can consume, not the runtime itself — at least until a separate, explicitly governed runtime product has a stronger reason to exist than the current adapter ecosystem already provides.

## Emerging product hypothesis: compliance-grade agentic OS

A stronger runtime vision may exist, but it is **not** simply "Open Scaffold should spawn agents." The differentiated product vector is closer to:

> Open Scaffold as a compliance-grade agentic operating system/protocol for regulated enterprise SDLC: every agent action is traceable, evidence-backed, auditable, replayable, approval-aware, and able to evolve the governing skills/protocols under explicit control.

This hypothesis changes the runtime question. If Open Scaffold eventually owns a runtime, the reason should be **proofability and governed evolution**, not convenience.

Possible distinguishing capabilities:

- **Evidence and traceability** — every task, run, question, approval, artifact, tool invocation, runtime handoff, and verification result has stable identity and durable evidence.
- **Auditability** — a human, auditor, or downstream agent can reconstruct what happened without relying on hidden chat history, provider dashboards, or user-global runtime state.
- **Proofability / tamper evidence** — run receipts and evidence packets can be content-addressed, chained, signed, or otherwise made hard to silently rewrite.
- **Governed evolutionary loops** — skills, prompts, rubrics, adapter contracts, verification gates, and runtime policies can evolve from observed outcomes, but only through explicit review and evidence-backed amendments.
- **Regulated authority model** — commit/push/merge, credential access, environment scope, network access, and human approval are first-class policy concepts rather than incidental runtime flags.
- **Runtime-neutral compliance layer** — Claude Code, Codex, OpenCode, OMC, OMX, Ouroboros, GSD, and future runtimes can all plug into the same evidence/authority protocol.

Hashgraph or hashgraph-inspired technology may be relevant here, but should be treated as a **research hypothesis**, not an implementation commitment. The decision-worthy question is:

> Does Open Scaffold need a tamper-evident event graph for task/run/evidence/protocol evolution, and if yes, should that graph be a lightweight repo-native hash chain, a DAG/hashgraph-style structure, signed receipts, or integration with an external ledger?

This is the clearest strategic reason to keep the native runtime option alive: a compliance-grade runtime may need to own enough execution and event capture to make proof, replay, and governed evolution trustworthy. That is a different product from a thin `osc spawn` wrapper.

## Comparative matrix

| Framework | Category | Relevance | No-spawn core | Thin `osc spawn` | Adapter packages | Sibling runtime | Key lesson | Red flag |
|---|---|---:|---:|---:|---:|---:|---|---|
| Oh My Codex / OMX | Codex-specific CLI harness + native runtime + evidence layer | High | 4 | 3 | 3 | 4 | Runtime authority, dispatch backlog, replay, readiness, CLI-first MCP taxonomy, normalized lifecycle events | Codex/tmux coupling, default-on branded commit guard, `--madmax` ergonomics, scope sprawl |
| Oh My ClaudeCode / OMC | Claude Code orchestration/governance layer with skills, hooks, MCP, team spawning | High | 4 | 5 | 5 | Low/avoid near-term | A thin layer rapidly becomes hooks + skills + state + tmux + orphan cleanup; adapter packages fit better than core spawning | Claude Code hook coupling, no OS-level isolation, large bundled CLI surface, no first-class human gate |
| Oh My OpenAgent / OmO | OpenCode plugin + multi-model agent/team harness | Medium-high | 4 | 3 | 4 | 2 | Powerful coordination can live above someone else's runtime; hashline/edit-safety patterns are useful without dependency | SUL-1.0 license, OpenCode coupling, default telemetry, no durable audit trail, anti-HITL product posture |
| OmO v4 hashing deep dive | Content-anchor/edit-safety mechanism | High for evidence model, low for spawning | 5 | 2 | 2 | 2 | Cross-runtime deterministic line/content anchors can improve `.osc` evidence identity and drift checks | Hash size/encoding too narrow for durable audit, young/churning release line, no standalone library |
| Get Shit Done / GSD | Spec-driven workflow harness over many coding CLIs | High | 4 | 3 | 4 | 3 | Repo-native state + gates + subagent contracts are the value; fail closed when runtime isolation is weak | `--dangerously-skip-permissions` default, financialized branding, single-author velocity, broad installer mutation |
| Ouroboros | Specification-first Agent OS + workflow engine + multi-backend runtime adapter layer | High | 4 | 3 | 5 | 4 | `AgentRuntime` protocol + `SandboxClass` translation is the cleanest adapter precedent | User-global DB conflicts with repo-native truth; spawning is core; MCP/runtime surface is heavy and fast-moving |

## What the reports agree on

### 1. Runtime authority needs a contract before a command

The strongest cross-report pattern is that useful spawning is not just `subprocess.run()`.

Mature systems quickly need:

- runtime backend identity;
- opaque runtime/session handle;
- dispatch receipt;
- stdout/stderr/log capture;
- readiness state and reasons;
- cancellation semantics;
- sandbox/permission translation;
- blocker taxonomy;
- evidence return path;
- human authority and commit/push/merge policy.

OMX calls this in terms of authority, backlog, replay, readiness, and runtime events. Ouroboros expresses it through `AgentRuntime`, `RuntimeHandle`, `RuntimeCapabilities`, and `SandboxClass`. GSD expresses it through gates and per-runtime isolation contracts. Open Scaffold should publish the vendor-neutral version before implementing any real spawner.

OMX `v0.17.0` strengthens this conclusion with a bounded Hermes MCP bridge (`omx mcp-serve hermes`). The bridge lets Hermes-style coordinators list sessions, read status/log tails, read safe artifacts, start sessions, send audited follow-up prompts, and report final coordination without exposing tmux scrollback or raw private state. Its stated boundary is directly aligned with Open Scaffold: the coordinator owns intake, operator Q&A, package shaping, and approval policy; OMX owns planning, execution, review, and local artifact production inside a bounded worktree/session.

### 2. Adapter packages are the least-distorting execution home

OMC, OmO, GSD, and Ouroboros all point toward the same architecture: runtime-specific behavior lives near the runtime.

Open Scaffold core should not know Claude Code hooks, Codex flags, OpenCode plugin state, tmux panes, Anthropic Agent SDK semantics, MCP server quirks, or user-global runtime DB layouts. Adapter packages can own those details while consuming `.osc/runs/<run_id>/run.json` and returning evidence receipts.

Candidate package shape, if pursued later:

```text
@open-scaffold/adapter-claude
@open-scaffold/adapter-codex
@open-scaffold/adapter-opencode
@open-scaffold/adapter-ouroboros
@open-scaffold/adapter-omx
@open-scaffold/adapter-omc
```

Core should define the contract. Adapters should own spawning.

### 3. A thin `osc spawn` is only safe if it stays intentionally boring

A future experimental command could be useful as a local invoker:

```text
osc spawn --adapter fake --run .osc/runs/<run_id>/run.json
osc spawn --adapter local --dry-run --run .osc/runs/<run_id>/run.json
```

But every surveyed mature system demonstrates how quickly "thin" grows:

- OMC adds hooks, skills, team modes, tmux, orphan cleanup, and strict security toggles.
- Ouroboros adds adapters, streaming normalization, runtime handles, cancellation, sandbox translation, MCP, evaluation, and event persistence.
- OMX adds Rust runtime authority, tmux integration, state replay, readiness gates, Lore commit guard, and normalized event feeds.
- GSD adds phase files, gates, SDK dispatch, runtime compatibility rules, and provenance checks.

So if Open Scaffold ships `osc spawn`, its first implementation should be fake/local and receipt-only. No Claude/Codex/OpenCode/Hermes dependencies. No code mutation. No commit authority.

### 4. Evidence identity and edit drift deserve their own follow-up

OmO v4 hashing is not a runtime strategy argument, but it is highly relevant to Open Scaffold's black-box recorder thesis.

Borrow the pattern, not the code:

- deterministic content anchors;
- snapshot-before-mutate;
- validate-before-apply;
- cross-runtime hash reproducibility;
- prompt-friendly short anchors for human/LLM reference;
- wider cryptographic digests for durable receipts.

Open question for a later slice:

> Should `.osc/runs/<run_id>` standardize content-addressing at line, hunk, file, or artifact level — and should it use both a short prompt-friendly hash and a durable cryptographic digest?

### 5. Human authority is the differentiator Open Scaffold should keep

Several frameworks optimize for autonomy and low-friction execution. That is useful, but Open Scaffold's product thesis is stronger if it remains explicit about human/project authority:

- no hidden source of truth;
- no chat/runtime transcript as canonical state;
- no commit/push/merge authority without explicit policy;
- no bypass-permissions defaults;
- no user-global runtime ledger as the only audit record;
- approval gates and evidence receipts are first-class.

This is especially important for regulated or client-facing SDLC.

## Recommended Milestone 16 decision direction

### Near-term decision

Do **not** implement real autonomous spawning in core.

Instead, create a decision/architecture document that defines:

1. **Runtime/adapter contract**
   - `adapter_id`
   - `runtime_backend`
   - `runtime_handle`
   - `run_packet_path`
   - `dispatch_receipt_path`
   - `evidence_paths`
   - `status`
   - `blocker_code`
   - `question_id`, if human input is needed

2. **Sandbox and authority vocabulary**
   - no mutation / read-only
   - edit allowed
   - command allowed
   - network allowed
   - secrets allowed / forbidden
   - commit allowed / forbidden
   - push/merge always forbidden unless explicitly approved

3. **Dispatch receipt schema**
   - what was invoked;
   - by whom / by what command;
   - from which branch/worktree;
   - with which permissions;
   - where logs/evidence live;
   - whether it actually spawned or only dry-ran.

4. **Adapter package boundary**
   - core owns schema and verification;
   - adapters own runtime-specific launch/supervision;
   - adapters return evidence to `.osc` paths;
   - user-global runtime state is forensic unless promoted into repo evidence.

5. **Experimental `osc spawn` guardrails**
   - fake/local adapter first;
   - `--dry-run` / dispatch receipt first;
   - no provider dependency in core;
   - no code mutation in first slice;
   - no default approval bypass;
   - explicit `--allow-experimental-spawn` if any command exists.

### Option assessment

| Option | Recommendation |
|---|---|
| A. Keep core non-spawning | **Adopt as current default.** This protects product clarity and keeps Open Scaffold's repo-native recorder identity clean. |
| B. Thin `osc spawn` | **Defer; prototype only with fake/local adapter and dispatch receipts.** Useful as UX, dangerous as architecture if it silently grows. |
| C. Official adapter packages | **Best long-term execution path.** Define the contract now; implement packages only after the contract is reviewed. |
| D. Sibling Open Scaffold Runtime | **Keep as strategic option, not next slice.** Ouroboros/OMX/GSD show this is real product scope. Open Scaffold needs a sharper differentiator before entering that market. |
| E. No runtime ownership ever | **Do not overcommit.** The boundary is current policy, not sacred dogma. Revisit after adapter contract and fake/local spawn evidence. |

## Concrete next slice

Recommended PR after this research frame:

```text
Branch: docs/runtime-adapter-contract-boundary
Title: docs: define runtime adapter boundary
```

Likely files:

- `docs/SPAWNING_BOUNDARY.md` — new architecture/decision note.
- `docs/RUNTIME_BINDING_CONTRACT.md` — clarify adapter/runtime contract if needed.
- `docs/RUNTIME_STRATEGY_RESEARCH_SYNTHESIS.md` — this synthesis, if kept as public evidence.
- `ROADMAP.md` — only small follow-up wording if the decision changes roadmap phrasing.

Acceptance criteria:

- Written recommendation distinguishes no-spawn, thin spawn, adapter packages, and sibling runtime.
- Adapter/runtime contract vocabulary exists without provider coupling.
- Safety/governance model covers credentials, env allowlists, workspace isolation, process lifecycle, audit logs, commit/push/merge authority, and failure states.
- Any future `osc spawn` is explicitly fake/local/dry-run first.
- Public docs continue to state what exists today versus what is future exploration.

Verification:

```bash
./verify.sh --strict
npm test
npm run build
git diff --check
```

## Evidence caveats

- The worker reports were generated by Claude Code research lanes and are not a substitute for a human architectural decision.
- `oh-my-openagent.md` ended with `REPORT_COMPLETE` and a substantial report, but the Claude process exited with `error_max_turns` after writing it; treat as usable with caveat.
- OMC required a recovery lane because the first lane hit max turns before writing a report.
- Raw reports live under `/tmp`; only curated conclusions should be promoted into tracked docs.

REPORT_COMPLETE
