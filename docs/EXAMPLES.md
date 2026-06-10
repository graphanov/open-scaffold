# Examples

Short examples for understanding Open Scaffold without reading every protocol page.

For four worked operating modes — solo developer, team control-room, GitHub-only workflow, and runtime harness handoff — see [`examples/README.md`](examples/README.md). For the evolution-ledger wedge, see [`examples/evolution-loop-compare.md`](examples/evolution-loop-compare.md): two attempts, `osc evolve compare`, and a PR-ready frontier rationale. For a fixture you can run locally, see [`examples/evolution-ledger-demo/`](../examples/evolution-ledger-demo/) — `osc evolve check` and `osc evolve compare` against committed loop, attempts, frontier, and evaluation files.

For the next reproducible proof layer, see [Lifecycle E2E Smoke Strategy](CI.md#lifecycle-e2e-smoke). It defines and links the local smoke test that proves a fresh downstream project can move through mission → plan → verification → evidence → close without Hermes, Discord, or private infrastructure.

Run the smoke:

```bash
npm run smoke:e2e
```

## 60-second viewer demo

This is a reading path, not a setup script. A fresh viewer should be able to scan it in under a minute and see the whole loop.

### 0–10s — Mission

Open the project mission:

```bash
sed -n '1,80p' MISSION.md
```

The mission says what the project is, what it should achieve, and what it must not become.

### 10–25s — Plan

Open one active plan:

```bash
find .osc/plans/active -maxdepth 1 -type f -name '*.md' | head -1 | xargs sed -n '1,120p'
```

A plan names the goal, constraints, files to touch, acceptance criteria, verification steps, and open questions.

### 25–40s — Verification

Run the methodology check:

```bash
./verify.sh --standard
```

This proves the mission exists, plans are present, amendments are ordered, release/evidence notes have required fields, and active plans are not obviously stale.

### 40–60s — Evidence/status

Inspect the latest release or evidence note:

```bash
find .osc/releases -maxdepth 1 -type f -name '*.md' | sort | tail -1 | xargs sed -n '1,120p'
```

That note should connect the work back to a plan, run or task identity, verification, outcome, and follow-up.

## What this shows

Open Scaffold is not trying to hide complexity behind a magic agent. It gives the human and the agent the same source of truth: mission, plan, verification, evidence, and next step, all in the repo.
