<div align="center">

# 🧱 open-scaffold

**Your AI agent's work belongs in your repo, not its chat history.**

A repo-native work record for AI-assisted work.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Template](https://img.shields.io/badge/GitHub-Template-blue.svg)](https://github.com/graphanov/open-scaffold/generate)
[![Works with](https://img.shields.io/badge/Works%20with-Any%20agent-green.svg)](#runtime-neutral-by-design)
[![Dev Container](https://img.shields.io/badge/Dev%20Container-Ready-0A7EBE.svg)](docs/DEV_CONTAINER.md)

</div>

Open Scaffold gives AI-assisted work a durable repo record.

It keeps the goal, plan, handoff, evidence, approval trail, and lessons from repeated attempts in git-tracked files that a human, agent, runtime, or future session can inspect cold.

Any agent or operator can **resume bounded work straight from the repo after total chat-context loss** — no re-explaining needed. Start at [`docs/START_HERE.md`](docs/START_HERE.md), try the committed mid-flight fixture at [`examples/resume-demo/`](examples/resume-demo/), or read the narrated path in [`docs/RESUME_WALKTHROUGH.md`](docs/RESUME_WALKTHROUGH.md).

Use it when AI-assisted work needs **control**, **clarity**, **reviewability**, **handoff**, or **improvement over time**.

It does not replace your agent, IDE, task tracker, CI, or compliance process. Those tools do the work or run the program. Open Scaffold records what was asked, what was handed off, what came back, what was checked, and what humans approved. For the boundary between structural evidence and process assurance, see [`docs/AUDITABILITY.md`](docs/AUDITABILITY.md).

---

## What Open Scaffold adds

- **Control** — scope, constraints, and approval gates stay visible.
- **Clarity** — the mission, plan, and next action live in the repo.
- **Reviewability** — evidence, checks, and decisions stay attached to the work.
- **Handoff** — `run.json` packages work for an agent, runtime, teammate, or future session.
- **Improvement loops** — repeated attempts can be recorded after the core work record is in place.

Under the hood, this is just files:

```text
MISSION.md                         why this repo exists
.osc/plans/                        scoped work with acceptance criteria
.osc/runs/<run_id>/run.json         handoff package for a worker or reviewer
.osc/releases/                     evidence notes and release records
```

---

## Try the core idea in 30 seconds

From this repository checkout, you do not need a runtime, provider account, or full scaffold to see the point. Compare two included attempts and get a reviewable work-record artifact:

```bash
npx open-scaffold@latest compare \
  examples/attempt-compare/attempt-a \
  examples/attempt-compare/attempt-b
```

In a source checkout, after `npm install`:

```bash
npm run osc -- compare \
  examples/attempt-compare/attempt-a \
  examples/attempt-compare/attempt-b
```

This does not run an agent and does not choose an objective winner. It shows the core pattern: attempts become inspectable files, the differences become reviewable, and the decision can be recorded instead of disappearing into chat.

---

## The basic loop

```text
MISSION.md
    │
    ▼
plan.md
    │
    ├─ optional amendment when scope changes
    │
    ▼
run.json handoff package
    │
    ▼
agent / runtime / human output
    │
    ▼
evidence
    │
    ▼
verification
    │
    ▼
close the slice
```

Chat, Discord, terminals, GitHub comments, and agent transcripts can help operate the work. They are not the source of truth. The repo record is.

## Quickstart

This is the smallest stable path: add the scaffold, define `MISSION.md`, create one active plan, optionally hand it off with a run packet or amendment, capture evidence, verify, and close the slice.

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

### 4. Optional: create a run packet or amendment

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

If the scope changes, amend instead of rewriting history:

```bash
osc amend my-first-task --message "scope changed after review"
# or without local install:
npx open-scaffold amend my-first-task --message "scope changed after review"
```

Shell fallbacks remain available:

```bash
./amend.sh my-first-task --message "scope changed after review"
```

### 5. Verify, record evidence, and close

```bash
./verify.sh --standard
osc trace my-first-task
osc evidence new my-first-task
osc close my-first-task --message "verified first task"
# or without local install for the evidence/close helpers:
npx open-scaffold evidence new my-first-task
npx open-scaffold close my-first-task --message "verified first task"
```

`osc trace` replays the local work record for review; evidence-chain verification checks whether structural links are intact.

Shell fallback:

```bash
./close.sh my-first-task --message "verified first task"
```

---

## Lab preview: plain-intent work

The post-v1 target is a smoother Codex-first path that starts from plain intent while preserving the same record. The first natural-language composition is dry-run only:

```bash
osc work "Add a /health endpoint with tests" --runtime codex --dry-run
```

`osc work --dry-run` previews a candidate plan, run packet, and dispatch command without writing files, launching a runtime, calling provider APIs, or granting commit/push/PR/merge/publish authority. The supporting no-spawn pieces remain explicit: `osc start` prints a paste-ready Codex/OMX handoff from an existing plan, and `osc dispatch .osc/runs/RUN_ID/run.json --adapter <id>` invokes a reviewed local adapter config and captures receipt/evidence/log paths. Full execution remains future work behind a separate safety decision. See [`docs/RUNTIME_ADOPTION_WORKFLOW.md`](docs/RUNTIME_ADOPTION_WORKFLOW.md).

---

## When one compare is not enough

The 30-second `osc compare` demo is the simplest version: two attempts, one reviewable comparison. Real AI work often means trying the same task more than once: a better prompt, a different runtime, a stronger review pass, or a repaired implementation.

Open Scaffold can record that larger loop too, without burying the decision in chat.

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

`osc evolve` records attempt/frontier state only. It is a record, not an execution, compliance, model-evaluation, or approval system.

For the one-screen version, see [`docs/examples/evolution-loop-compare.md`](docs/examples/evolution-loop-compare.md). For a small fixture you can run locally, see [`examples/evolution-ledger-demo/`](examples/evolution-ledger-demo/).

---

## Current pre-1.0 hardening line

Open Scaffold is usable, but it is still in active credibility and adoption hardening. The forward-moving package line is `v0.20.x`: stable enough to try on real repos, honest enough not to pretend every workflow, runtime boundary, and public surface is final.

Stable enough to rely on today:

- CLI: `osc init`, `osc status`, `osc plan new`, `osc plan validate`, `osc plan move`, `osc amend`, `osc close`, `osc evidence new`, `osc evidence collect`, `osc verify`, `osc trace`, and read-only `osc compare`.
- Protocol: `MISSION.md`, `ROADMAP.md`, `.osc/plans/`, the 7-section plan schema, folder-as-status workflow, amendments, evidence notes, and run-packet records.
- Verification floor: `verify.sh` plus package tests/builds for this repository.

Still experimental:

- Runtime profiles and runtime-selection helpers beyond no-spawn run-packet metadata.
- `osc work --dry-run`, `osc dispatch`, MCP, glass cockpit webhooks, local task database helpers, TUI/web dashboards, runtime packages, and Python parser packaging.

Future / not included:

- Native agent spawning in core.
- Compliance certification.
- Provider/model benchmarking.

Use cases the current contract supports today:

- people and teams who need multi-session AI work to be resumable;
- teams that want PRs to carry intent, evidence, and approval state;
- consulting or audit-sensitive delivery where later readers need to reconstruct what happened.

Publication truth lives outside git, and the two public surfaces move separately. Check `npm view open-scaffold version dist-tags --json` to see which package `npx open-scaffold@latest` installs. Check the GitHub Release marked **Latest** to see which release note GitHub highlights. The historical `v1.0.5` / `v1.0.x` tags remain published history; the current forward-moving line is `v0.20.x` until the protocol and product surface earn a real 1.0 again. See [`docs/VERSION_TRUTH.md`](docs/VERSION_TRUTH.md), [`docs/STABILITY.md`](docs/STABILITY.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md), and the landing page [`docs/index.html`](docs/index.html).

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

- multi-session AI-assisted work;
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
- [`docs/STABILITY.md`](docs/STABILITY.md) — current package-contract, experimental, and future surfaces.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — curated release history.
- [`docs/TRACE.md`](docs/TRACE.md) — replaying a plan's local work record with `osc trace`.
- [`docs/DEV_CONTAINER.md`](docs/DEV_CONTAINER.md) — optional container setup for consistent team onboarding.
- [`docs/EVOLUTION_LOOP.md`](docs/EVOLUTION_LOOP.md) — attempts, frontier records, and `osc evolve`.
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md) — examples and viewer demos.
- [`docs/OPEN_SCAFFOLD_SYSTEM.md`](docs/OPEN_SCAFFOLD_SYSTEM.md) — full system map and boundaries.
- [`docs/RUNTIME_SELECTION.md`](docs/RUNTIME_SELECTION.md) — choosing runtime lanes and profiles.
- [`docs/RUNTIME_BINDING_CONTRACT.md`](docs/RUNTIME_BINDING_CONTRACT.md) — adapter responsibilities after `run.json` exists.
- [`docs/FAQ.md`](docs/FAQ.md) — deeper questions.

Translations for agent entry files: Chinese, Japanese, Korean, Spanish, Portuguese. See [`docs/TRANSLATIONS.md`](docs/TRANSLATIONS.md).

---

## Dogfooded

Open Scaffold is built with Open Scaffold. This repo contains its own roadmap, plans, evidence notes, decisions, releases, and PR history so the method can be inspected instead of merely claimed.

For proof of use **outside** this repo, see [`docs/examples/downstream-proof.md`](docs/examples/downstream-proof.md): [`tally`](https://github.com/graphanov/tally), a small standalone CLI where one real feature was planned, executed, verified, and closed as an Open Scaffold work record.
