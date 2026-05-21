# Plan: 031-agentic-orchestration-model-lab-vision

## Status

done

## Context

The owner is exploring a broader Open Scaffold vision: not merely selecting one agent runtime, but orchestrating multiple AI models/runtimes/skills in tandem, supporting closed evolutionary loops, and eventually maintaining a research-backed map of which models are good for which tasks.

This would shift Open Scaffold from a repo-native evidence protocol toward an agentic orchestration and model-evaluation layer. That may be strategically valuable, but it risks collapsing boundaries between scaffold protocol, runtime orchestration, benchmark lab, and execution supervision.

## Goal

Determine whether agentic orchestration, closed evolutionary loops, and model/task recommendation should become part of the Open Scaffold roadmap, and at which layer: public vision, adapter contract, optional lab package, external runtime, or deferred research.

## Constraints / Out of scope

- Do not make Open Scaffold core responsible for model benchmarking, model routing, or multi-agent spawning by drift.
- Do not claim model-task recommendations without reproducible evaluation evidence.
- Do not require local models, paid APIs, private runtimes, or owner-specific infrastructure.
- Do not add `osc init` model/runtime orchestration UX without adapter/conformance evidence and explicit owner approval.
- Keep private owner context and unpublished runtime claims out of public docs.
- Do not edit `MISSION.md` or `ROADMAP.md` until the research verdict and owner gate decide whether this is public roadmap material.

## Files to touch

Potential files after research verdict:

- `docs/wiki/concepts/agentic-orchestration.md` — public-safe contested concept page.
- `docs/wiki/concepts/model-task-fit.md` — if model recommendation becomes a durable concept.
- `docs/RUNTIME_BINDING_CONTRACT.md` — only if orchestration remains a contract-level extension, not core execution.
- `docs/SPAWNING_BOUNDARY.md` — only if the boundary needs clarification.
- `ROADMAP.md` — only after owner approval to promote a scoped version.
- future adapter/lab package docs — only after evidence.

## Acceptance criteria

- [ ] Three independent read-only reviews evaluate agentic orchestration/model-lab/closed-loop fit from different lenses.
- [ ] Reports are compared against the prior runtime-selection sparring reports from `.osc/runs/20260515T125857-v1-runtime-choice-sparring/`.
- [ ] A Hermes synthesis distinguishes: orchestration contract, runtime execution, model evaluation lab, and native runtime ownership.
- [ ] Any public-facing wording frames this as contested hypothesis unless owner approves promotion.
- [ ] Recommendation includes whether this belongs in V1, V1.x, V2, or separate sibling product/package.

## Verification steps

1. Confirm all review reports end with `REPORT_COMPLETE` or document evidence-quality caveats.
2. Run `./verify.sh --standard`; expected exit 0 before any docs PR claims completion.
3. Run `git diff --check`; expected no whitespace errors.
4. Confirm public-facing wording avoids unsupported model-performance or runtime-support claims.

## Open questions

- Is Open Scaffold trying to be an orchestration protocol, an orchestration runtime, a model-evaluation lab, or a substrate that external labs/runtimes plug into?
- Can closed evolutionary loops be expressed as run/evidence/evaluation contracts without Open Scaffold owning the runtime loop?
- What is the smallest credible model-task recommendation artifact: curated doctrine, benchmark harness, eval registry, adapter metadata, or external research notes?
- Does this vision strengthen the runtime-neutral moat or dilute it into a generic agent platform?
