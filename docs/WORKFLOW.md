# Workflow

A phase-to-tool reference for agent-orchestrated development. This file is the operational reference; `README.md` is the landing page. When in doubt about which tool to reach for, start with the stable repo record: `MISSION.md` → plan → run packet or amendment → evidence → verification → close.

The stable core is the file protocol and lifecycle helpers. Lab surfaces such as natural-language work previews, evolution ledgers, dashboards, cockpit webhooks, and adapter dispatch glue are optional layers around that record; they do not replace the plan/evidence/verification/close chain.

Named coordinators, harnesses, and status/approval channels (operator surfaces) in this guide are examples. Use [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md) to distinguish public examples, private deployment examples, runtime lanes, adapter candidates, and operator surfaces.

## Development phases

Every task moves through a natural progression. You do not need to use every phase — small fixes skip straight to Execute. The phases exist so you know where you are and what to reach for.

For a no-setup first read, run `osc compare` against two recorded attempts to see the work-record idea before adopting the whole scaffold. For first-use setup, start with the [Minimum Viable Scaffold](MINIMUM_VIABLE_SCAFFOLD.md): choose a scaffold tier with `osc init --tier min|standard|max --target <repo>` for greenfield setup or `osc init --from-existing --tier min --target .` for an existing repo, define the mission, add one active plan, optionally create a run packet or amendment, verify, record evidence, and close.

### 1. Clarify (when the goal is fuzzy)

Ask structured questions until the goal, constraints, and acceptance criteria are concrete. Don't start building until you can state in one sentence what "done" looks like.

> **Core open-scaffold:** capture the clarified result as a spec under `.osc/specs/` or as a plan in `.osc/plans/active/`.
>
> **With OMC harness:** use OMC `/deep-interview` from a Claude Code/OMC session, then promote the clarified result into the Open Scaffold plan/spec chain.
>
> **With OMX harness:** use OMX `$deep-interview` from a Codex/OMX session, then promote the clarified result into the Open Scaffold plan/spec chain. Runtime-only question/session state remains debug-only until promoted into repo evidence.

### 2. Plan (when the task is non-trivial)

Write a plan file in `.osc/plans/active/` using the 7-section schema in `.osc/plans/handoff-template.md`. The plan must include acceptance criteria — testable bullets that define success. For risky or multi-file work, get the plan reviewed before executing. See `.osc/plans/WORKFLOW.md` for the stage-folder lifecycle and `.osc/RULES.md` for non-negotiable principles.

Use the helper when the repo has the `osc` CLI available:

```bash
osc plan new <slug> --stage backlog
osc plan new <slug> --stage backlog --from-template bug-fix
osc plan new --from-template list
osc plan move <slug> --to active
```

Use templates when the work shape is known but you want a stronger starting point than the blank handoff skeleton. Shipped templates live under `.osc/plans/templates/`; project teams can add `custom-<name>.md` templates there.

For a first filled draft instead of a blank skeleton, use the terminal interview wizard:

```bash
osc plan wizard <slug> --stage active
osc plan wizard <slug> --stage backlog --non-interactive --answers answers.json
```

The wizard asks for goal, context, constraints, likely files, acceptance criteria, verification, and open questions. It still records your answers only — it does not invent scope or judge whether the plan is good.

Validate the result before implementation when the plan will drive real work:

```bash
osc plan validate <slug-or-path>
osc plan validate <slug-or-path> --strict --json
```

Plan validation is mechanical: it catches missing sections, TODO markers, empty acceptance criteria, status/folder drift, vague goals, untagged blocking questions, and heading-order issues. It is not a semantic product review.

When several plans reference each other, render a read-only dependency map before picking the next slice:

```bash
osc plan graph
osc plan graph --format mermaid
osc plan graph --format json --stage all
osc plan graph --plan <slug> --direction upstream
```

The graph parser reads explicit plan references such as `depends on: <slug>`, `blocks: <slug>`, `blocked by: <slug>`, `follows: <slug>`, `inherits from: <slug>`, `see plan <slug>`, and `--plan <slug>`. It warns about unresolved or circular dependencies without mutating plans.

Use `active` directly when execution is immediate. Use `blocked` or `backlog` when you need to park work without deleting the plan:

```bash
osc plan move <slug> --to blocked
osc plan move <slug> --to backlog
```

Then fill every TODO before implementation. The helpers create and move structure only; they do not invent acceptance criteria. Shell fallback remains the day-zero floor: copy `.osc/plans/handoff-template.md` into the right stage folder and move files manually when needed.

