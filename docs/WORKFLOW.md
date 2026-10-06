# Workflow

A phase-to-tool reference for AI-assisted work. This file is the operational reference; `README.md` is the landing page. When in doubt about which tool to reach for, start with the stable repo record: `MISSION.md` → plan → run packet or amendment → evidence → verification → close. Across every phase, the product front door is three commands: `osc handoff` (resume packet for the next session or model), `osc review` (review recorded attempts; `osc analyze` remains a synonym), and `osc gate` (authorize or block the next attempt).

The stable core is the file protocol and lifecycle helpers. Lab surfaces such as evolution ledgers, cockpit webhooks, and runtime profiles are optional layers around that record; they do not replace the plan/evidence/verification/close chain. Historical helpers removed from the reduced maintained CLI, such as `osc work`, `osc dashboard`, `osc task`, `osc plan wizard`, `osc plan graph`, `osc metrics`, and broad `osc doctor --fix`, are migration references only unless a future plan restores them with fresh evidence.

Named coordinators, harnesses, and status/approval channels (operator surfaces) in this guide are optional examples. The repo-local mission, plan, evidence, and verification rules are sufficient to work; fetching upstream documents or using a particular hosting service is not a prerequisite.

Commands below use `osc` for brevity. Install it with `npm install --global open-scaffold@latest`, or replace `osc` with `npx open-scaffold@latest` on each invocation. Running one command through `npx` does not install `osc` on your PATH. From the Open Scaffold source checkout, `npm run osc -- <command>` is another option after installing development dependencies.

## Record-writing policy

Use the CLI first to create plans, amendments, evidence skeletons, and close records. If the CLI is unavailable, use the supported repo-local shell helper for the operation, such as `./amend.sh` or `./close.sh`. Only when neither can perform the operation may you use a manual fallback that preserves the shipped schema, numbering, stage folders, amendment sequence, and changelog links.

Fill generated `TODO:` sections and review the new record before its first commit. After commit, preserve the plan's intent: changes to its goal, scope, or acceptance-criterion wording go into a new amendment. Factual checklist completion and reserved ` | Evidence: <reference-only-list>` suffixes may be updated without changing the criterion's meaning. Record detailed results and newly discovered questions in evidence or an amendment. Supported lifecycle helpers may move the plan and its amendments and update Status/stage bookkeeping; ad hoc committed content rewrites remain prohibited.

## Development phases

Every task moves through a natural progression. You do not need to use every phase — small fixes skip straight to Execute. The phases exist so you know where you are and what to reach for.

