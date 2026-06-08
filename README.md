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

It does not replace your agent, IDE, task tracker, CI, or compliance process. Those tools do the work or run the program. Open Scaffold records what was asked, what was handed off, what came back, what was checked, and what humans approved. For the boundary between structural evidence and process assurance, see [`docs/AUDITABILITY.md`](docs/AUDITABILITY.md) and [`docs/TRUST_BOUNDARIES.md`](docs/TRUST_BOUNDARIES.md).

Open Scaffold does not make models smarter and one fixture is not universal benchmark proof. The current value claim under test is narrower: workflow control, handoff recovery, governance, and measured controller-output efficiency. Any efficiency claim needs a diagnostic/experimental before/after artifact such as `osc evolve analyze --efficiency` or a source-labeled proof manifest checked with `osc prove compare`; do not promote token, cost, or quality wins from prose alone. See [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md) for the bounded naked-Codex comparison fixture.

**First command for an existing repo:**

```bash
npx open-scaffold@latest first-run \
  --non-interactive \
  --slug first-work-record \
  --mission "Describe what this repository is trying to accomplish." \
  --goal "Complete one reviewed local change."
```

That creates the minimum record: `MISSION.md`, one active plan, one evidence skeleton, and the exact validation/trace/close commands to run next. It does not spawn a runtime, call provider APIs, commit, push, publish, deploy, or prove correctness.

**Use Open Scaffold when:** AI-assisted work needs a durable plan/evidence/approval trail, handoff after context loss, PR review support, or repeated-attempt learning. **Skip it when:** the task is a throwaway one-liner, the repo owner does not want files added, or a compliance/sandbox/runtime guarantee is required without a separate system that actually provides it.

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
.osc/runs/<run_id>/feedback.jsonl   feedback and repair hypotheses
.osc/improvements/applied/         accepted lessons future runs can inherit
.osc/bench/                        benchmark/reproduction receipts
.osc/releases/                     evidence notes and release records
```

---

## Harness command surface

Open Scaffold is also a small-command harness for AI-assisted work:

> Open Scaffold helps clarify the task, plan it in the repo, run controlled AI workers, preserve evidence, learn from feedback, and test whether the workflow actually helped.

The human-facing grammar is intentionally small:

| Command | Meaning |
| --- | --- |
| `$interview` | Clarify messy intent into a bounded work package. |
| `$plan` | Create or amend the repo-native Open Scaffold plan. |
| `$work` | Package one bounded slice for controlled runtime execution. |
| `$team` | Package multiple coordinated worker lanes with shared evidence. |

For shell, CI, tests, and adapter integrations, use the backend CLI:

```bash
osc harness '$interview "clarify this work"' --json
osc harness '$plan "add the harness docs" --slug harness-docs'
osc harness '$work "implement one bounded slice" --context "plan is ready"' --json
osc harness '$team "split implementation docs review" --worker implementation --worker docs --worker review'
```

Feedback is part of `$work` and `$team`, not a fifth top-level UX command. Backend commands can record/analyze it for scripts:

```bash
osc feedback record <run-id> --source tests --verdict retry --scope run \
  --what-happened "Verification failed" \
  --why-it-matters "The run is not ready to claim pass" \
  --repair-hypothesis "Fix the failed check and rerun" \
  --next-action retry
osc feedback analyze <run-id>
```

Benchmarks and handoff labs write proof receipts, but they do not authorize broad claims:

```bash
osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke
osc bench handoff-lab --out .osc/bench/handoff-lab-15
```

Humans still own merge, publish, release, deployment, and approval gates. Open Scaffold core packages work and records receipts; adapters or humans execute it. Read more in [`docs/HARNESS_COMMANDS.md`](docs/HARNESS_COMMANDS.md), [`docs/HARNESS_ARCHITECTURE.md`](docs/HARNESS_ARCHITECTURE.md), [`docs/FEEDBACK_IMPROVEMENT_LOOP.md`](docs/FEEDBACK_IMPROVEMENT_LOOP.md), [`docs/HARNESS_REPRODUCIBILITY.md`](docs/HARNESS_REPRODUCIBILITY.md), [`docs/HANDOFF_COMPILER.md`](docs/HANDOFF_COMPILER.md), [`docs/CONTROL_ROOM_FOUNDATION.md`](docs/CONTROL_ROOM_FOUNDATION.md), and the source-prototype migration roadmap in [`docs/JOHN_LOMEIN_MIGRATION_ROADMAP.md`](docs/JOHN_LOMEIN_MIGRATION_ROADMAP.md).

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

To inspect the first bounded scaffolded-vs-naked-Codex proof fixture from a source checkout:

```bash
npm run osc -- prove compare examples/proof/scaffold-vs-naked-codex/manifest.json --format markdown
```

That proof fixture reports source-labeled quality, token, speed, and evolution-loop metrics. It is a bounded cold-resume result, not a claim that Open Scaffold wins every task.

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

For a one-command local starting point in an existing repo, use the guided non-interactive flow:

```bash
npx open-scaffold@latest first-run \
  --non-interactive \
  --slug first-work-record \
  --mission "Describe what this repository is trying to accomplish." \
  --goal "Complete one reviewed local change."
