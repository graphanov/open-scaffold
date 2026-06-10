<!-- PAIRED VIEW: this file and AGENTS.md carry the same project facts in formats each tool reads natively. Edits here MUST be mirrored in AGENTS.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# Project Context

This project is [open-scaffold](https://github.com/graphanov/open-scaffold), a repo-native work record for AI-assisted work. It keeps mission, roadmap, plans, amendments, evidence, run packets, and session handover practices in git-tracked files so any capable agent or orchestrator can enter this repository without relying on vanished chat context. Read this file first, then consult `MISSION.md` for what the project actually is.

## Layered architecture

open-scaffold has multiple layers. The **core system** is framework-agnostic repo discipline: mission, roadmap, plans, amendments, evidence, run packets, operator reports, and handover. **Orchestrators/agents** such as Hermes, Claw/OpenClaw, Claude Code, Codex, and Gemini can operate against that substrate. **Runtime harnesses** such as OMC and OMX extend Claude Code/Codex with workflow modes; they are not equivalent to orchestrators like Hermes or Claw. Consult `docs/OPEN_SCAFFOLD_SYSTEM.md` for the ontology, `docs/TASK_RUN_MODEL.md` for task/run/operator-surface identity, `docs/GITHUB_WORKFLOW.md` for issue/PR/Codex-review traceability, and `docs/WORKFLOW.md` for phase guidance.

## Where things live

- **`MISSION.md`** — the project's mission, goals, and non-goals. The source of truth for *what* we're building. Contains an explicit `## Changelog` section that records every scope pivot.
- **`ROADMAP.md`** — product/system milestones and the self-dogfood chain from roadmap item to issue/task, plan, run packet, PR, and release note.
- **`docs/OPEN_SCAFFOLD_SYSTEM.md`** — boundary map for Open Scaffold core, orchestrators/agents, OMC/OMX runtime harnesses, task bridges, glass-cockpit surfaces, and GitHub.
- **`docs/TASK_RUN_MODEL.md`** — task/run/operator-surface identity model: `task_id`, `run_id`, `question_id`, runtime bindings, and chat/thread bindings.
- **`docs/SLICE_CLOSE_PROTOCOL.md`** — evidence receipts, postflight decisions, approval strength, correction routing, and next-slice inheritance.
- **`docs/RUNTIME_BINDING_CONTRACT.md`** — lifecycle/responsibilities for OMC/OMX/plain-agent/human bindings that consume run packets outside core.
- **`docs/GITHUB_WORKFLOW.md`** — GitHub issue, PR template, Codex connector review, CI, and merge/release traceability.
- **`.osc/plans/`** — plan files organized in stage subfolders (`active/`, `backlog/`, `done/`, `blocked/`). The folder IS the status. Plans are **immutable** once committed. New learnings become amendment files named `<slug>-amendment-<n>.md` in the same stage folder as the parent. The handoff template in `.osc/plans/handoff-template.md` defines the exact Status + seven content-heading schema every plan follows. See `.osc/plans/WORKFLOW.md` for movement rules between stage folders.
- **`docs/decisions/`** — `README.md` is the public design-choices page (paired views, immutable plans, adapter-mediated orchestration). The full ADR records that back these decisions live internally in `.osc-dev/decisions/` and do not ship with the public template.
- **`.osc/releases/`** — scaffold-native release/evidence notes for meaningful product slices. Each note should cite the roadmap item, issue/task, plan, run ID, PR, verification, and follow-up work.
- **Stability and launch docs** — `docs/STABILITY.md`, `docs/CHANGELOG.md`, and `docs/index.html` explain the current package-contract boundary, curated release history, and landing-page adoption path. Treat `package.json`, npm latest, and GitHub Releases as separate public truth surfaces; repo version alone does not prove publication.
- **`.osc-dev/`** (gitignored; populated only when working on open-scaffold itself, not in cloned templates) — owner's internal workspace holding `plans/`, `decisions/` (full ADR records), `specs/`, and `snapshots/`. **Before proposing architectural changes to the scaffold itself, read `.osc-dev/plans/` and `.osc-dev/decisions/` first** — many design questions are already investigated there, and re-deriving a rejected decision wastes a session. Grep/Glob tools skip gitignored paths by default; include `.osc-dev/` explicitly when searching.
- **`docs/WORKFLOW.md`** — the phase-to-tool-to-command cheat-sheet. Where to reach for which agent/skill at each development phase.
- **`bootstrap.sh`** — optional idempotent day-one setup. Creates lazy dirs (`.osc/research/`, `.osc/state/`) and stamps MISSION.md's changelog with the bootstrap date.
- **Lifecycle helpers** — prefer `osc amend <plan-slug> --message "<what changed>"` and `osc close <plan-slug> --message "<what shipped>"` for the npm/day-two path. Shell fallbacks remain `./amend.sh <plan-slug>` and `./close.sh <plan-slug>`; the scripts keep their script-specific flags such as `--stage` and `--backlog`.
- **`.osc/RULES.md`** — compact non-negotiable principles. Re-read before any major action on project structure.

## Compliance checks

Before any non-trivial code change, run `./verify.sh --quick --quiet` and check the exit code:

- **Exit 0 (all checks pass) →** Proceed silently. Do not mention verification to the user.
- **Exit 1 (any check fails) →** Read the failure output, then hard-block on the first failing check:
  - **Mission undefined →** Stop. Say: "Your mission isn't defined yet. Let's define it now — what is this project?" Guide the user through MISSION.md fill-in (or run `./bootstrap.sh`). Do not proceed until the mission is defined or the user explicitly says to skip. Note: the plan check is gated behind the mission check — it will not appear until the mission is defined (progressive disclosure).
  - **No plan file →** (only appears after mission is defined) Stop. Say: "There's no plan for this work. Let's create one — what are you trying to build?" Create a plan in `.osc/plans/` using the handoff template. Do not proceed until a plan exists or the user explicitly says to skip.

The `--quiet` flag suppresses output when all checks pass (zero noise on success) but still prints failure details when something is wrong. The user can always override with "skip verification", "just do it", or similar. Respect their autonomy, but the default is to fix violations first.

If you cannot execute shell commands, check directly: first check that `MISSION.md` does not contain `<!-- mission:unset -->`. Only if the mission is defined, then check that `.osc/plans/` and its stage subfolders (`active/`, `backlog/`, `done/`, `blocked/`) contain at least one `.md` plan file besides `README.md` and `handoff-template.md`.

## How to verify

- Run `./verify.sh` (or `./verify.sh --strict` for full compliance) to check methodology adherence. Runtime harness handoffs may wrap verification, but acceptance-criteria evidence and `./verify.sh` remain the source of truth.
- MISSION.md ships with the marker `<!-- mission:unset -->` and literal `TODO: define mission`. Verification tooling should treat the presence of either as "mission not yet defined." Remove both only when the real mission is written.
- For any feature slice, verification must trace back to the acceptance criteria in the plan file under `.osc/plans/`.

## Scope evolution protocol

Legitimate scope evolution (the "I got smarter" case — new information changes what we should build) is captured via the amendment protocol, not silent edits. The full protocol is documented in `.osc/plans/README.md` (under 200 words). Short version:

1. Plans in `.osc/plans/` are immutable once committed.
2. New learnings become `<plan-slug>-amendment-<n>.md` files in the same stage folder as the parent — **scaffolded by `osc amend <plan-slug> --message "<what changed>"` or `./amend.sh <plan-slug>`**, not hand-written.
3. MISSION.md's `## Changelog` section gets a one-line entry per amendment — **stamped by the helper**, not hand-edited.
4. Agents and humans read the original plan PLUS all amendments in numeric order.

Do NOT edit plans in place. Do NOT hand-edit amendment files or MISSION.md's changelog for amendment bookkeeping — let `osc amend` or `amend.sh` do the mechanical work. Do NOT add features not traceable to a plan file or amendment. If a new requirement arrives, write an amendment first, then implement.

### Agent-driven amendment flow

When the user signals an "I got smarter" moment (new information changes a plan's goal, constraints, or acceptance criteria), drive the amendment conversationally:

1. Ask the user what specifically changed since the plan was written and why it changes scope. Summarize their words back in their voice before writing anything.
2. Run `osc amend <plan-slug> --message "<what changed>"` or `./amend.sh <plan-slug>` from the repo root. The helper autonumbers the amendment, scaffolds the 5-section schema (Parent / Date / Learning / New direction / Impact on acceptance criteria), and stamps MISSION.md's changelog.
3. Fill in the three `TODO:` sections in the new amendment file using the user's summary. Do not touch MISSION.md directly — the helper already stamped it.
4. Show the user the diff of the new amendment file and the MISSION.md changelog line for review before staging. If using the shell fallback, pass `--stage` on a rerun, or stage manually after they approve.
5. Never hand-author amendment files, never manually edit MISSION.md's changelog for amendments, and never modify the parent plan file.

## Delegation detection

When executing a plan from `.osc/plans/`, check whether it contains an `## Execution strategy` section. If present:

1. **Read the parallel groups and dependencies.** Identify which tasks can run concurrently and which must wait for prerequisites.
2. **Propose delegation to the user:**
   - **With OMC harness:** Suggest Claude Code/OMC workflows such as `/team`, `/ultrawork`, or `/ralph` for suitable groups. Name the groups and tasks explicitly.
   - **With OMX harness:** Suggest Codex/OMX workflows such as `$team`, `$ralph`, `$ultrawork`, or `$ralplan`, promoting runtime evidence back into the scaffold chain.
   - **Without a runtime harness:** Describe the parallelism opportunity in plain text (e.g., "Tasks T1 and T5 are independent and could be run in separate sessions"). The user decides how to act on it.
3. **Warn on risky parallelization.** If tasks marked as parallel in the Execution Strategy share files listed in the plan's "Files to touch" section, or if a task's dependency is in the same parallel group, flag the conflict before proceeding.
4. **Bind harness execution to a run package.** When execution needs OMC/OMX or another harness, create or request a bound run package (`osc run <plan> --task-id ... --executor ...`) rather than treating the chat thread or runtime session as canonical state. For code/public-doc changes, carry the same trace into the GitHub PR template and trigger Codex review when available.

If the plan has no Execution Strategy section, proceed normally — the section is optional and only present for multi-agent or parallel work.

For users without a capable agent (local LLMs, manual workflows), the `./delegate.sh <plan-path>` script reads the Execution Strategy section and generates actionable prompts that can be pasted into separate terminal sessions.

## Workflow

See `docs/WORKFLOW.md` for the phase-to-tool cheat-sheet (deep interview, planning, OMC `/ralph`/`/team`, OMX `$ralph`/`$team`, adapter handoffs, verify, amendment capture).
