<div align="center">

# 🧱 open-scaffold

**A work record and evolution ledger for AI-assisted software.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Template](https://img.shields.io/badge/GitHub-Template-blue.svg)](https://github.com/graphanov/open-scaffold/generate)
[![Works with](https://img.shields.io/badge/Works%20with-Any%20agent-green.svg)](#runtime-neutral-by-design)

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

## Recommended default flow

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

### 5. Optional: package work for another tool

Open Scaffold can write a handoff file for an agent, runtime, teammate, or future session:

```bash
npx open-scaffold run .osc/plans/active/my-first-task.md \
  --task-id TASK-001 \
  --runtime omx \
  --workflow plan \
  --operator-surface github \
  --repo "$PWD"
```

That creates a `run.json` work package. The outside tool executes. Evidence comes back into the repo.

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
- [`docs/EVOLUTION_LOOP.md`](docs/EVOLUTION_LOOP.md) — attempts, frontier promotion, and `osc evolve`.
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md) — examples and viewer demos.
- [`docs/OPEN_SCAFFOLD_SYSTEM.md`](docs/OPEN_SCAFFOLD_SYSTEM.md) — full system map and boundaries.
- [`docs/RUNTIME_SELECTION.md`](docs/RUNTIME_SELECTION.md) — choosing runtime lanes and profiles.
- [`docs/RUNTIME_BINDING_CONTRACT.md`](docs/RUNTIME_BINDING_CONTRACT.md) — adapter responsibilities after `run.json` exists.
- [`docs/FAQ.md`](docs/FAQ.md) — deeper docs.

Translations for agent entry files: Chinese, Japanese, Korean, Spanish, Portuguese. See [`docs/TRANSLATIONS.md`](docs/TRANSLATIONS.md).

---

## Dogfooded

Open Scaffold is built with Open Scaffold. This repo contains its own roadmap, plans, evidence notes, decisions, releases, and PR history so the method can be inspected instead of merely claimed.
