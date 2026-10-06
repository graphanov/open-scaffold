# Plan: glass-cockpit-event-protocol

## Status

done

## Context

PR #5 shipped the slice-close evidence protocol. The next ROADMAP gap is Milestone 3: make build-in-public and private/team control-room operation a first-class Open Scaffold capability without making Discord, Slack, Telegram, GitHub comments, or any other operator surface canonical truth.

## Goal

Define a runtime-neutral glass-cockpit event protocol so coordinators, runtimes, and humans can publish status, blockers, questions, approvals, evidence receipts, and PR links to any operator surface while keeping repo/task/run/evidence artifacts canonical.

## Constraints / Out of scope

- Do not implement a Discord, Slack, Telegram, webhook, gateway, or bot runtime in Open Scaffold core.
- Do not require Hermes, clawhip, OMC, OMX, Codex, Claude, GitHub, or any one transport.
- Do not make chat messages canonical state; every cockpit event should point back to task/run/question/evidence identifiers when applicable.
- Keep v1 documentation/schema-first. CLI validation or event emission can be a future slice.

## Files to touch

- `docs/GLASS_COCKPIT_PROTOCOL.md` — define modes, event types, required fields, routing rules, and anti-patterns.
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — link cockpit protocol from operator-surface and event-transport sections.
- `docs/TASK_RUN_MODEL.md` — clarify how `question_id`, `thread_id`, and evidence receipts map to cockpit events.
- `docs/SLICE_CLOSE_PROTOCOL.md` — link evidence receipt / approval request / completion report events where relevant.
- `README.md` — add a product-facing pointer in feature list and glossary.
- `ROADMAP.md` — mark Milestone 3 in progress with first public protocol shape.
- `AGENTS.md` and `CLAUDE.md` — paired-view pointer if this becomes a core doc agents should know.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit current operator-surface wording in README, system ontology, task/run model, GitHub workflow, and slice-close protocol | None | A |
| T2 | Draft `docs/GLASS_COCKPIT_PROTOCOL.md` with event types, required fields, modes, routing, and examples | T1 | B |
| T3 | Patch cross-links in README, ROADMAP, system ontology, task/run model, slice-close protocol, and paired agent views | T2 | C |
| T4 | Run verification, check for private/reference-implementation leakage, and prepare PR summary | T3 | D |

### Parallel groups

- **Group A**: T1 prevents duplicate or conflicting cockpit language.
- **Group B**: T2 is the core protocol artifact.
- **Group C**: T3 updates public navigation once the protocol exists.
- **Group D**: T4 validates the slice.

### Dependencies

- T2 depends on T1 so the new protocol extends existing task/run and slice-close terminology.
- T3 depends on T2 so cross-links target a stable document.
- T4 depends on all changed files.

### Delegation notes

- Suitable for docs-first direct-Hermes or a bounded plain-agent run.
- If a runtime harness is used, create a run packet with `spawning: false`; runtime launch remains outside Open Scaffold core.

## Acceptance criteria

- [ ] `docs/GLASS_COCKPIT_PROTOCOL.md` defines event types for nudge, session start/status, blocker, question, answer, approval request, completion report, evidence receipt, PR/release link, and cancellation.
- [ ] The protocol defines private, team, build-in-public, and stakeholder cockpit modes.
- [ ] Every event type names canonical IDs/links it should carry: `task_id`, `run_id`, optional `question_id`, plan/spec path, evidence path, PR/issue/release link.
- [ ] The protocol clearly separates event/session transport from planning, execution, task truth, and evidence truth.
- [ ] Public docs keep Discord/Slack/Telegram/GitHub comments as examples, not required infrastructure.
- [ ] Cross-links connect the cockpit protocol to task/run identity, slice close, runtime dispatch, GitHub workflow, and system ontology.
- [ ] Verification passes and no private reference-implementation machinery leaks into core.

## Verification steps

1. Run `./verify.sh --standard`; expected result: all checks pass.
2. Run `npm run osc -- verify`; expected result: compliance passes.
3. Run `npm test`; expected result: all tests pass.
4. Run `npm run build`; expected result: build passes.
5. Run `git diff --check`; expected result: no whitespace errors.
6. Search changed files for private paths, secrets, and single-operator requirements; expected result: no hits.

## Open questions

- Should a future slice add JSON schema for cockpit events, or keep v1 markdown/YAML-only?
- Should GitHub PR comments be treated as an operator surface event stream or primarily as publication/review evidence?
- How much build-in-public language belongs in core versus examples/templates?
