# Plan: runtime-binding-contract

## Status

done

## Context

PR #4 documented the runtime harness dispatch pattern, PR #5 defined slice close evidence, and PR #6 defined glass cockpit events. The next ROADMAP gap is Milestone 5: define how a coordinator or runtime-specific binding consumes `.osc/runs/<run_id>/run.json`, launches OMC/OMX/plain-agent/human lanes outside core, attaches runtime state back to the run, and returns evidence without making Open Scaffold core spawn agents.

## Goal

Define a generic runtime binding contract and OMC/OMX/plain-agent examples so harness integrations can launch bounded Open Scaffold run packages while preserving the non-spawning core boundary and durable evidence chain.

## Constraints / Out of scope

- Do not implement actual agent spawning in Open Scaffold core.
- Do not add OMC/OMX auth, tmux, hooks, updater, or session-control code to generic core.
- Do not require OMC, OMX, Claude, Codex, Hermes, Discord, or GitHub as mandatory infrastructure.
- Keep v1 documentation/schema-first. Code/CLI launcher helpers can be future adapter-owned work.
- Keep OMC/OMX described as runtime harness lanes, not universal orchestrators or task truth.

## Files to touch

- `docs/RUNTIME_BINDING_CONTRACT.md` — define binding lifecycle, package validation, launch responsibilities, runtime metadata attachment, failure taxonomy, evidence return, and examples.
- `docs/RUNTIME_HARNESS_DISPATCH.md` — link dispatch pattern to the binding contract.
- `docs/ADAPTERS.md` — clarify OMC/OMX/plain-agent binding responsibilities.
- `docs/TASK_RUN_MODEL.md` — clarify runtime binding fields and lifecycle outcomes.
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — link binding contract from runtime harness and coordinator sections.
- `README.md` — add a product-facing pointer.
- `ROADMAP.md` — mark Milestone 5 in progress and name first public contract shape.
- `AGENTS.md` / `CLAUDE.md` — paired-view pointer if this becomes core context.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit runtime-related docs for current dispatch/binding terminology | None | A |
| T2 | Draft `docs/RUNTIME_BINDING_CONTRACT.md` with lifecycle, responsibilities, failure taxonomy, and examples | T1 | B |
| T3 | Patch cross-links in README, ROADMAP, ADAPTERS, RUNTIME_HARNESS_DISPATCH, TASK_RUN_MODEL, OPEN_SCAFFOLD_SYSTEM, AGENTS, and CLAUDE | T2 | C |
| T4 | Run verification, check for private/reference-implementation leakage, and prepare PR summary | T3 | D |

### Parallel groups

- **Group A**: T1 prevents ontology drift and duplicate dispatch language.
- **Group B**: T2 creates the core protocol artifact.
- **Group C**: T3 updates navigation and milestone status.
- **Group D**: T4 validates the slice.

### Dependencies

- T2 depends on T1 so the contract extends current dispatch docs.
- T3 depends on T2 so links point to stable sections.
- T4 depends on all changed files.

### Delegation notes

- Suitable for docs-first direct-Hermes or bounded plain-agent work.
- If a runtime harness is used to draft/review it, create an Open Scaffold run packet with `spawning: false`; the harness launch remains outside core.

## Acceptance criteria

- [ ] `docs/RUNTIME_BINDING_CONTRACT.md` defines a generic binding lifecycle from `run.json` validation through launch, runtime metadata attachment, completion, evidence return, and postflight.
- [ ] The contract defines required binding responsibilities and explicitly excludes core-owned spawning/runtime auth/session control.
- [ ] The contract includes a failure-state taxonomy covering package not executable, unsupported lane, prompt rejected, session blocked, artifact missing, verification failed, human input needed, and cancelled.
- [ ] The contract includes OMC, OMX, plain-agent, and human-lane examples without requiring any of them.
- [ ] Public docs preserve the ontology: coordinators/task bridges decide and track; runtime harnesses execute; operator surfaces observe; evidence proves; GitHub publishes.
- [ ] Cross-links connect runtime binding to task/run identity, runtime dispatch, slice close, cockpit events, GitHub workflow, and system ontology.
- [ ] Verification passes and no private reference-implementation machinery leaks into core.

## Verification steps

1. Run `./verify.sh --standard`; expected result: all checks pass.
2. Run `npm run osc -- verify`; expected result: compliance passes.
3. Run `npm test`; expected result: all tests pass.
4. Run `npm run build`; expected result: build passes.
5. Run `git diff --check`; expected result: no whitespace errors.
6. Search changed files for private paths, secrets, and single-runtime requirements; expected result: no hits.

## Open questions

- Should a future adapter repo own executable examples for `osc-omc handoff` / `osc-omx handoff`, or should generic core keep only pseudo-command examples?
- Should runtime binding outcomes be represented as a future JSON schema, or remain markdown/YAML examples for now?
- Should unsupported/failed binding states create a new run, mutate current run status, or both?
