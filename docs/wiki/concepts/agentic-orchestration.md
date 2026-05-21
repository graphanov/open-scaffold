---
title: Agentic Orchestration
created: 2026-05-15
updated: 2026-05-21
type: concept
tags: [open-scaffold, agent-orchestration, model-routing, evolutionary-loops]
sources: [MISSION.md, ROADMAP.md, docs/RUNTIME_BINDING_CONTRACT.md, docs/SPAWNING_BOUNDARY.md, docs/AGENTIC_RUNTIME_LAYER.md, docs/EVOLUTION_LOOP.md, .osc/plans/backlog/031-agentic-orchestration-model-lab-vision.md, .osc/plans/done/087-closed-evolution-loop-contract.md, .osc/plans/done/046-executable-open-scaffold-architecture.md]
confidence: low
contested: true
---

# Agentic Orchestration

Agentic orchestration is the hypothesis that Open Scaffold could eventually help coordinate multiple AI models, runtimes, skills, and evaluation loops rather than treating execution as a single chosen lane.

The vision includes:

- multiple models working in tandem on different tasks;
- closed evolutionary loops for planning, execution, evaluation, correction, and retry;
- model/task-fit guidance based on observed evidence;
- runtime lanes that consume Open Scaffold plans and return comparable evidence;
- possible future lab-style evaluation of which models are best for which work classes.

## Why it is attractive

Open Scaffold already treats durable truth, evidence, plans, run packets, and human gates as first-class. Those primitives can support orchestration because each runtime attempt can be bounded, evaluated, compared, and handed back.

A strong version of the idea would let a project ask:

- Which model should draft the plan?
- Which model should implement?
- Which model should review?
- Which evaluator should judge acceptance criteria?
- What evidence says this routing pattern works?

## The boundary risk

Agentic orchestration can mean several different things:

1. **Orchestration contract** — Open Scaffold core defines packages, evidence, roles, and gates that any coordinator can use.
2. **Orchestration runtime** — an external coordinator or adapter dispatches multiple lanes, manages worktrees, and handles process supervision.
3. **Model evaluation lab** — a separate research/evaluation layer runs reproducible benchmarks and records model/task-fit observations.
4. **Native Open Scaffold runtime** — Open Scaffold itself spawns, supervises, routes, and evaluates agents.

These are not the same product layer.

The safe near-term version is contract-first: define how orchestration evidence should be represented without making Open Scaffold core responsible for spawning agents, routing models, publishing benchmarks, or certifying model quality.

## Current scaffold stance

As of 2026-05-15, agentic orchestration is a contested product hypothesis, not a v1 release promise.

- **Slice-level closed loop:** already shipped through the scaffold's existing slice-close loop: slice → evidence → postflight → amendment/correction → next slice.
- **Multi-attempt evolution contract:** now concrete through `docs/EVOLUTION_LOOP.md` and `osc evolve init|record|check`: plan/run attempts can be journaled, evaluated, and promoted to a frontier without core spawning.
- **OMX-based agentic runtime path:** the preferred serious runtime-engine investment path is explicit packages/adapters around OMX / oh-my-codex, with Open Scaffold core preserving contracts/evidence and `packages/runtime-omx/` owning OMX-specific execution mechanics.
- **Multi-agent orchestration as contract:** possible V1.x research direction after adapter conformance evidence exists.
- **Model evaluation lab and model/task-fit map:** not Open Scaffold core; possible sibling product or community-maintained reference if evidence and demand justify it.
- **Native multi-agent runtime:** explicitly deferred; reopen only with a proofability, auditability, or governed-execution driver.

Open Scaffold core stays runtime-neutral and orchestration-neutral. Multi-lane orchestration may be performed by an external coordinator using the existing run packet, evidence receipt, and slice-close contracts. The scaffold provides the evidence substrate, not the orchestrator and not the lab.

The accepted executable track does not change this boundary. `packages/runtime-omx/` is the first agentic runtime package target for OMX / oh-my-codex, starting with `$ralplan`, and the evolution-loop contract gives that engine path a durable attempt/frontier ledger. It is still not a full multi-agent orchestration layer, model router, or native Open Scaffold runtime.

## Not the same as the scaffold's existing evolutionary loop

Open Scaffold's existing closed evolutionary loop is the human-gated slice-close loop described in `docs/SLICE_CLOSE_PROTOCOL.md`: slice → evidence → postflight → amendment/correction → next slice.

Multi-agent orchestration loops, evaluator-graded routing, and model/task-fit maps are a different hypothesis at the coordinator or lab layer. They are not part of the shipped scaffold loop and should not be treated as a v1 commitment.

The strongest version of the idea is:

> Open Scaffold should make multi-model work inspectable, comparable, and resumable through contract and evidence — not by running, routing, or rating the models.

The concrete near-term product path is narrower: `osc evolve` records attempts/frontiers, while OMX-based runtime packages can become the serious execution engine layer that consumes Open Scaffold run packets and returns evidence.

Related: [[agent-runtime-selection]], [[run-packets]], [[evidence-first-development]], [[human-in-the-loop-governance]], [[source-of-truth-first-development]].