> **With OMC harness:** Claude Code/OMC planning flows can use `/ralplan` against an Open Scaffold plan or `run.json` work package (run packet).
>
> **With OMX harness:** Codex/OMX planning flows can use `$ralplan` against an Open Scaffold plan or `run.json` work package (run packet).

### 3. Execute (build it)

Implement what the plan says. Independent tasks can run in parallel. Every change must trace back to a plan file or amendment.

For day-one local task tracking without an external board, `osc task` is a lab repo-local task bridge:

```bash
osc task new "Fix login redirect bug" --priority high --plan <plan-slug>
osc task list --status todo
osc task claim T-001
osc task complete T-001
```

Tasks live in local `.osc/tasks.db` and can link to plans, but they do not replace plan acceptance criteria or GitHub Issues for public/shared work. See [`docs/TASKS.md`](TASKS.md).

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
osc evolve check .osc/evolution/<loop-id>
```

The evolution ledger records attempts and frontier state only. External coordinators or OMX-based runtime packages execute attempts; Open Scaffold core does not spawn runtimes or choose a winner.

> **With OMC harness:** `/ralph` for Claude Code completion loops; `/team` or `/ultrawork` for parallel fan-out across multiple Claude Code-oriented agents.
>
> **With OMX harness:** `$ralph` for Codex persistent completion loops; `$team` for tmux-backed Codex worker teams; `$ultrawork` for parallel execution; promote runtime evidence back into Open Scaffold.
>
> **IDE-native:** Antigravity + Gemini agent pane for inline refactors and UI tweaks.

### 4. Verify (before claiming done)

Check the plan's acceptance criteria one by one. Run tests. Read the diff. Verification traces to criteria, not vibes.

When you need to reconstruct the work record before or after verification, run:

```bash
osc trace <plan-slug>
osc verify --evidence-chain --plan <plan-slug>
```

Trace shows the known local chain; evidence-chain verification checks that chain structurally.

Run `./verify.sh` for a zero-dependency methodology compliance report (mission defined, plans exist, amendments sequential, changelog coverage). Use `./verify.sh --strict` for full checks including plan schema validation and paired-view drift detection. `osc verify` performs the generic CLI check; adapter repos keep their own namespace-specific verify behavior. Use `osc metrics` when you need numeric scaffold health: plan distribution, cycle time, stale active plans, close velocity, evidence completeness, and approval distribution. Use `osc metrics --json` for CI dashboards or status views that consume machine-readable output. When verification or manual review points at mechanical scaffold hygiene, run `osc doctor --fix --dry-run` first to preview safe repairs, then `osc doctor --fix` to apply fixable status alignment, amendment changelog backfills, narrow paired-view section drops, stale active-plan blocking, or missing release README repair. Use `osc evidence new <slug>` to scaffold a `.osc/releases/<date>-<slug>.md` evidence note after verification, then run `osc evidence collect <slug>` to append local verification output, git context, changed files, and explicit skipped-collector notes without overwriting your narrative. Add `--ci` only when you want `gh`-based PR/check collection. Replace any remaining TODOs with human-reviewed outcome text, then use `osc close <slug> --message "<what shipped>"` (or `npx open-scaffold close <slug> --message "<what shipped>"`) to move a verified plan to `done/`. Shell scripts remain the day-zero floor; `osc` is the canonical tested path for richer run/package behavior.

> **With adapters:** OMC/OMX handoffs should still end by running the repo-local `./verify.sh` plus acceptance-criteria checks. Runtime-native verify commands are wrappers around this evidence, not replacements for it.

### 5. Publish/review (when code or public docs change)

Open a traceable GitHub PR for meaningful changes. The PR should link issue/task, plan/spec, `run.json` work package when delegated, verification, evidence, and review gates. Before writing the PR body, `osc trace <plan-slug>` can help gather the plan, run, evidence, release-note, and recognized PR/issue references already present in local files; it does not query GitHub or prove PR/CI state. If the Codex connector is enabled, trigger review by opening the PR for review, marking a draft ready, or commenting `@codex review`. When a configured Discord or Slack cockpit should see the update, use `osc cockpit post --event pr_link --pr <url>` or `osc cockpit post --event completion_report --run-id <id> --plan <slug> --pr <url>` after redaction review. See `docs/GITHUB_WORKFLOW.md`.

### 6. Capture amendments (when you "get smarter")

New information legitimately changes what you're building? That's fine — but capture it, don't silently drift.

1. Do not edit plan files in place. Do not hand-edit MISSION.md's changelog for amendment bookkeeping.
2. Run `osc amend <plan-slug> --message "<what changed>"` (or `npx open-scaffold amend <plan-slug> --message "<what changed>"` without a local install). The CLI finds the parent plan in whichever stage subfolder it lives in (`active/`, `backlog/`, `done/`, `blocked/`), autonumbers the next amendment file alongside it, scaffolds the 5-section schema from `.osc/plans/README.md`, and stamps MISSION.md's `## Changelog` section in one shot.
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
| Public/versioned change | GitHub PR loop | CI, Codex review, and human approval gate merges |

