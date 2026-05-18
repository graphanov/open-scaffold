<div align="center">

# 🧱 open-scaffold

**A repo-native source of truth for AI-assisted software work.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Template](https://img.shields.io/badge/GitHub-Template-blue.svg)](https://github.com/graphanov/open-scaffold/generate)
[![Works with](https://img.shields.io/badge/Works%20with-Any%20agent-green.svg)](#runtime-neutral-by-design)

</div>

Open Scaffold gives solo devs and small teams repo files and rules for AI coding work. It stores the mission, roadmap, plans, evidence, decisions, and handoff notes where humans and agents can see what was asked, changed, verified, and approved.

Use it when AI work spans sessions, PRs, agents, or review gates — when you need proof without a documentation swamp.

> **What it is:** a repo-native source of truth: files and rules that package work for humans, agents, coordinators, and runtime adapters.
>
> **What it is not:** an agent runtime, Discord bot, daemon, task database, model ranker, or code reviewer. Those live in tools you choose; the scaffold is what they read and write.

Runtime handoff is optional: Open Scaffold writes a `run.json` work package, an external adapter/runtime works outside core, evidence comes back, and humans approve. See [Step 5](#5-optional-package-a-plan-for-an-agentruntime).

---

## The problem

AI agents can write useful code, but the workflow often disappears into chat logs and terminal sessions:

```text
Idea -> chat thread -> agent session -> PR -> "looks done?"
```

Weeks later nobody can reconstruct intent, acceptance criteria, verification evidence, or human approval.

Open Scaffold fixes that by making the repository the shared memory. Chat, Discord, terminals, GitHub comments, and agent transcripts can help operate the work, but durable truth lives in files and PRs.

For the same idea in three diagrams (problem, loop, system boundary), see [`docs/WHY_OPEN_SCAFFOLD.md`](docs/WHY_OPEN_SCAFFOLD.md).

---

## 60-second demo

Want the loop before the theory? Read [`docs/EXAMPLES.md`](docs/EXAMPLES.md#60-second-viewer-demo). It shows the four artifacts that matter:

```text
Mission -> plan -> verification -> evidence/status
```

For a full non-recursive loop, read the [downstream walkthrough](docs/examples/downstream-walkthrough.md): mission, plan, optional `run.json` package, evidence, close, and day-2 resume. Broader shapes live in the [examples index](docs/examples/README.md).

---

## What you get

- **Direction:** `MISSION.md` and `ROADMAP.md` keep intent visible.
- **Work specs:** `.osc/plans/` holds small, immutable plans with acceptance criteria.
- **Change history:** amendments record scope changes without rewriting the original plan.
- **Work packages (run packets):** `.osc/runs/<run_id>/run.json` packages a plan for a chosen runtime lane.
- **Evidence:** `.osc/releases/` records what shipped, how it was verified, and what follows.
- **Checks:** `./verify.sh` and `osc verify` catch stale state, broken evidence, and plan drift.
- **Agent entry points:** `AGENTS.md` and `CLAUDE.md` tell coding agents how to operate without fresh explanations.

The loop:

```text
Roadmap or issue
  -> plan
  -> run.json package / task id
  -> branch / PR
  -> verification evidence
  -> approval / amendment / next slice
```

---

## Quickstart

### 1. Choose how many Open Scaffold files to add

Use npm for the normal first run. Use `--target .` to add scaffold files to the current repo, or `--target my-app` to create/init a project folder named `my-app`:

```bash
npx open-scaffold init --tier min --target <your-project>
cd <your-project>
```

Source checkout fallback:

```bash
git clone https://github.com/graphanov/open-scaffold open-scaffold
cd open-scaffold
npm install
npm run build
node dist/cli.js init --tier min --target <your-project>
cd <your-project>
```

Tiers:

- `min` — smallest useful setup: mission, rules, plan template/workflow, evidence folder, verification, and close helper.
- `standard` — recommended starter: `min` plus README/roadmap, agent instructions, amendment helper, and core docs.
- `max` — advanced/team setup: `standard` plus GitHub, runtime, status/control-room docs, delegation helper, and advanced `.osc/` folders.

The initializer is local-only: it does not require network access after the package is present, does not call GitHub or agent services, and refuses to overwrite existing files unless `--force` is supplied.

Prefer the npm path above for first use. If you prefer GitHub's template flow, use GitHub's **Use this template** button or `gh repo create <your-project> --template graphanov/open-scaffold --clone`.

### 2. Bootstrap the mission

```bash
./bootstrap.sh
```

Bootstrap asks what the project is, what it should achieve, and what it should not do. That mission gates later plans.

### 3. Write the first plan

If the goal is clear, tell your agent:

```text
Write a plan in .osc/plans/active/ for <task> using .osc/plans/handoff-template.md.
```

If the goal is fuzzy, park the plan in backlog first, then move it to active when it becomes the work you are actually doing. Fill the template with short bullets; the important parts are goal, acceptance criteria, and verification. The helpers create files and TODO prompts; they do **not** invent acceptance criteria for you:

```bash
osc plan new my-first-task --stage backlog
osc plan move my-first-task --to active
# or, without local install:
npx open-scaffold plan new my-first-task --stage backlog
npx open-scaffold plan move my-first-task --to active
```

Use `--to blocked` when a plan needs to wait for input, credentials, or a product decision.

Shell fallback remains supported:

```bash
cp .osc/plans/handoff-template.md .osc/plans/active/my-first-task.md
```

### 4. Verify, amend if needed, record evidence, and close

```bash
./verify.sh
osc amend my-first-task --message "scope changed" # only when new learning changes the plan
# or, without local install: npx open-scaffold amend my-first-task --message "scope changed"
osc evidence new my-first-task
# or, without local install: npx open-scaffold evidence new my-first-task
osc close my-first-task --message "verified first task"
# or, without local install: npx open-scaffold close my-first-task --message "verified first task"
```

Use `./verify.sh --standard` before calling a meaningful slice done. The amendment helper creates `<slug>-amendment-N.md` with TODO prompts and stamps `MISSION.md`; fill those TODOs before continuing. The evidence helper creates `.osc/releases/<date>-my-first-task.md` with TODO prompts; replace them with real commands, results, PR links, and follow-up before closing the plan.

Shell fallbacks remain supported:

```bash
./amend.sh my-first-task --message "scope changed"
./close.sh my-first-task --message "verified first task"
```

### 5. Optional: package a plan for an agent/runtime

You can stop after verification and evidence. Only create a `run.json` work package — the run packet — when another tool, adapter, or human needs a structured handoff file. Open Scaffold still does not spawn agents.

Example:

```bash
npx open-scaffold run .osc/plans/active/my-first-task.md \
  --task-id TASK-001 \
  --runtime omx \
  --workflow plan \
  --operator-surface github \
  --repo "$PWD"
```

Here `--operator-surface` means the place humans see status and approvals, such as GitHub comments, chat, or a CLI. For custom runtimes, add a project-local profile in `.osc/runtimes/<id>.json`, then use `--runtime <id>`. Read this in layers:

1. [`docs/RUNTIME_SELECTION.md`](docs/RUNTIME_SELECTION.md) — choosing `--runtime` and `--workflow`;
2. [`docs/RUNTIME_PROFILES.md`](docs/RUNTIME_PROFILES.md) — built-in and project-local runtime profiles;
3. [`docs/RUNTIME_BINDING_CONTRACT.md`](docs/RUNTIME_BINDING_CONTRACT.md) — what an adapter/coordinator must do after the `run.json` package exists.

---

## Runtime-neutral by design

Open Scaffold is not an agent runtime, Discord bot, PR reviewer, or task database. It is the repo protocol those tools can share.

- **Coordinators / task state:** GitHub Issues, Linear/Jira, custom bots, or private deployment examples such as Hermes Kanban decide what should happen next.
- **Runtime lanes:** Claude Code, Codex, Cursor, Gemini, OMC, OMX, Aider, or a human terminal can execute bounded work outside Open Scaffold core.
- **Status / approval channels (operator surfaces):** Discord, Slack, Telegram, GitHub comments, or CLI dashboards can show status and collect approvals.
- **Core truth:** mission, plans, amendments, `run.json` work packages, evidence, decisions, and release notes stay in the repo.

Full map: [`docs/OPEN_SCAFFOLD_SYSTEM.md`](docs/OPEN_SCAFFOLD_SYSTEM.md), [`docs/TASK_RUN_MODEL.md`](docs/TASK_RUN_MODEL.md), [`docs/GITHUB_WORKFLOW.md`](docs/GITHUB_WORKFLOW.md), and [`docs/REFERENCE_TRUTH.md`](docs/REFERENCE_TRUTH.md).

---

## When it helps

Open Scaffold is useful when work needs to survive context loss:

- multi-session AI-assisted development;
- consulting and client delivery, where "what was asked, decided, and verified" must be reviewable later;
- compliance or audit-sensitive work that wants lightweight, file-level evidence instead of a heavier governance stack;
- multi-agent handoffs where chat history is not enough;
- projects where "done" needs acceptance criteria and verification, not vibes.

It is overkill for one-off scripts, disposable prototypes, or tasks that fit in a single clean session. The scaffold is the repo foundation; it does not replace SOC 2, ISO, or formal audit tooling — it gives those processes durable repo artifacts to point at.

---

## Where the roadmap is going

The current product direction is: make the source-of-truth loop undeniable, then let external runtimes plug into it through profiles and adapters. Open Scaffold now supports runtime selection and runtime profiles, but core still does not install, spawn, supervise, or benchmark runtimes.

Package note: the root `open-scaffold` npm package ships the core CLI, scaffold files, and docs. In-repo runtime package paths such as `packages/runtime-omx/` are GitHub source references today; they are not included in the root npm payload and would need a separate owner-approved runtime-package release before package users can install them from npm.

Near-term roadmap work should improve clarity, adapter evidence, and validation. Real runtime launching, hosted registries, marketplace behavior, and model/task recommendations remain future hypotheses until separately designed and proven. See the [roadmap](ROADMAP.md) for the current milestone list.

---

## Key docs

- [`docs/WHY_OPEN_SCAFFOLD.md`](docs/WHY_OPEN_SCAFFOLD.md) — visual story: problem, loop, system boundary, fit.
- [`MISSION.md`](MISSION.md) — product goals, non-goals, and scope changelog.
- [`ROADMAP.md`](ROADMAP.md) — product direction and milestones.
- [`docs/COMPARISON.md`](docs/COMPARISON.md) — honest orientation against adjacent AI workflow systems.
- [`docs/RUNTIME_SELECTION.md`](docs/RUNTIME_SELECTION.md) — runtime selection flow for OMC/OMX-style lanes.
- [`docs/RUNTIME_PROFILES.md`](docs/RUNTIME_PROFILES.md) — built-in and project-local runtime profile contract.
- [`.osc/RULES.md`](.osc/RULES.md) — compact operating rules.
- [`.osc/plans/WORKFLOW.md`](.osc/plans/WORKFLOW.md) — how plans move through backlog, active, done, and blocked.
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — phase-to-tool guide.
- [`docs/SLICE_CLOSE_PROTOCOL.md`](docs/SLICE_CLOSE_PROTOCOL.md) — evidence-backed completion / slice closure.
- [`docs/GLASS_COCKPIT_PROTOCOL.md`](docs/GLASS_COCKPIT_PROTOCOL.md) — chat/control-room status surfaces.
- [`docs/FAQ.md`](docs/FAQ.md) — deeper explanations.
- [`docs/REFERENCE_TRUTH.md`](docs/REFERENCE_TRUTH.md) — labels for public, private, future, and adapter tool references.

---

## Dogfooded

Open Scaffold is built with Open Scaffold. The repo contains its own roadmap, plans, evidence notes, decisions, and PR history so the method can be inspected instead of merely claimed.
