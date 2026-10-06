<!-- PAIRED VIEW: this file and CLAUDE.md carry the same project facts in formats each tool reads natively. Edits here MUST be mirrored in CLAUDE.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# Agent Instructions

This is the [open-scaffold](https://github.com/graphanov/open-scaffold) product repository: a repo-native work-record CLI/protocol for AI-assisted work that keeps mission, plans, run records, evidence, feedback, and lessons in git-tracked files. The repo dogfoods its own protocol.

## Layered architecture

Open Scaffold core owns the repo-native work record, handoff packets, review/gate judgments, evidence, and close protocol. External agents, runtime harnesses, coordinators, and humans do the execution work and promote observed facts back into the record. A `run.json` packet is a handoff package, not spawn authority. Full ontology: `docs/OPEN_SCAFFOLD_SYSTEM.md`; identity model: `docs/TASK_RUN_MODEL.md`; GitHub traceability: `docs/GITHUB_WORKFLOW.md`.

## Open Scaffold protocol

1. Before any work, run `osc handoff` (source checkout alias: `npm run osc -- resume`) and follow the packet: it states the goal, acceptance criteria, and next bounded action.
2. Prefer CLI helpers for record structure, then supported shell helpers. Manual fallback is permitted only when neither is available: follow `.osc/plans/README.md`, preserve schemas and changelog linkage, and validate before continuing. Fill generated TODOs before committing.
3. New work: `osc plan new <slug> --stage active`; clarify fuzzy intent in the operator surface or an external runtime, then promote the result into the plan.
4. Scope change: `osc amend <slug> --message "what changed"`. Committed intent is immutable: goal, scope, and acceptance-criterion wording change only through amendments. Factual checkbox completion, the reserved ` | Evidence: <reference-only-list>` suffix on criteria, and valid `## Status` stage values may record progress without rewriting requirements.
5. Bounded execution: use the plan or `osc run <plan-path>` package with the external worker/runtime/coordinator; Open Scaffold core does not spawn the worker.
6. Review/gate recorded attempts with `osc review` (or synonym `osc analyze`) and `osc gate`; the worker does not self-authorize retries.
7. Evidence before done: `osc evidence new <slug>`, then `osc verify` and `./verify.sh --strict`.
8. Close: `osc close <slug> --message "what shipped"`.
9. Failures become feedback with a repair hypothesis; retry from recorded facts instead of looping blind.
10. Chat is working context, not truth. If it matters, it goes in a repo file.
11. Compliance gate: run `./verify.sh --quick --quiet` before non-trivial changes; on a non-zero exit, stop and fix the mission or plan first.
## Compliance check behavior

On exit 0 of the compliance gate, proceed silently. On exit 1, hard-block on the first failing check: if the mission is undefined (`<!-- mission:unset -->` or `TODO: define mission` present), help the user define it before anything else; if the mission is defined but no plan exists, create one with the user before implementation. The user can always override explicitly. Without shell access, check those two conditions by reading `MISSION.md` and `.osc/plans/` directly.

## Working on open-scaffold itself

- `MISSION.md` — goals, non-goals, and a changelog of every scope pivot. `ROADMAP.md` — milestones and the self-dogfood chain.
- `.osc/plans/` — immutable plans in stage folders (`active/`, `backlog/`, `done/`, `blocked/`; the folder IS the status). Schema lives in `.osc/plans/handoff-template.md`, movement rules in `.osc/plans/WORKFLOW.md`, quick rules in `.osc/RULES.md` — re-read before structural changes.
- Amendment flow (the "I got smarter" case): clarify what changed and why, run `osc amend <slug> --message "..."`, fill the generated `TODO:` sections before committing, and review the diff. Preserve parent intent. CLI bookkeeping is preferred; supported shell and documented manual fallbacks follow the policy above.
- `.osc-dev/` (gitignored, owner-only) holds full ADRs and internal plans. Read `.osc-dev/decisions/` before proposing architectural changes — re-deriving a rejected decision wastes a session. Search tools skip gitignored paths by default; include `.osc-dev/` explicitly.
- Plans with an `## Execution strategy` section advertise parallel groups: propose external-runtime delegation or separate sessions, warn when parallel tasks share files, and bind execution to a plan/run package instead of treating the chat thread as canonical state.
- Verification floor: `./verify.sh --strict`, `npm run build`, `npm test`. Public PRs cite the plan, evidence note, verification commands, and owner gates. Humans own merge, publish, and release.
- Key docs: `docs/OPEN_SCAFFOLD_SYSTEM.md` (ontology), `docs/HARNESS_ARCHITECTURE.md` (kept architecture and retired layers), `docs/STABILITY.md` (maturity contract and honest limits), `docs/WORKFLOW.md` (phase-to-tool cheat sheet).