```

For the step-by-step path, continue below.

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

Historical/repositioned migration note: earlier builds exposed `osc work --dry-run` as a plain-intent composition preview. The reduced maintained CLI removes `osc work`; use the explicit no-spawn path instead:

```bash
osc plan new <slug> --stage active
osc run .osc/plans/active/<slug>.md --runtime codex --workflow plan
osc dispatch .osc/runs/RUN_ID/run.json --adapter <id>
```

Use `osc run ... --dry-run` only to preview the run packet; rerun without
`--dry-run` before dispatch so `.osc/runs/RUN_ID/run.json` actually exists.

The explicit path keeps planning, run packaging, and adapter dispatch reviewable without making Open Scaffold core a runtime. A future `osc work` controller remains a backlog/safety-design topic, not a live current command. See [`docs/RUNTIME_ADOPTION_WORKFLOW.md`](docs/RUNTIME_ADOPTION_WORKFLOW.md) for the historical controller rationale and migration context.

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

`osc evolve` records attempt/frontier state only. It is a record, not an execution, compliance, model-evaluation, benchmark-proof, or approval system. `osc evolve analyze --compact` prints a pasteable controller signal, and `osc evolve analyze --efficiency` computes before/after output-overhead metrics for that signal.

For the one-screen version, see [`docs/examples/evolution-loop-compare.md`](docs/examples/evolution-loop-compare.md). For a small fixture you can run locally, see [`examples/evolution-ledger-demo/`](examples/evolution-ledger-demo/).

---

## Current pre-1.0 hardening line

Open Scaffold is usable, but it is still in active credibility and adoption hardening. The forward-moving package line is `v0.31.x` after the framework cleanup shrink: stable enough to try on real repos, honest enough not to pretend every workflow, runtime boundary, and public surface is final.

Stable enough to rely on today:

- CLI: `osc init`, `osc first-run`, `osc status`, `osc plan new`, `osc plan validate`, `osc plan move`, `osc amend`, `osc close`, `osc evidence new`, `osc evidence collect`, `osc verify`, `osc trace`, `osc pr check`, adapter trust inspection, schema registry inspection, and read-only `osc compare`.
- Protocol: `MISSION.md`, `ROADMAP.md`, `.osc/plans/`, the Status + seven content-heading plan schema, folder-as-status workflow, amendments, evidence notes, and run-packet records.
- Verification floor: `verify.sh` plus package tests/builds for this repository.

Still experimental:

- Runtime profiles and runtime-selection helpers beyond no-spawn run-packet metadata.
- `osc dispatch`, MCP, glass cockpit webhooks, runtime packages, and Python parser packaging. Historical/repositioned surfaces such as `osc work --dry-run`, local task database helpers, and TUI/web dashboards are not live maintained CLI commands after the framework cleanup.

Future / not included:

- Native agent spawning in core.
- Compliance certification.
- Provider/model benchmarking.

Use cases the current contract supports today:

- people and teams who need multi-session AI work to be resumable;
- teams that want PRs to carry intent, evidence, and approval state;
- consulting or audit-sensitive delivery where later readers need to reconstruct what happened.

Publication truth lives outside git, and the two public surfaces move separately. Check `npm view open-scaffold version dist-tags --json` to see which package `npx open-scaffold@latest` installs. Check the GitHub Release marked **Latest** to see which release note GitHub highlights. The historical `v1.0.5` / `v1.0.x` tags remain published history; the current forward-moving line is `v0.31.x` after the framework cleanup shrink and remains pre-1.0 until the protocol and product surface earn a mature stability claim. See [`docs/VERSION_TRUTH.md`](docs/VERSION_TRUTH.md), [`docs/STABILITY.md`](docs/STABILITY.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md), and the landing page [`docs/index.html`](docs/index.html).

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
- [`docs/RUNTIME_ADOPTION_WORKFLOW.md`](docs/RUNTIME_ADOPTION_WORKFLOW.md) — historical/repositioned post-v1 Codex-first `osc work` target and staged adapter path.
- [`docs/FIRST_WORK_RECORD.md`](docs/FIRST_WORK_RECORD.md) — guided `osc first-run` flow for one valid mission-plan-evidence path.
- [`docs/PR_REVIEW_WITH_OSC.md`](docs/PR_REVIEW_WITH_OSC.md) — `osc pr check` and fork-safe PR workflow template.
- [`docs/TRUST_BOUNDARIES.md`](docs/TRUST_BOUNDARIES.md) — dispatch, adapter, evidence, webhook, PR-check, and runtime trust boundaries.
- [`docs/RUNTIME_BETA_LANE.md`](docs/RUNTIME_BETA_LANE.md) — current Codex/OMX beta lane and no-overclaim boundaries.
- [`docs/COMMAND_MATURITY.md`](docs/COMMAND_MATURITY.md) — historical/repositioned command maturity language for the reduced `osc help` surface.
- [`docs/SCHEMA_REGISTRY.md`](docs/SCHEMA_REGISTRY.md) — emitted artifact schema IDs and owners.
- [`docs/ADOPTION_PROOF_INDEX.md`](docs/ADOPTION_PROOF_INDEX.md) — honest adoption-proof labels and reproduction requirements.
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
