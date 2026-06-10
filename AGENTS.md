<!-- PAIRED VIEW: this file and CLAUDE.md carry the same project facts in formats each tool reads natively. Edits here MUST be mirrored in CLAUDE.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# Agent Instructions

This is the [open-scaffold](https://github.com/graphanov/open-scaffold) product repository: a harness for AI-assisted work that keeps the whole work record — mission, plans, run records, evidence, feedback, lessons — in git-tracked files. The repo dogfoods its own protocol.

## Layered architecture

The **harness** (this product) owns the loop: clarify, plan, package, gate, dispatch through explicit adapters, and record. **Runtime adapters** translate run packages for Claude Code, Codex, OMC/OMX, shells, or humans and return receipts. **The work record** (`.osc/`, `MISSION.md`, `ROADMAP.md`) is the substrate every layer reads and writes. Full ontology: `docs/OPEN_SCAFFOLD_SYSTEM.md`; identity model: `docs/TASK_RUN_MODEL.md`; GitHub traceability: `docs/GITHUB_WORKFLOW.md`.

## Open Scaffold protocol

1. Before any work, run `osc resume` (source checkout: `npm run osc -- resume`) and follow the packet: it states the goal, acceptance criteria, and next bounded action.
2. The CLI writes the files — never hand-write plans, amendments, or evidence skeletons.
3. New work: `osc plan new <slug> --stage active`; clarify fuzzy intent first with `osc harness '$interview "..."'`.
4. Scope change: `osc amend <slug> --message "what changed"`. Committed plans are immutable.
5. Bounded execution: `osc harness '$work "..." --context "..."'`; a runtime spawns only with `--adapter <id> --allow-spawn`.
6. Evidence before done: `osc evidence new <slug>`, then `osc verify` and `./verify.sh --strict`.
7. Close: `osc close <slug> --message "what shipped"`.
8. Failures become feedback with a repair hypothesis; retry with `--retry-of <run-id>` instead of looping blind.
9. Chat is working context, not truth. If it matters, it goes in a repo file.
10. Compliance gate: run `./verify.sh --quick --quiet` before non-trivial changes; on a non-zero exit, stop and fix the mission or plan first.

## Working on open-scaffold itself

- `MISSION.md` — goals, non-goals, and a changelog of every scope pivot. `ROADMAP.md` — milestones and the self-dogfood chain.
- `.osc/plans/` — immutable plans in stage folders (`active/`, `backlog/`, `done/`, `blocked/`; the folder IS the status). Schema lives in `.osc/plans/handoff-template.md`, movement rules in `.osc/plans/WORKFLOW.md`, quick rules in `.osc/RULES.md` — re-read before structural changes.
- Amendment flow (the "I got smarter" case): ask the user what changed and why, summarize it back in their voice, run `osc amend <slug> --message "..."`, fill the generated `TODO:` sections, show the diff before staging. Never edit the parent plan; never hand-stamp MISSION.md's changelog.
- `.osc-dev/` (gitignored, owner-only) holds full ADRs and internal plans. Read `.osc-dev/decisions/` before proposing architectural changes — re-deriving a rejected decision wastes a session. Search tools skip gitignored paths by default; include `.osc-dev/` explicitly.
- Plans with an `## Execution strategy` section advertise parallel groups: propose delegation (OMC `/team`, OMX `$team`, or separate sessions), warn when parallel tasks share files, and bind harness execution to a run package instead of treating the chat thread as canonical state.
- Verification floor: `./verify.sh --strict`, `npm run build`, `npm test`. Public PRs cite the plan, evidence note, verification commands, and owner gates. Humans own merge, publish, and release.
- Key docs: `docs/OPEN_SCAFFOLD_SYSTEM.md` (ontology), `docs/HARNESS_ARCHITECTURE.md` (loop wiring and events), `docs/STABILITY.md` (maturity contract and honest limits), `docs/WORKFLOW.md` (phase-to-tool cheat sheet).