> **Runtime split:** Open Scaffold is the runtime-neutral contract. Hermes, Claw/OpenClaw, Claude Code, Codex, Gemini, or custom scripts can act as orchestrators/agents. OMC is a Claude Code harness; OMX is a Codex harness. Status/approval channels such as Discord are operator surfaces — visible control rooms, not canonical state.

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
   - **Yes, with OMX harness →** Use Codex/OMX-specific workflows such as `$team`, `$ralph`, `$ultrawork`, or `$ralplan` against the Open Scaffold plan or `run.json` work package.
   - **Yes, plain Claude Code/Codex or similar →** The agent reads the Execution Strategy section and describes the parallelism opportunity. You decide how to act on it.
   - **No agent, or local LLM →** Run `./delegate.sh <plan-path>` to generate actionable prompts you can paste into separate terminal sessions.

### Provider-tier capabilities

What works at each level of tooling:

| Tier | Agent reads Execution Strategy? | Auto-proposes delegation? | Fallback |
|------|--------------------------------|--------------------------|----------|
| **OMC harness** | Yes | Yes — Claude Code/OMC workflows can propose `/team`, `/ultrawork`, `/ralph` with specific groups | Claude Code + OMC automation |
| **OMX harness** | Yes | Yes — Codex/OMX workflows can propose `$team`, `$ralph`, `$deep-interview`, `$ralplan` handoffs | Codex + OMX automation |
| **Plain Claude Code/Codex** (or similar capable agent) | Yes, if instructed via CLAUDE.md/AGENTS.md | Describes the opportunity; human decides | Agent-assisted |
| **Local LLM / no agent** | No | No | Run `./delegate.sh <plan-path>` for terminal prompts |

## Session handover

Multi-agent development spans sessions. Without discipline, context is lost between sessions and you start each one from scratch. Here's how to maintain continuity:

### What to produce at the end of each session

- **A completed or updated plan file** — If you finished a task, its plan should have all ACs checked off. If work remains, the plan documents what's done and what's left.
- **A closed plan** — If all acceptance criteria are met, run `./close.sh <plan-slug>` to move the plan and its amendments to `done/` and stamp the changelog.
- **Amendments for any scope changes** — Anything you learned that changes the plan goes in an amendment file, not in your head. Run `./amend.sh <plan-slug>` to scaffold it.
- **A changelog entry in MISSION.md** — One line per pivot so the next session (or agent) knows what shifted and why.

### How to hand off between sessions

1. Before ending: review the latest plan + amendments. Is everything captured, or are decisions only in the conversation?
2. Write down unfinished work as open questions in the plan file (Section 7).
3. The next session starts by reading MISSION.md → latest plan → amendments in order. If the slice already has a plan slug, it can also start with `osc trace <plan-slug>` to see the durable local work record without relying on chat memory.

For stage-folder movement rules and lifecycle conventions, see `.osc/plans/WORKFLOW.md`. For non-negotiable principles, see `.osc/RULES.md`.

### When to parallelize

Run tasks in parallel when they are **independent** — they don't share files, don't depend on each other's output, and can be verified separately. If tasks touch the same files or one's output feeds another's input, run them sequentially.

Signs you should parallelize: multiple plan files for independent features, test suites that can run concurrently, documentation updates alongside code changes.

Signs you should NOT parallelize: database migration + code that uses the new schema, API endpoint + its tests (test needs the endpoint first), paired views (CLAUDE.md + AGENTS.md — update one, then mirror).

## Verification marker convention

MISSION.md in this template ships with a machine-detectable empty-mission marker: the HTML comment `<!-- mission:unset -->` plus the literal `TODO: define mission`. Verification tooling should treat the presence of either as **"mission not yet defined"** — a blocker for any scope-expanding work. open-scaffold defines the marker; consuming tools decide how to honor it. Remove both markers only when the real mission has been written and committed.
