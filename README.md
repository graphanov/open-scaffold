<div align="center">

# open-scaffold

**Your AI agent's work belongs in your repo, not its chat history.**

A harness for AI-assisted work: clarify it, plan it, gate it, run it, prove it —
and resume it cold after the chat is gone.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/open-scaffold.svg)](https://www.npmjs.com/package/open-scaffold)
[![Works with](https://img.shields.io/badge/Works%20with-Any%20agent-green.svg)](#runtime-neutral-by-design)
[![Runtime deps](https://img.shields.io/badge/Runtime%20deps-Zero-blue.svg)](package.json)

![Resume after total context loss](.github/assets/readme-resume-screencast.gif)

</div>

## The problem

Long AI sessions rot. Context degrades, retries loop blind, and when the chat
ends, the work's memory dies with it. The next session starts from archaeology —
yours or the agent's, paid for in tokens either way. And when someone asks
*"what did the AI do, and why?"*, the answer lives in a scrollback buffer nobody
can review.

## What Open Scaffold does

Open Scaffold moves the working memory of AI-assisted work out of the chat and
into git-tracked files — a repo-native work record — then runs the loop with
discipline:

```text
$interview -> $plan -> $work or $team -> evidence -> feedback -> retry or lesson
```

- **The CLI does the bookkeeping; the model does the thinking.** Plans, run
  packages, status, events, receipts, and postflight notes are scaffolded by
  `osc` from short answers — the agent never hand-writes ceremony.
- **Execution is gated, not hidden.** `$work` packages a bounded slice. A
  runtime launches only with an explicit adapter and explicit spawn authority,
  and stops at human gates for anything irreversible.
- **Every attempt leaves a receipt.** A failed run becomes feedback with a
  repair hypothesis. The retry inherits it. Accepted lessons carry into future
  runs instead of being relearned.
- **Any session can die at any time.** A fresh agent, a teammate, or future you
  resumes from compact repo files — no re-explaining.

The whole human grammar is four verbs:

| Command | Meaning |
| --- | --- |
| `$interview` | Clarify messy intent into a bounded work package. |
| `$plan` | Create or amend the repo-native plan. |
| `$work` | Package one bounded slice for controlled execution. |
| `$team` | Coordinate multiple worker lanes with shared evidence. |

## Start in 60 seconds

In any repo, new or existing:

```bash
npx open-scaffold@latest first-run
```

Three guided questions (plan slug, mission, first goal) produce the minimum
work record — `MISSION.md`, one active plan with acceptance criteria, an
evidence skeleton — and print the exact commands to run next.

Then drive work through the harness:

```bash
osc harness '$interview "clarify what we are building first"'
osc harness '$plan "ship the first reviewed change" --slug first-slice'
osc harness '$work "implement the first slice" --context "plan is ready"'
```

Each command writes a run record under `.osc/runs/<run_id>/` — status, events,
gates, and a postflight note — and tells you the next step. Close the loop:

```bash
osc verify
osc evidence new first-slice
osc close first-slice --message "verified first slice"
```

Scope changed mid-slice? `osc amend first-slice --message "what changed"`
records the change without rewriting the plan — plans are immutable, learnings
are appended. Need a plan without the harness grammar? `osc plan new <slug>
--stage active` scaffolds one directly.

Prefer a global install? `npm i -g open-scaffold` gives you `osc` everywhere.

## Under the hood, it is just files

```text
MISSION.md                          why this repo exists
.osc/plans/                         scoped work with acceptance criteria
.osc/runs/<run_id>/run.json         handoff package for a worker or reviewer
.osc/runs/<run_id>/status.json      live state, pending human gates
.osc/runs/<run_id>/feedback.jsonl   feedback and repair hypotheses
.osc/improvements/applied/          accepted lessons future runs inherit
.osc/releases/                      evidence notes and release records
```

No daemon, no database, no SaaS, no hidden state. Everything is reviewable in a
PR and survives any tool change.

## Resume after total context loss

This is the core trick. Kill the session mid-task — close the laptop, lose the
chat, switch agents. The repo still knows the mission, the active plan, the
acceptance criteria, what passed, what failed, and what to do next.

- Try it on the committed mid-flight fixture: [`examples/resume-demo/`](examples/resume-demo/)
  with the narrated path in [`docs/RESUME_WALKTHROUGH.md`](docs/RESUME_WALKTHROUGH.md).
- Retries compile a budgeted handoff packet — capped at 1,600 characters,
  secret-redacted, raw logs excluded:

```bash
osc harness '$work "retry failed slice" --context "repo truth" --retry-of <old-run-id> --handoff'
```

A fresh worker reads the packet, not your history. That is what makes
multi-session work cheap: compact state replaces archaeology.

## Run it through a real runtime

Open Scaffold core never spawns anything silently. To hand a slice to a real
runtime, name the adapter and grant the authority explicitly:

```bash
osc harness '$work "implement one bounded slice" --context "plan is ready" --adapter codex --allow-spawn'
```

The adapter runs with an environment allowlist, timeout, bounded log capture,
and path containment, then writes a receipt back into the run record. Project
adapters are one JSON file in `.osc/adapters/<id>.json` — point one at Claude
Code, a shell script, or anything else that can execute work.

For script/CI control without the harness grammar, the explicit backend path is:

```bash
osc plan new <slug> --stage active
osc run .osc/plans/active/<slug>.md --runtime codex --workflow plan
osc dispatch .osc/runs/RUN_ID/run.json --adapter <id>
```

Use `osc run ... --dry-run` only to preview the run packet; rerun without
`--dry-run` before dispatch so the run package actually exists.

See [`docs/ADAPTERS.md`](docs/ADAPTERS.md) and
[`docs/RUNTIME_BINDING_CONTRACT.md`](docs/RUNTIME_BINDING_CONTRACT.md).

## Teams of workers, one evidence trail

```bash
osc harness '$team "split implementation docs review" --worker implementation --worker docs --worker review'
```

`$team` packages coordinated worker lanes that share one run record: per-worker
status, human gates, adapters, and evidence links in one place instead of N
scattered sessions. See [`docs/HARNESS_COMMANDS.md`](docs/HARNESS_COMMANDS.md).

## Learn from repeated attempts

Real AI work means trying more than once. The evolution ledger records
attempts, compares them, and tells you when to stop:

```bash
osc evolve init .osc/plans/active/my-task.md --out .osc/evolution/my-task --strategy manual
osc evolve record .osc/evolution/my-task --run .osc/runs/<run_id>/run.json --decision promote --rationale "Best evidence so far."
osc evolve analyze .osc/evolution/my-task
```

`analyze` detects plateaus, impossible acceptance criteria, and token spend
with zero measured gain — and recommends continue, stop, redesign, or
inspect-scorer instead of letting a loop burn money. See
[`docs/EVOLUTION_LOOP.md`](docs/EVOLUTION_LOOP.md).

## Simple mental model

- **You** own the goal, taste, risk, merge, and publish gates.
- **Your agent or runtime** does the implementation work.
- **Open Scaffold** runs the loop and keeps the record: what was asked, what
  was handed off, what came back, what was checked, who approved.

## Runtime-neutral by design

```text
Open Scaffold harness  = loop control: interview, plan, package, gates, receipts, feedback
Runtime adapter        = translate + launch + return receipt/evidence
Runtime                = Claude Code, Codex, Gemini, OMC/OMX, a shell, or a human
Operator               = approve, reject, merge, publish, or redirect
```

Core stays portable: files first, explicit authority, no provider lock-in. An
optional read-only [MCP server](docs/MCP.md) exposes the work record to
MCP-capable agents.

## When it helps — and when to skip it

Use it for multi-session AI work, PRs that need intent and evidence attached,
client or audit-sensitive delivery, multi-agent handoffs, and repeated attempts
where you need to know which one won and why.

Skip it for one-off scripts, throwaway prototypes, and work nobody will ever
need to review. If the task fits in one clean session and dies there, you do
not need a work record.

## Honest limits

Open Scaffold is pre-1.0 (`v0.31.x`) and it does not make your model smarter —
it makes the *loop around the model* disciplined: bounded slices, gated
execution, compact resumes, receipts for everything. A bounded
scaffold-vs-naked fixture ships in [`examples/proof/`](examples/proof/) and is
honest about its current scope; the broader benchmark program is tracked in
`.osc/plans/backlog/163-proof-harness-v2.md`. The full maturity contract —
what is stable, what is experimental, what is future — lives in one place:
[`docs/STABILITY.md`](docs/STABILITY.md).

## Key docs

- [`docs/START_HERE.md`](docs/START_HERE.md) — the single entry point.
- [`docs/HARNESS_COMMANDS.md`](docs/HARNESS_COMMANDS.md) — the four verbs in detail.
- [`docs/HARNESS_ARCHITECTURE.md`](docs/HARNESS_ARCHITECTURE.md) — how the loop is wired.
- [`docs/ADAPTERS.md`](docs/ADAPTERS.md) — choosing and writing runtime adapters.
- [`docs/FEEDBACK_IMPROVEMENT_LOOP.md`](docs/FEEDBACK_IMPROVEMENT_LOOP.md) — feedback, retries, lessons.
- [`docs/RESUME_WALKTHROUGH.md`](docs/RESUME_WALKTHROUGH.md) — zero-context resume, narrated.
- [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md) — the proof fixture and its boundaries.
- [`docs/PR_REVIEW_WITH_OSC.md`](docs/PR_REVIEW_WITH_OSC.md) — PRs that carry intent and evidence.
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md) — worked examples and demos.
- [`docs/STABILITY.md`](docs/STABILITY.md) — the maturity contract and honest limits.
- [`docs/FAQ.md`](docs/FAQ.md) — deeper questions.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — the vocabulary.

## Dogfooded

Open Scaffold is built with Open Scaffold. This repo carries its own mission,
plans, run records, evidence notes, decisions, and releases — inspect the
method instead of taking it on faith.
