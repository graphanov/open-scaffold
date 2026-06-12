<div align="center">

# open-scaffold

**Your AI agent's work belongs in your repo, not its chat history.**

Ambient work records, lossless handoffs, and near-frontier review from cheap and
local models — for AI-assisted work, with published evidence.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/open-scaffold.svg)](https://www.npmjs.com/package/open-scaffold)
[![Works with](https://img.shields.io/badge/Works%20with-Any%20agent-green.svg)](#runtime-neutral-by-design)
[![Runtime deps](https://img.shields.io/badge/Runtime%20deps-Zero-blue.svg)](package.json)


</div>

## The problem

You pay frontier prices for everything — including the review, the status
checks, the "where were we", the bookkeeping — because nothing cheaper can be
trusted with them. Cheaper models guess; when a chat ends, the work's memory
dies with it; the next session (or the reviewer) reconstructs history from a
scrollback buffer, and what it can't reconstruct, it invents.

## What Open Scaffold does

Open Scaffold keeps a repo-native work record — git-tracked, observed-fact
files about what your agents actually did — and turns it into three things:

- **Record (ambient).** The record is extracted from observed facts —
  transcripts, receipts, test results, scores — around whatever workflow you
  already run. It costs the working model nothing: no ceremony, no hand-written
  bookkeeping. Add a plan and evidence files when you want claims checked
  against intent; feedback and lessons carry into future attempts instead of
  being relearned.
- **Handoff.** `osc handoff` compiles the record into a packet that lets the
  next reader — a fresh session, a smaller model, another vendor's agent, or a
  teammate — resume from the truth instead of re-deriving (or inventing) it.
- **Review and gate.** Cheap models read the record and judge: `osc analyze`
  reports plateaus, failing criteria, and requirements that deserve questioning;
  `osc gate` turns that into a retry authorization — a stop authority that
  lives outside the worker, with claims checked against evidence.

The front door is three commands:

| Command | Meaning |
| --- | --- |
| `osc handoff` | Compile the work record into a resume packet for the next session or model. |
| `osc analyze` | Review recorded attempts: plateaus, failing criteria, question-the-requirement signals. |
| `osc gate` | Authorize or block the next attempt from the analysis plus an optional independent judge. |

Why cheap models? Because with the record they stop guessing. In replicated
trials, a mid-tier reviewer answering factual questions about finished work —
graded against answer keys committed before it ran — scored 96-97% with the
record vs 36-46% on the bare workspace, with zero confabulation and at roughly
half the review cost. And when a judge is too weak to be trusted, the gate
fails closed: no parseable verdict means no authorization, and the record's
own blocks override a permissive ruling. Small and locally-hosted models
(haiku-class, DeepSeek, Qwen, Ollama/MLX) become viable reviewers, resumers,
and bookkeepers, so the frontier model is spent only where frontier capability
is needed.

## What's measured

Open Scaffold ran a preregistered benchmark program against itself in an
independent repo (hidden inputs, pre-committed hashes, kill rules) and publishes
the verdicts both ways:

- **The work record's measured value is to the next reader, not the current
  worker.** In with/without-record review trials over real finished work, a
  fresh reviewer reconstructed what happened at **94% accuracy with the record
  vs 30% without — with zero confabulated history — at half the review cost**
  (pilot-grade n; boundaries and raw-data pointers in
  [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md)).
- **What it does not do, measured:** it does not improve a strong model's
  in-session task output — an explicit non-goal. Resume value scales with how
  much recoverable state an interruption leaves behind. The dead claims stay
  published alongside the live ones; that is the point.

## Start in 60 seconds

In any repo, new or existing:

```bash
npx open-scaffold@latest first-run
```

Three guided questions (plan slug, mission, first goal) produce the minimum
work record — `MISSION.md`, one active plan with acceptance criteria, an
evidence skeleton — and print the exact commands to run next.

Work however you already work — your agent, your editor, your loop. The record
accumulates as files; you close each slice with evidence:

```bash
osc verify
osc evidence new first-slice
osc close first-slice --message "verified first slice"
```

Scope changed mid-slice? `osc amend first-slice --message "what changed"`
records the change without rewriting the plan — plans are immutable, learnings
are appended. More plans: `osc plan new <slug> --stage active`.

Back tomorrow in a brand-new session, or handing to a different model?

```bash
osc handoff
```

One read-only command compiles the working memory into a budgeted packet.

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

## Handoff after total context loss

This is the core trick. Kill the session mid-task — close the laptop, lose the
chat, switch agents or vendors. Then, in a fresh session:

```bash
osc handoff
```

One read-only command compiles the repo's working memory into a budgeted,
secret-redacted packet: mission digest, the active plan with its acceptance
criteria, the latest recorded state, repair hypotheses, lessons to inherit, and
the exact next bounded action. The next reader gets the truth, not archaeology.
In with/without trials, reviewers given the record reconstructed the work at
94-96% accuracy versus 30-46% without it — and never invented history.

Try it on the committed mid-flight fixture: [`examples/resume-demo/`](examples/resume-demo/)
with the narrated path in [`docs/RESUME_WALKTHROUGH.md`](docs/RESUME_WALKTHROUGH.md).

## Review and gate with cheap models

Real AI work means repeated attempts — and someone deciding whether the next
attempt is justified. That judgment should not belong to the worker (it grades
its own homework), and it should not cost frontier prices. Record attempts,
then ask the record:

```bash
osc evolve init .osc/plans/active/my-task.md --out .osc/evolution/my-task --strategy manual
osc evolve record .osc/evolution/my-task --run <run.json> --evaluation <eval.json> --decision retry --rationale "..."
osc analyze .osc/evolution/my-task --compact
osc gate .osc/evolution/my-task --format json
```

`osc analyze` reports plateaus, zero-sensitivity failures, and requirements
that deserve questioning instead of another retry. `osc gate` converts that —
plus an optional independent judge ruling — into a retry authorization: a
packet-level *redesign* blocks the retry even if everyone feels optimistic.
Claims are checked against evidence (test results, scored criteria), so
"complete" while the suite fails is caught mechanically. Any model that can
read files can be the judge — including locally-hosted ones. See
[`docs/EVOLUTION_LOOP.md`](docs/EVOLUTION_LOOP.md).

## Simple mental model

- **You** own the goal, taste, risk, merge, and publish gates.
- **Your agent or workflow** does the implementation work — Open Scaffold never
  runs or disciplines it.
- **Open Scaffold** keeps the record and serves the readers: what was asked,
  what actually happened, what was claimed versus verified, what the next
  session or the reviewer needs to know.

## Vendor-neutral by design

```text
Work record      = git-tracked, observed-fact files: plans, receipts, evaluations, attempts
Handoff packet   = compiled, budgeted, redacted working memory for the next reader
Review + gate    = cheap-model judgment over the record, with stop authority outside the worker
Reader           = a fresh session, a smaller model, another vendor's agent, or a human
```

Core stays portable: files first, versioned schemas, no provider lock-in. The
[MCP server](docs/MCP.md) exposes the record, handoff packets, and gate
checks to any MCP-capable client.

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
honest about its current scope; the broader benchmark program now lives in the
source-labeled claim ledger in [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md),
with raw receipts in the public
[`harness-bench`](https://github.com/graphanov/harness-bench) results tree. The full maturity contract —
what is stable, what is experimental, what is future — lives in one place:
[`docs/STABILITY.md`](docs/STABILITY.md).

## Key docs

- [`docs/START_HERE.md`](docs/START_HERE.md) — the single entry point.
- [`docs/EVOLUTION_LOOP.md`](docs/EVOLUTION_LOOP.md) — the record, analyze, and gate in detail.
- [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md) — the measured claim ledger with boundaries.
- [`docs/MCP.md`](docs/MCP.md) — plugging the record into MCP-capable clients.
- [`docs/STABILITY.md`](docs/STABILITY.md) — command maturity and honest limits, in one place.
- [`docs/RESUME_WALKTHROUGH.md`](docs/RESUME_WALKTHROUGH.md) — zero-context resume, narrated.
- [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md) — the proof fixture and its boundaries.
- [`docs/GITHUB_WORKFLOW.md#structural-pr-review-with-open-scaffold`](docs/GITHUB_WORKFLOW.md#structural-pr-review-with-open-scaffold) — PRs that carry intent and evidence.
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md) — worked examples and demos.
- [`docs/STABILITY.md`](docs/STABILITY.md) — the maturity contract and honest limits.
- [`docs/FAQ.md`](docs/FAQ.md) — deeper questions.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — the vocabulary.

## Dogfooded

Open Scaffold is built with Open Scaffold. This repo carries its own mission,
plans, run records, evidence notes, decisions, and releases — inspect the
method instead of taking it on faith.
