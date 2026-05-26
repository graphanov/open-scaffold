<div align="center">

# 🧱 open-scaffold

**A work record and evolution ledger for AI-assisted software.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Template](https://img.shields.io/badge/GitHub-Template-blue.svg)](https://github.com/graphanov/open-scaffold/generate)
[![Works with](https://img.shields.io/badge/Works%20with-Any%20agent-green.svg)](#runtime-neutral-by-design)
[![Dev Container](https://img.shields.io/badge/Dev%20Container-Ready-0A7EBE.svg)](docs/DEV_CONTAINER.md)

</div>

AI work should not disappear into chat logs.

Open Scaffold keeps the important parts in your repo: the goal, the plan, the handoff package, the evidence, the approval trail, and the lessons from repeated attempts.

Use it when AI-assisted work needs **control**, **clarity**, **reviewability**, **handoff**, or **improvement over time**.

It does not replace your agent, IDE, task tracker, or CI. Those tools do the work. Open Scaffold records what was asked, what was handed off, what came back, what was checked, and what humans approved.

---

## What Open Scaffold adds

- **Control** — scope, constraints, and approval gates stay visible.
- **Clarity** — the mission, plan, and next action live in the repo.
- **Reviewability** — evidence, checks, and decisions stay attached to the work.
- **Handoff** — `run.json` packages work for an agent, runtime, teammate, or future session.
- **Improvement loops** — `osc evolve` records repeated attempts, compares them, and explains which one became the frontier.

Under the hood, this is just files:

```text
MISSION.md                         why this repo exists
.osc/plans/                        scoped work with acceptance criteria
.osc/runs/<run_id>/run.json         handoff package for a worker or reviewer
.osc/releases/                     evidence notes and release records
.osc/evolution/<loop_id>/           attempts, comparison, and frontier history
```

---

## The basic loop

```text
        goal
         │
         ▼
      plan.md
         │
         ▼
  handoff package
      run.json
         │
         ▼
 agent / runtime / human
         │
         ▼
      output
         │
         ▼
 evidence + verification
         │
         ▼
 review / approve / amend
         │
         ▼
 durable repo record
```

Chat, Discord, terminals, GitHub comments, and agent transcripts can help operate the work. They are not the source of truth. The repo record is.

### Target workflow

The post-v1 target is a smoother Codex-first path that starts from plain intent while preserving the same record:

```bash
osc work "Add a /health endpoint with tests" --runtime codex
```

That command is future direction, not a current v1 promise. The first no-spawn step is `osc start`, which prints a paste-ready Codex/OMX handoff prompt from an existing plan without launching a runtime. The next explicit bridge is `osc dispatch .osc/runs/RUN_ID/run.json --adapter <id>`, which invokes a reviewed local adapter config and captures receipt/evidence/log paths without auto-installing providers or granting commit/push/PR/merge/publish authority. The remaining staged path is: `osc work --dry-run` → optional gated execution after a separate safety decision. See [`docs/RUNTIME_ADOPTION_WORKFLOW.md`](docs/RUNTIME_ADOPTION_WORKFLOW.md).

---

## When one attempt is not enough

Modern AI work often means trying the same task more than once: a better prompt, a different runtime, a stronger review pass, or a repaired implementation.

Open Scaffold records that loop instead of burying the decision in chat.

```text
One task, several attempts

                ┌─ attempt A ─ evidence ─ result
                │
goal + plan ────┼─ attempt B ─ evidence ─ result
                │
                └─ attempt C ─ evidence ─ result
                                      │
                                      ▼
                                evolve compare
                                      │
                                      ▼
                           frontier: "C won because..."
```

Example:

```bash
npx open-scaffold evolve init .osc/plans/active/my-task.md \
  --out .osc/evolution/my-task \
  --strategy manual

npx open-scaffold evolve record .osc/evolution/my-task \
  --run .osc/runs/<run_id>/run.json \
  --decision promote \
  --rationale "Best evidence so far."

npx open-scaffold evolve compare .osc/evolution/my-task \
  --format markdown \
  --out .osc/releases/evolution-compare.md
```

`osc evolve` records attempt/frontier state only. It does not launch agents, rank models, certify compliance, or approve releases.

For the one-screen version, see [`docs/examples/evolution-loop-compare.md`](docs/examples/evolution-loop-compare.md). For a small fixture you can run locally, see [`examples/evolution-ledger-demo/`](examples/evolution-ledger-demo/).

---

## Quickstart

This is the smallest useful path: add the scaffold, define the mission, create one active plan, verify, record evidence, and close the slice.

### 1. Add Open Scaffold to a repo

```bash
npx open-scaffold init --tier min --target <your-project>
cd <your-project>
```

Use `--tier standard` for README/roadmap, agent instructions, and core docs.

For an existing repo:

```bash
npx open-scaffold init --from-existing --tier min --target .
```

Source checkout fallback:

```bash
git clone https://github.com/graphanov/open-scaffold open-scaffold
cd open-scaffold
npm install
npm run build
node dist/cli.js init --tier standard --target <your-project>
```

Optional container path: clone the repo, open it with VS Code Dev Containers or GitHub Codespaces, and the bundled `.devcontainer/` provides Node.js 22, npm, git, and `osc`. See [`docs/DEV_CONTAINER.md`](docs/DEV_CONTAINER.md) for Docker-only use and customization.

### 2. Define the mission

```bash
./bootstrap.sh
```

The mission says what this repo is trying to do and what it should not do. Plans are blocked until the mission exists.

### 3. Write a plan

```bash
osc plan new my-first-task --stage active
osc plan validate my-first-task
# or without local install:
npx open-scaffold plan new my-first-task --stage active
npx open-scaffold plan validate my-first-task
```

If the goal is fuzzy, create it in backlog first:

```bash
osc plan new my-idea --stage backlog
osc plan move my-idea --to active
# or without local install:
npx open-scaffold plan new my-idea --stage backlog
npx open-scaffold plan move my-idea --to active
```

Shell fallback:

```bash
cp .osc/plans/handoff-template.md .osc/plans/active/my-first-task.md
```

### 4. Verify, record evidence, and close

```bash
./verify.sh --standard
osc evidence new my-first-task
osc close my-first-task --message "verified first task"
# or without local install:
npx open-scaffold evidence new my-first-task
npx open-scaffold close my-first-task --message "verified first task"
```

If the scope changes, amend instead of rewriting history:

```bash
osc amend my-first-task --message "scope changed after review"
# or without local install:
npx open-scaffold amend my-first-task --message "scope changed after review"
```

Shell fallbacks remain available:

```bash
./amend.sh my-first-task --message "scope changed after review"
./close.sh my-first-task --message "verified first task"
```

### 5. Optional: hand off to another tool

To print a paste-ready prompt for a Codex/OMX worker without writing run artifacts or launching anything:

```bash
osc start .osc/plans/active/my-first-task.md --runtime codex
# or without local install:
npx open-scaffold start .osc/plans/active/my-first-task.md --runtime codex
```

Open Scaffold can also write a durable handoff file for an agent, runtime, teammate, or future session:

```bash
npx open-scaffold run .osc/plans/active/my-first-task.md \
  --task-id TASK-001 \
  --runtime codex \
  --workflow plan \
  --operator-surface github \
  --repo "$PWD"
```

That creates a `run.json` work package. The outside tool executes. Evidence comes back into the repo.

---

## v1.0.x stable release line

Open Scaffold v1.0.x means the repo protocol and day-two CLI are stable enough to adopt with semver expectations. It does **not** mean every experimental integration is frozen.

Stable:

- CLI: `osc init`, `osc status`, `osc plan new`, `osc plan validate`, `osc plan move`, `osc amend`, `osc close`, `osc evidence new`, `osc evidence collect`, and `osc verify`.
- Protocol: `MISSION.md`, `ROADMAP.md`, `.osc/plans/`, the 7-section plan schema, folder-as-status workflow, amendments, evidence notes, and run-packet records.
- Verification floor: `verify.sh` plus package tests/builds for this repository.

Experimental:

- Runtime profiles and runtime-selection helpers beyond no-spawn run-packet metadata.
- MCP, glass cockpit webhooks, local task database helpers, TUI/web dashboards, runtime packages, and Python parser packaging.

Future / not included:

- Native autonomous spawning in core.
- Compliance certification.
- Provider/model benchmarking or ranking.

Use cases the stable contract supports today:

- solo developers who need multi-session AI work to be resumable;
- teams that want PRs to carry intent, evidence, and approval state;
- consulting or audit-sensitive delivery where later readers need to reconstruct what happened.

Publication truth lives outside git, and the two public surfaces move separately. Check `npm view open-scaffold version dist-tags --json` to see which package `npx open-scaffold@latest` installs. Check the GitHub Release marked **Latest** to see which release note GitHub highlights. Until npm shows `1.0.0`, the install path is still the previous package; until GitHub Releases shows `v1.0.0` as **Latest**, the release page is still on the previous release. See [`docs/STABILITY.md`](docs/STABILITY.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md), and the landing page [`docs/index.html`](docs/index.html).

---

## Simple mental model

- **You** decide the goal, taste, risk, merge, and publish gates.
- **Your agent or runtime** does the implementation work.
- **Open Scaffold** keeps the work record in files.
- **A handoff package** tells a worker what to do and what evidence to return.
- **Evidence notes** show what happened and how it was checked.
- **The evolution ledger** compares repeated attempts and records the current best one.

If you want a plain one-off agent session with no later review, you probably do not need Open Scaffold.

---

## Runtime-neutral by design

Open Scaffold is not an agent runtime, Discord bot, daemon, task database, model ranker, or code reviewer.

It is the repo record those tools can share.

```text
Open Scaffold core = plan + handoff package + evidence expectations
Runtime adapter    = translate + launch outside core + return receipt/evidence
Runtime harness    = execute while alive
Human/operator     = approve, reject, merge, publish, or redirect
```

Supported tools can include Claude Code, Codex, Cursor, Gemini, OMC, OMX, Aider, GitHub Issues, Linear/Jira, Discord, Slack, Telegram, or a human terminal. Core stays portable: files first, no hidden spawning.

---

## When it helps

Use Open Scaffold for:

- multi-session AI-assisted development;
- PRs where reviewers need intent, checks, and evidence;
- consulting or client delivery where the work must be explainable later;
- audit-sensitive or regulated-adjacent work that needs lightweight file-level evidence;
- multi-agent handoffs where chat history is not enough;
- repeated attempts where you need to know which one won and why.

Skip it for:

- one-off scripts;
- disposable prototypes;
- tiny tasks that fit in one clean session;
- work nobody needs to review later.

---

## Key docs

- [`docs/WHY_OPEN_SCAFFOLD.md`](docs/WHY_OPEN_SCAFFOLD.md) — visual story and fit.
- [`docs/index.html`](docs/index.html) — one-page landing page for the 30-second explanation.
- [`docs/RUNTIME_ADOPTION_WORKFLOW.md`](docs/RUNTIME_ADOPTION_WORKFLOW.md) — post-v1 Codex-first `osc work` target and staged adapter path.
- [`docs/MINIMUM_VIABLE_SCAFFOLD.md`](docs/MINIMUM_VIABLE_SCAFFOLD.md) — smallest practical day-one adoption path.
- [`docs/STABILITY.md`](docs/STABILITY.md) — v1.0.0 stable, experimental, and future surfaces.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — curated release history.
- [`docs/DEV_CONTAINER.md`](docs/DEV_CONTAINER.md) — optional container setup for consistent team onboarding.
- [`docs/EVOLUTION_LOOP.md`](docs/EVOLUTION_LOOP.md) — attempts, frontier promotion, and `osc evolve`.
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md) — examples and viewer demos.
- [`docs/OPEN_SCAFFOLD_SYSTEM.md`](docs/OPEN_SCAFFOLD_SYSTEM.md) — full system map and boundaries.
- [`docs/RUNTIME_SELECTION.md`](docs/RUNTIME_SELECTION.md) — choosing runtime lanes and profiles.
- [`docs/RUNTIME_BINDING_CONTRACT.md`](docs/RUNTIME_BINDING_CONTRACT.md) — adapter responsibilities after `run.json` exists.
- [`docs/FAQ.md`](docs/FAQ.md) — deeper questions.

Translations for agent entry files: Chinese, Japanese, Korean, Spanish, Portuguese. See [`docs/TRANSLATIONS.md`](docs/TRANSLATIONS.md).

---

## Dogfooded

Open Scaffold is built with Open Scaffold. This repo contains its own roadmap, plans, evidence notes, decisions, releases, and PR history so the method can be inspected instead of merely claimed.
