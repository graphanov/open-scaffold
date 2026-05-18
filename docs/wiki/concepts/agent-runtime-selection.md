---
title: Agent Runtime Selection
created: 2026-05-15
updated: 2026-05-18
type: concept
tags: [open-scaffold, runtime, agent-orchestration, product-vision]
sources: [MISSION.md, ROADMAP.md, docs/RUNTIME_BINDING_CONTRACT.md, docs/SPAWNING_BOUNDARY.md, docs/AGENTIC_RUNTIME_LAYER.md, packages/runtime-omx/README.md, .osc/plans/backlog/030-agent-runtime-selection-vision.md, .osc/plans/done/042-reference-adapter-package-no-spawn.md, .osc/plans/done/046-executable-open-scaffold-architecture.md]
confidence: medium
contested: partially
---

# Agent Runtime Selection

Agent runtime selection is the product direction that an Open Scaffold user should eventually choose not only a scaffold tier, but also the runtime lane that will execute work against the scaffold.

The tier answers: "how much durable project structure do I want?"

The runtime selection answers: "what execution system should consume the plan/run/evidence contract?"

Potential runtime lanes include:

- a human terminal;
- a coding-agent CLI;
- an external workflow harness;
- a spec-driven agent framework;
- a future Open Scaffold-native runtime.

## Why it fits the body of work

Open Scaffold already separates durable repo truth from live execution. That separation creates a natural seam for runtime choice:

1. The repository stores mission, roadmap, plans, run packets, evidence, and gates.
2. A runtime lane consumes a bounded package of work.
3. The runtime returns status, artifacts, blockers, and evidence.
4. Human approval decides whether the slice closes.

If this seam is made explicit, Open Scaffold can stay runtime-neutral while becoming more useful as the integration layer between repo-native discipline and the fast-changing agent-runtime market.

## The hard boundary

Runtime selection is not the same as runtime ownership.

A safe v1-compatible version can define:

- runtime profile metadata;
- adapter expectations;
- dispatch receipts;
- evidence-return contracts;
- human-gate requirements;
- smoke tests that prove a runtime lane does not become hidden source of truth.

A riskier version would add:

- process spawning;
- credentials;
- long-running supervision;
- native task queues;
- automatic commit/push/merge behavior;
- provider-specific execution semantics.

Those belong behind explicit design decisions, safety analysis, and separate implementation plans.

## Accepted executable direction

As of 2026-05-18, the owner accepted that Open Scaffold should become executable through explicit in-repo agentic runtime packages while preserving the core evidence/audit boundary.

The first track is:

```text
packages/runtime-omx/
runtime target: OMX / oh-my-codex
first workflow: $ralplan
```

This does not mean Open Scaffold core becomes a hidden runtime launcher. Core still creates the run packet and evidence expectations. The OMX package validates the `$ralplan` handoff shape and writes receipt/evidence by default without spawning; explicit launch lives behind package-level `--allow-spawn` checks for branch, worktree, and OMX version.

Later OMX workflows such as `$deep-interview`, `$ralph`, `$ultrawork`, and `$ultragoal` are support goals after `$ralplan` and the package boundary are proven.

## Open question for V1

The live product question is whether runtime choice should become:

1. a v1 release promise;
2. a v1 public extension point with no built-in spawning;
3. a v1.1/v2 implementation track;
4. a long-term native-runtime research direction.

## Current scaffold stance

As of 2026-05-18, runtime selection in `osc init` is still not a v1 release promise. Open Scaffold core remains runtime-neutral by design; executable behavior starts in explicit agentic runtime packages that consume the existing run packet and binding contract.

This page records the direction so it can be tested through evidence instead of lost in chat. It should not be read as a commitment to ship an init-time runtime picker, certify third-party runtimes, or make Open Scaffold core responsible for hidden spawning.

The strongest version of the idea is not "Open Scaffold runs every agent." It is:

> Open Scaffold gives every agent runtime the same source-of-truth-first contract for planning, execution, evidence, and handback.

Related: [[run-packets]], [[repo-native-agent-operating-system]], [[source-of-truth-first-development]], [[human-in-the-loop-governance]], [[scaffold-tiers]].
