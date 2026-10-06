# Plan: slice-close-evidence-loop

## Status

done

## Context

PR #4 productized the runtime-harness dispatch boundary: Open Scaffold packages work, coordinators dispatch, harnesses execute, operator surfaces observe, and evidence proves. The next product gap is the closed-loop evidence protocol from ROADMAP Milestone 2: how a semi-autonomous slice is judged closed, how weak approvals are distinguished from strong product acceptance, and how corrections carry into the next slice without private chat or Command Center context.

## Goal

Define a runtime-neutral slice-close and evidence loop so any Open Scaffold repo can prove what happened in a task/run, record approval quality, and generate the next slice from durable evidence rather than vanished chat context.

## Constraints / Out of scope

- Do not spawn agents, run harnesses, or add any private reference-implementation machinery to Open Scaffold core.
- Do not make a chat thread, runtime transcript, or private implementation run ledger canonical truth.
- Do not require one task system; GitHub Issues, Hermes Kanban, Linear/Jira, local queues, and manual operation must all fit.
- Keep the first slice documentation/schema-first; CLI helpers are allowed only if they write/validate repo-local artifacts without dispatching runtimes.

## Files to touch

- `ROADMAP.md` — mark Milestone 2 status and connect it to the task/run dispatch work from Milestone 4.
- `docs/SLICE_CLOSE_PROTOCOL.md` — define slice states, evidence receipt format, approval-strength taxonomy, correction routing, and next-slice inheritance.
- `docs/TASK_RUN_MODEL.md` — link run lifecycle states to slice close / postflight / evidence receipt concepts.
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — place slice close in the ontology without promoting a coordinator or cockpit to source of truth.
- `README.md` — add a concise product-facing pointer to the closed-loop protocol.
- `.osc/plans/active/001-generic-osc-core-amendment-5.md` or a follow-up active plan — only if execution reveals this changes the existing core plan scope; otherwise keep this as the standalone slice plan.
- `src/` and `tests/` — optional, only for a minimal `osc` validation/report helper that remains non-spawning.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit existing README/docs/CLI run schema for current lifecycle/evidence language | None | A |
| T2 | Draft `docs/SLICE_CLOSE_PROTOCOL.md` with slice states, evidence receipt schema, approval taxonomy, and correction routing | T1 | B |
| T3 | Patch roadmap/system/task-run docs to point at the protocol and preserve layer boundaries | T2 | C |
| T4 | Optional: add a minimal non-spawning `osc` helper or schema fixture for postflight/evidence validation | T2 | C |
| T5 | Run verification, check for private reference-implementation leakage, and prepare PR body with Codex review status field | T3, T4 | D |

### Parallel groups

- **Group A**: T1 establishes current language and prevents duplicate concepts.
- **Group B**: T2 is the core product design artifact.
- **Group C**: T3 and optional T4 can proceed once the protocol shape is stable.
- **Group D**: T5 validates public runtime-neutral boundaries and repo health.

### Dependencies

- T2 depends on T1 so the protocol extends, rather than rewrites, the current task/run model.
- T3 and T4 depend on T2 because docs and optional helpers should cite a stable protocol.
- T5 depends on all changed docs/code.

### Delegation notes

- Suitable for bounded docs-first execution by a plain agent, Claude Code, Codex, OMC, or OMX, but the Open Scaffold core output remains files/schema/checks only.
- If a harness is used, generate a run packet with `spawning: false`; the coordinator/adapter owns actual launch and evidence promotion.

## Acceptance criteria

- [ ] `docs/SLICE_CLOSE_PROTOCOL.md` defines a clear public protocol for slice close, postflight, evidence receipt, approval strength, correction routing, and next-slice inheritance.
- [ ] The protocol distinguishes strong product approval, weak-positive/procedural approval, rejection, and blocked/needs-human states.
- [ ] The protocol maps outcomes to durable artifact destinations: plan amendment, evidence receipt, roadmap update, issue/task comment, PR/release note, or next-slice plan.
- [ ] Public docs preserve Open Scaffold's boundary: core packages and validates; coordinators track/dispatch; harnesses execute; operator surfaces observe; GitHub publishes; evidence proves.
- [ ] No text requires Hermes Kanban, a private Command Center-style reference implementation, Discord, OMC, OMX, Codex, or Claude as mandatory infrastructure.
- [ ] If any CLI code is added, tests prove it writes/validates artifacts only and never spawns a runtime.
- [ ] The PR body links roadmap item, plan, task/run identity if used, verification, Codex review status, and evidence paths.

## Verification steps

1. Run `npm test` if TypeScript or CLI files change; expected result: all tests pass.
2. Run `npm run build` if TypeScript or CLI files change; expected result: build passes.
3. Run `npm run osc -- verify`; expected result: Open Scaffold compliance passes.
4. Run `./verify.sh --standard`; expected result: standard checks pass.
5. Run `git diff --check`; expected result: no whitespace errors.
6. Search changed files for private leakage terms/paths such as user-local absolute paths, private run IDs, tokens, and single-operator setup claims; expected result: no private machinery embedded in core docs.

## Open questions

- Should the first implementation include only docs/schema, or also a tiny `osc postflight` / `osc evidence` validator?
- Should slice-close evidence live under `.osc/runs/<run_id>/postflight.md`, `.osc/runs/<run_id>/evidence.json`, `docs/evidence/`, or allow all three with clear ownership?
- What minimum approval taxonomy is enough for v1 without overbuilding a workflow engine?
