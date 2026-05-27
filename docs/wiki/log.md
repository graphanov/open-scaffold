# Open Scaffold Project Wiki Log
> Chronological record of project wiki actions. Append-only.
> Format: `## [YYYY-MM-DD] action | subject`

## [2026-05-21] decide | Agentic orchestration model-lab hypothesis
- Closed `031-agentic-orchestration-model-lab-vision` against the existing three-lane orchestration sparring evidence and runtime-selection comparison corpus.
- Added `docs/wiki/concepts/model-task-fit.md` to preserve the model/task-fit idea as a contested lab-layer hypothesis, not an Open Scaffold core routing promise.
- Preserved the current stance: orchestration is expressible by contract, model/task observations require reproducible lab evidence, and core remains the source-of-truth substrate.

## [2026-05-21] implement | Evolution loop contract
- Added `docs/EVOLUTION_LOOP.md` and `osc evolve init|record|check` as a contract-first attempt/frontier ledger for multi-attempt improvement loops.
- Clarified that the OMX-based agentic runtime/engine path can execute attempts externally while Open Scaffold core records plans, run packets, evaluations, audit/evolution state, and approval boundaries.

## [2026-05-20] reconcile | Agent runtime selection vision
- Closed `030-agent-runtime-selection-vision` against existing three-lane sparring evidence and public runtime-profile/adapter documentation.
- Preserved the v1 stance: no `osc init --runtime` picker; runtime choice stays in run packets, runtime profiles, adapter receipts, and explicit agentic runtime packages.
- Left package publication, GitHub Release updates, and native-runtime claims behind owner gates.

## [2026-05-18] implement | OMX $ralplan explicit launch gate
- Extended `packages/runtime-omx/` from no-spawn receipt writing to an explicit `--allow-spawn` `$ralplan` launch path.
- Kept Open Scaffold core non-spawning; the package checks branch/worktree safety and `oh-my-codex >= 0.17.3`, requests Codex `--sandbox read-only`, and records receipts/logs/evidence under `.osc/runs/<run_id>/`.
- Still excludes commit, push, merge, publish, credential-management, runtime certification, and broader OMX workflow support.

## [2026-05-18] implement | OMX runtime package no-spawn scaffold
- Added `packages/runtime-omx/` as the first no-spawn agentic runtime package scaffold.
- It validates Open Scaffold `run.json` packets for OMX `$ralplan` and writes deterministic dispatch receipt/evidence artifacts without launching OMX/Codex.
- Preserved the boundary that real runtime launch remains future explicit-opt-in work.

## [2026-05-18] decide | Executable Open Scaffold architecture
- Captured executable Open Scaffold as explicit in-repo agentic runtime packages, not hidden core spawning.
- Set `packages/runtime-omx/` as the first package boundary and `$ralplan` as the first OMX / oh-my-codex workflow to prove.
- Updated runtime-selection and orchestration concept pages while keeping init-time runtime picker, runtime certification, and native orchestration claims out of scope.

## [2026-05-17] implement | Audit envelope digest manifest
- Added `osc audit init` / `osc audit check` as the first JSON-backed audit-envelope digest-manifest mechanics.
- Kept the command local and structure-only: no domain correctness judgment, compliance certification, approval decision, model benchmarking, runtime spawning, or external anchoring.

## [2026-05-17] implement | Evaluation envelope CLI
- Added `osc eval init` / `osc eval check` as the first JSON-backed evaluation-envelope mechanics.
- Kept the command structure-only: no domain correctness judgment, compliance certification, model benchmarking, runtime spawning, or external anchoring.

## [2026-05-17] amend | Implementation architecture envelopes
- Expanded `docs/wiki/concepts/implementation-architecture-lens.md` with audit envelope, evaluation envelope, closed evaluation loop, and feedback-based improvement direction.
- Cross-linked the direction to slice-close and runtime-binding boundaries without adding runtime spawning, compliance certification, or model-benchmarking claims.

## [2026-05-17] capture | Implementation architecture lens
- Added `docs/wiki/concepts/implementation-architecture-lens.md` to map Open Scaffold's build-time primitives to workflow design, data access, authority, evaluation, audit trails, and recovery/ownership.
- Updated `docs/wiki/index.md` so the new concept is discoverable without adding live task, PR, or release state to the wiki.

## [2026-05-15] preserve | Runtime and orchestration sparring synthesis
- Added `docs/wiki/summaries/runtime-orchestration-sparring-synthesis.md` to preserve durable findings from the runtime-selection and agentic-orchestration sparring reviews for future product-market verification.
- Added `.osc/plans/backlog/032-adapter-conformance-fixture.md` as the recommended next implementation track after the capture PR: fake/local adapter plus conformance fixture before runtime picker, orchestration, or model-lab surfaces.

## [2026-05-15] capture | Agentic orchestration hypothesis
- Added `docs/wiki/concepts/agentic-orchestration.md` as a contested public-safe concept page for multi-model orchestration, closed evolutionary loops, and model/task-fit research.
- Added `.osc/plans/backlog/031-agentic-orchestration-model-lab-vision.md` to hold the research question behind evidence and owner approval before any roadmap/runtime expansion.

## [2026-05-15] capture | Agent runtime selection hypothesis
- Added `docs/wiki/concepts/agent-runtime-selection.md` as a contested public-safe concept page for the idea that scaffold tier selection may eventually pair with runtime lane selection.
- Added initial plan `030-agent-runtime-selection-vision` to keep the vision behind research, evidence, and owner approval before any runtime-spawning scope change. It is now closed at `.osc/plans/done/030-agent-runtime-selection-vision.md`.

## [2026-05-15] create | Project wiki knowledge seed
- Added a curated seed pack of 12 public-safe pages across concepts, comparisons, and reusable query answers.
- Added durable concepts for source-of-truth-first development, repo-native work records, agent resumability, evidence-first development, human-in-the-loop governance, glass cockpit, run packets, and scaffold tiers.
- Added comparison pages for Open Scaffold versus agent memory and README-driven development.
- Added query pages for what Open Scaffold is for and what agents should read first.
- Updated `docs/wiki/index.md` to list all seed pages.

## [2026-05-15] create | Project wiki initialized
- Created `docs/wiki/SCHEMA.md`, `index.md`, and `log.md`.
- Created `_meta/owner-context.md` and `concepts/body-of-work-wiki.md` as initial boundary pages.
- Established public wording rule: use owner-neutral language in open-source artifacts.
