<div align="center">

# open-scaffold

**Your AI agent's work belongs in your repo, not its chat history.**

Ambient work records, compact handoffs, and bounded review/gate checks from cheap and local models — for AI-assisted work that needs evidence, recovery, and human gates, with pilot-grade proof boundaries.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/open-scaffold.svg)](https://www.npmjs.com/package/open-scaffold)
[![Works with](https://img.shields.io/badge/Works%20with-Any%20agent-green.svg)](#vendor-neutral-by-design)
[![Runtime deps](https://img.shields.io/badge/Runtime%20deps-Zero-blue.svg)](package.json)

</div>

## The problem

You pay frontier prices for review, status checks, and "where were we" because nothing cheaper can be trusted. Cheaper models guess; when a chat ends, the work's memory dies with it; the next session reconstructs from a scrollback buffer and invents what it can't recover.

## What it does

Open Scaffold keeps a repo-native work record — git-tracked, observed-fact files about what your agents did — and turns it into three things:

- **Record (ambient).** Extracted from observed facts — transcripts, receipts, test results — costing the working model nothing. `osc capture --from claude-code|codex` reads a finished session into a record with no worker cooperation. Add a plan and evidence files to check claims against intent; feedback and lessons carry forward instead of being relearned.
- **Handoff.** `osc handoff` compiles the record into a budgeted, secret-redacted packet so the next reader — a fresh session, a smaller model, another vendor's agent, or a teammate — resumes from truth instead of re-deriving or inventing it.
- **Review and gate.** `osc review` reports plateaus, failing criteria, and requirements worth questioning; `osc gate` turns that into a retry authorization with stop authority outside the worker. Any file-reading model can be the judge. Fails closed: no parseable verdict means no authorization.

| Command | Meaning |
| --- | --- |
| `osc handoff` | Compile the work record into a resume packet for the next session or model. |
| `osc review` | Review recorded attempts: plateaus, failing criteria, question-the-requirement signals. |
| `osc gate` | Authorize or block the next attempt from the analysis plus an optional independent judge. |

## What's measured

The interesting result is not "the scaffold makes your agent smarter" — measured, it does not. A naked frontier model matched or beat every scaffolded arm on in-session task quality. That dead result is published at equal weight with the wins.

What the record fixes is amnesia and memory errors. In preregistered trials, a mid-tier reviewer model answering factual questions about finished work — graded against answer keys committed before it ran — hit **94% accuracy with the record vs 30% without, zero confident wrong-history answers, at half the review cost**. The record turns a cheap model into a trustworthy auditor. Boundaries in [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md).

A bounded Codex cold-resume fixture: a 1,557-byte resume capsule vs 419,233 bytes of raw transcript, three replicates per arm, decision quality tied at 6/6 on a deterministic human-facing reader-usability rubric, **4.330033x fewer tokens** (median 137,327 → 31,715). One cold-resume decision, not a universal claim. This is not a production-readiness claim.

Audit every receipt, zero spend: [`REPRODUCE.md`](REPRODUCE.md).

## Start in 60 seconds

```bash
npx open-scaffold@latest first-run
```

Three questions produce `MISSION.md`, an active plan with acceptance criteria, and an evidence skeleton. Work however you already work; the record accumulates as files:

```bash
osc verify
osc evidence new first-slice
osc close first-slice --message "verified first slice"
```

Scope changed? `osc amend first-slice --message "what changed"` — plans are immutable, learnings appended. More plans: `osc plan new <slug> --stage active`. Fresh session: `osc handoff`.

Want the discipline without the CLI? [`SKILL.md`](SKILL.md) — the methodology works with plain files.

## It is just files

```text
MISSION.md                     why this repo exists
.osc/plans/                    scoped work with acceptance criteria (active/backlog/done/blocked)
.osc/runs/<run>/run.json       handoff package for a worker or reviewer
.osc/releases/                 evidence notes and release records
```

No daemon, no database, no SaaS — reviewable in a PR, survives any tool change.

## Mental model

- **You** own the goal, taste, risk, merge, and publish gates.
- **Your agent** does the work — Open Scaffold never runs or disciplines it.
- **Open Scaffold** keeps the record: what was asked, what happened, what was claimed versus verified, what the next session needs to know.

Use for multi-session AI work, PRs needing intent and evidence, audit-sensitive delivery. Skip for one-off scripts and prototypes that die in one session.

## Honest limits

Pre-1.0 (`v0.33.x`). Does not make your model smarter — it makes the loop around the model disciplined. Maturity contract: [`docs/STABILITY.md`](docs/STABILITY.md). Claim ledger: [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md). Raw receipts: [`harness-bench`](https://github.com/graphanov/harness-bench).

## Key docs

- [`docs/START_HERE.md`](docs/START_HERE.md) — the single entry point.
- [`docs/PROOF_HARNESS.md`](docs/PROOF_HARNESS.md) — measured claims, raw pointers, proof boundaries.
- [`docs/STABILITY.md`](docs/STABILITY.md) — command maturity, version truth, honest limits.
- [`REPRODUCE.md`](REPRODUCE.md) — audit every receipt, zero spend.
- [`SKILL.md`](SKILL.md) — the methodology as a portable agent skill.
- [`docs/FAQ.md`](docs/FAQ.md) — deeper questions.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — the vocabulary.

## Dogfooded

Open Scaffold is built with Open Scaffold. This repo carries its own mission, plans, run records, evidence notes, decisions, and releases — inspect the method instead of taking it on faith.