For a no-setup first read, run `osc compare` against two recorded attempts to see the work-record idea before adopting the whole scaffold. For first-use setup, start with the [Minimum Viable Scaffold](START_HERE.md#adopt-the-minimum-scaffold): choose a scaffold tier with `osc init --tier min|standard|max --target <repo>` for greenfield setup or `osc init --from-existing --tier min --target .` for an existing repo, define the mission, add one active plan, optionally create a run packet or amendment, verify, record evidence, and close.

### 1. Clarify (when the goal is fuzzy)

Ask structured questions until the goal, constraints, and acceptance criteria are concrete. Don't start building until you can state in one sentence what "done" looks like.

> **Core open-scaffold:** capture the clarified result as a spec under `.osc/specs/` or as a plan in `.osc/plans/active/`.
>
> **With OMC harness:** use OMC `/deep-interview` from a Claude Code/OMC session, then promote the clarified result into the Open Scaffold plan/spec chain.
>
> **With OMX harness:** use an OMX/Codex clarification workflow, then promote the clarified result into the Open Scaffold plan/spec chain. Runtime-only question/session state remains debug-only until promoted into repo evidence.

### 2. Plan (when the task is non-trivial)

Create a plan in `.osc/plans/active/` with `osc plan new`, using the Status + seven content-heading schema in `.osc/plans/handoff-template.md`. Fill the generated sections before the first commit. The plan must include acceptance criteria — testable bullets that define success. For risky or multi-file work, get the plan reviewed before executing. See `.osc/plans/WORKFLOW.md` for the stage-folder lifecycle and `.osc/RULES.md` for non-negotiable principles.

Use the helper when the repo has the `osc` CLI available:

```bash
osc plan new <slug> --stage backlog
osc plan new <slug> --stage backlog --from-template bug-fix
osc plan new --from-template list
osc plan move <slug> --to active
```

Use templates when the work shape is known but you want a stronger starting point than the blank handoff skeleton. Shipped templates live under `.osc/plans/templates/`; project teams can add `custom-<name>.md` templates there.

Historical/repositioned migration note: earlier builds included `osc plan wizard` for a terminal interview. The reduced maintained CLI no longer ships that wizard; use `osc plan new` plus a reviewed template, or capture interview output from an external harness and promote it into the plan file.

Validate the result before implementation when the plan will drive real work:

```bash
osc plan validate <slug-or-path>
osc plan validate <slug-or-path> --strict --json
```

Plan validation is mechanical: it catches missing sections, TODO markers, empty acceptance criteria, status/folder drift, vague goals, untagged blocking questions, and heading-order issues. It is not a semantic product review.

Historical/repositioned migration note: earlier builds included `osc plan graph` for read-only dependency maps. The reduced maintained CLI no longer ships that graph surface; keep dependency notes in plan text, use `osc trace` for local chain inspection, or restore graphing through a future evidence-backed slice.

Use `active` directly when execution is immediate. Use `blocked` or `backlog` when you need to park work without deleting the plan:

```bash
osc plan move <slug> --to blocked
osc plan move <slug> --to backlog
```

Then fill every TODO before the first commit and before implementation. The helpers create and move structure only; they do not invent acceptance criteria. If neither the CLI nor a supported shell helper can create the plan, the manual fallback is to copy `.osc/plans/handoff-template.md` into the right stage folder and fill its schema before committing. If movement also needs a manual fallback, preserve the filename and move amendments with their parent; do not use a move as an opportunity to rewrite committed intent.

> **With OMC harness:** Claude Code/OMC planning flows can use their native planning workflow against an Open Scaffold plan or `run.json` work package (run packet).
>
> **With OMX harness:** Codex/OMX planning flows can use their native planning workflow against an Open Scaffold plan or `run.json` work package (run packet).

### 3. Execute (build it)

Implement what the plan says. Independent tasks can run in parallel. Every change must trace back to a plan file or amendment.

Historical/repositioned migration note: the local `osc task` bridge was removed from the reduced maintained CLI. Use plan files for durable work, GitHub Issues or another shared tracker for team queues, and keep any local scratch task list outside the core contract. [`WORKFLOW.md#task-trackers-and-plans`](WORKFLOW.md#task-trackers-and-plans) is retained as historical design context.

Before creating a durable run packet, preview what Open Scaffold would package:

```bash
osc run .osc/plans/active/<plan>.md --dry-run --runtime codex --workflow plan
osc run .osc/plans/active/<plan>.md --dry-run --json
```

`--dry-run` validates the plan, renders the `run.json` and package markdown in memory, lists files from the plan, and exits without creating `.osc/runs/` artifacts. Re-run without `--dry-run` only when the preview is acceptable.

For multi-attempt improvement loops, create a lab evolution ledger after the first plan/run exists:

```bash
osc evolve init .osc/plans/active/<plan>.md --out .osc/evolution/<loop-id> --strategy manual
osc evolve record .osc/evolution/<loop-id> --run .osc/runs/<run-id>/run.json --evaluation docs/evidence/<eval>.json --receipt .osc/runs/<run-id>/dispatch-receipt.json --evidence .osc/runs/<run-id>/runtime-omx-evidence.md --decision promote --score 0.93 --rationale "Best evidence so far."
osc evolve record .osc/evolution/<loop-id> --run .osc/runs/<next-run-id>/run.json --evaluation docs/evidence/<next-eval>.json --decision retry --repair-hypothesis "Target one still-failing criterion with a measurable repair." --target-metric accepted_ac_count --expected-gain 1 --actual-delta 0 --rationale "Continue only because the next repair hypothesis is explicit."
osc evolve check .osc/evolution/<loop-id>
```

The evolution ledger records attempts and frontier state only. Retry records must include a repair hypothesis before continuing. External coordinators or OMX-based runtime packages execute attempts; Open Scaffold core does not spawn runtimes or choose a winner.

> **With OMC harness:** Claude Code/OMC completion or team workflows for parallel fan-out across multiple Claude Code-oriented agents.
>
> **With OMX harness:** Codex/OMX completion or team workflows for persistent and parallel execution; promote runtime evidence back into Open Scaffold.
>
> **IDE-native:** Antigravity + Gemini agent pane for inline refactors and UI tweaks.

### 4. Verify (before claiming done)

Check the plan's acceptance criteria one by one. Run tests. Read the diff. Verification traces to criteria, not vibes.

When you need to reconstruct the work record before or after verification, run:

```bash
osc trace <plan-slug>
```

Trace shows the known local chain. After the plan is closed, `osc verify --evidence-chain --plan <plan-slug>` checks that chain structurally; it accepts plans in `done/`, not active plans. Mark verified criteria complete with reserved ` | Evidence: <reference-only-list>` suffixes, record the real close decision and rationale in the evidence note, and make its Plan reference point to the final `done/` path before strict evidence-chain verification.

Run `./verify.sh` for a zero-dependency methodology compliance report (mission defined, plans exist, amendments sequential, changelog coverage). Use `./verify.sh --strict` for full checks including plan schema validation and paired-view drift detection. `osc verify` performs the generic CLI check; adapter repos keep their own namespace-specific verify behavior. Use `osc doctor --check secret-scan` for the reduced maintained secret-scan diagnostic. Historical `osc metrics` and broad `osc doctor --fix` repair flows were removed from the reduced CLI and should be treated as migration references until restored by a future evidence-backed slice. Use `osc evidence new <slug>` to scaffold a `.osc/releases/<date>-<slug>.md` evidence note after verification, then run `osc evidence collect <slug>` to append local verification output, git context, changed files, and explicit skipped-collector notes without overwriting your narrative. Add `--ci` only when you want `gh`-based PR/check collection. Replace any remaining TODOs with human-reviewed outcome text, then use `osc close <slug> --message "<what shipped>"` (or `npx open-scaffold@latest close <slug> --message "<what shipped>"`) to move a verified plan to `done/`. Shell scripts remain the day-zero floor; `osc` is the canonical tested path for richer run/package behavior.

> **With adapters:** OMC/OMX handoffs should still end by running the repo-local `./verify.sh` plus acceptance-criteria checks. Runtime-native verify commands are wrappers around this evidence, not replacements for it.

### 5. Publish/review (when code or shared docs change)

Use the project's repository review process for meaningful changes. A review record should link the issue/task when one exists, plan/spec, `run.json` work package when delegated, verification, evidence, and review decisions. `osc trace <plan-slug>` gathers references already present in local files; it does not query a hosting service or prove CI state. Local review and git history are sufficient when the project has no remote tracker.

GitHub pull requests, connector reviews, and cockpit notifications are optional integrations. If the project uses GitHub, see the repo-local `docs/GITHUB_WORKFLOW.md` when available. Follow the owner's authorization for publication and external messages; installing the scaffold does not authorize posting to GitHub, Discord, or Slack.

### 6. Capture amendments (when you "get smarter")

New information legitimately changes what you're building? That's fine — but capture it, don't silently drift.

1. Preserve committed plan intent; write the scope change as an amendment. Use helpers for MISSION.md's amendment bookkeeping, with the schema-preserving manual fallback only when neither CLI nor a supported shell helper is available.
2. Run `osc amend <plan-slug> --message "<what changed>"` (or `npx open-scaffold@latest amend <plan-slug> --message "<what changed>"` without a local install). The CLI finds the parent plan in whichever stage subfolder it lives in (`active/`, `backlog/`, `done/`, `blocked/`), autonumbers the next amendment file alongside it, scaffolds the 5-section schema from `.osc/plans/README.md`, and stamps MISSION.md's `## Changelog` section in one shot.
3. Fill in the three `TODO:` sections in the new amendment file: **Learning** (what changed and why), **New direction** (the revised goal or criteria), and **Impact on acceptance criteria** (which AC numbers change, how).
4. Review the diff, then commit. Agents read the original plan plus all amendments in numeric order.

Shell fallback: `./amend.sh <plan-slug>` remains supported, including script-specific flags such as `--stage`, `--backlog`, and `--message "<text>"`. The CLI path covers the common npm/day-two flow; the shell script remains the compatibility floor.

This is the difference between legitimate scope evolution (captured, traceable) and bad scope creep (silent, invisible). The helper is the safety net: it makes the mechanical parts of the amendment protocol (autonumbering, schema fidelity, changelog stamping) harder to get wrong.

> **With runtime harnesses:** use second-opinion or review flows before amending when you are stuck, but capture the final scope change with `osc amend` or `./amend.sh`. Runtime memory is not a substitute for amendment files.

## When to use what

There is no automatic router between tools. You, the human, decide based on the task:

| Task shape | Reach for | Why |
|------------|-----------|-----|
| Fuzzy goal, many unknowns | Clarify phase | Building on assumptions wastes cycles |
| Non-trivial, multi-file | Plan → Execute | A plan prevents scope creep mid-implementation |
| Simple, single-file fix | Execute directly | Overhead of planning exceeds the fix itself |
| Independent parallel tasks | Parallel execution | Fan out across agents for throughput |
| Stuck or uncertain | Second opinion | A different model's perspective breaks deadlocks |
| Shared/versioned change | Project repository review process | Verification, review, and owner approval make publication traceable; GitHub is optional |

> **Runtime split:** Open Scaffold is the runtime-neutral contract. Hermes, Claw/OpenClaw, Claude Code, Codex, Gemini, or custom scripts can act as orchestrators/agents. OMC is a Claude Code harness; OMX is a Codex harness. Status/approval channels such as Discord are operator surfaces — visible status rooms, not canonical state.

### Delegation decision tree

When your plan has multiple tasks, use this decision tree to decide how to execute them:

1. **Do any tasks depend on another task's output?** (Data flows, API schemas, generated files)
   - **Yes →** Those tasks must run sequentially. Group the rest for potential parallelism.
   - **No →** Continue to step 2.

2. **Do the candidate parallel tasks touch the same files?**
   - **Yes →** Do NOT parallelize those tasks. Shared files cause merge conflicts and race conditions.
   - **No →** Safe to parallelize. Continue to step 3.

3. **Do you have a capable runtime/agent?** (Can it read plan files and use tools?)
   - **Yes, with OMC harness →** Use Claude Code/OMC-specific workflows such as `/team`, `/ultrawork`, or `/ralph` against the Open Scaffold plan or `run.json` work package.
   - **Yes, with OMX harness →** Use Codex/OMX-specific workflows such as team, retry, execution, or planning workflows against the Open Scaffold plan or `run.json` work package.
   - **Yes, plain Claude Code/Codex or similar →** The agent reads the Execution Strategy section and describes the parallelism opportunity. You decide how to act on it.
   - **No agent, or local LLM →** Run `./delegate.sh <plan-path>` to generate actionable prompts you can paste into separate terminal sessions.

### Provider-tier capabilities

What works at each level of tooling:

| Tier | Agent reads Execution Strategy? | Auto-proposes delegation? | Fallback |
|------|--------------------------------|--------------------------|----------|
| **OMC harness** | Yes | Yes — Claude Code/OMC workflows can propose `/team`, `/ultrawork`, `/ralph` with specific groups | Claude Code + OMC automation |
| **OMX harness** | Yes | Yes — Codex/OMX workflows can propose team, retry, clarification, or planning handoffs | Codex + OMX automation |
| **Plain Claude Code/Codex** (or similar capable agent) | Yes, if instructed via CLAUDE.md/AGENTS.md | Describes the opportunity; human decides | Agent-assisted |
| **Local LLM / no agent** | No | No | Run `./delegate.sh <plan-path>` for terminal prompts |

## Session handover

Multi-agent development spans sessions. Without discipline, context is lost between sessions and you start each one from scratch. Here's how to maintain continuity:

### What to produce at the end of each session

- **An evidence/progress note and factual checklist updates** — Record what changed, which criteria have verified results, what remains, and the exact next action. Mark a criterion complete only when verified, appending ` | Evidence: <local-path>` while preserving its wording. Fill an uncommitted skeleton before its first commit; use amendments for new intent.
- **A closed plan when verified** — If all acceptance criteria are met, run `osc close <plan-slug> --message "<what shipped>"` to move the plan and its amendments to `done/` and stamp the changelog. Use `./close.sh` when the CLI is unavailable.
- **Amendments for scope changes or new blocking questions** — Run `osc amend <plan-slug> --message "<what changed>"`, fill its generated sections, and review before committing. Use `./amend.sh` when available as the shell fallback.
- **Helper-managed changelog bookkeeping** — Amend and close helpers link each pivot so the next session knows what shifted and why.

### How to hand off between sessions

1. Before ending, review the selected plan and its amendments. Put decisions and unfinished work into evidence/progress notes or a new amendment; fill Section 7 directly only while the plan is still an uncommitted draft.
2. Review the diff and preserve the record in git as appropriate for the project. Keep the selected plan slug with the handoff; do not rely on whichever active plan happens to sort first.
3. The next session starts with `osc handoff --plan <plan-slug>` (or `npx open-scaffold@latest handoff --plan <plan-slug>`). Confirm the selected plan, then read its amendments and the latest evidence. Use `osc trace <plan-slug>` for the local chain. The packet is read-only and does not itself grant approval or certify that reported work passed.

The [resume walkthrough](RESUME_WALKTHROUGH.md) gives a concrete example. If a run has no matching task/plan identity, inspect it separately rather than assuming it belongs to the selected plan.

For stage-folder movement rules and lifecycle conventions, see `.osc/plans/WORKFLOW.md`. For non-negotiable principles, see `.osc/RULES.md`.

### When to parallelize

Run tasks in parallel when they are **independent** — they don't share files, don't depend on each other's output, and can be verified separately. If tasks touch the same files or one's output feeds another's input, run them sequentially.

Signs you should parallelize: multiple plan files for independent features, test suites that can run concurrently, documentation updates alongside code changes.

Signs you should NOT parallelize: database migration + code that uses the new schema, API endpoint + its tests (test needs the endpoint first), paired views (CLAUDE.md + AGENTS.md — update one, then mirror).

## Verification marker convention

MISSION.md in this template ships with a machine-detectable empty-mission marker: the HTML comment `<!-- mission:unset -->` plus the literal `TODO: define mission`. Verification tooling should treat the presence of either as **"mission not yet defined"** — a blocker for any scope-expanding work. open-scaffold defines the marker; consuming tools decide how to honor it. Remove both markers only when the real mission has been written and committed.

### Task trackers and plans

`osc task` and the local `.osc/tasks.db` bridge were retired from the reduced maintained CLI. Use `.osc/plans/` for durable work records, and use GitHub Issues, Linear, Jira, Hermes Kanban, or another coordinator-owned tracker for shared live task state.

Local scratch task lists may still be useful, but they are not durable product proof. Promote meaningful work into plans, run packets, evidence notes, PRs, or issues when it needs review or reconstruction.
