# Examples

Five worked example paths a fresh user or agent can read end-to-end. The first four are ways to use the repo record; the fifth shows the evolution-ledger comparison wedge directly. Each path links to existing protocol docs and shipped fixtures rather than inventing new machinery.

The example paths:

1. [Solo developer](#1-solo-developer) — one human, one repo, AI assist.
2. [Team status room](#2-team-status-room) — multiple humans/agents coordinating with the repo as truth.
3. [GitHub-only workflow](#3-github-only-workflow) — issue → plan → PR → evidence with no chat coordinator.
4. [External handoff packet](#4-external-handoff-packet) — packaging work for an external agent, runtime lane, or teammate to execute.
5. [Evolution loop compare](evolution-loop-compare.md) — two attempts → `osc evolve compare` → frontier rationale.
   - [`examples/evolution-ledger-demo/`](../../examples/evolution-ledger-demo/) — runnable fixture: checked-in loop, attempts, evaluations, a promoted frontier, and committed expected compare output. Verified by the evolution CLI tests.

If you want one complete non-recursive example first, start with [`downstream-walkthrough.md`](downstream-walkthrough.md). It shows the full mission → plan → optional `run.json` work package → evidence → close loop on a tiny shell CLI that is not Open Scaffold itself, then shows how a second session reconstructs the current state from files alone.

Open Scaffold core ships the protocol, the `run.json` work-package schema (run packet schema), the verification scripts, and dry-run/conformance examples. It does not spawn agents, run a coordinator daemon, or own runtime credentials. Each mode below stays inside that boundary.

For the labels used when these examples mention external coordinators, harnesses, or surfaces, see [`../ADAPTERS.md#reference-labels-for-named-tools`](../ADAPTERS.md#reference-labels-for-named-tools).

---

## 1. Solo developer

A single operator using AI assistance against one repo. Truth lives in `MISSION.md`, `.osc/plans/`, and evidence notes; chat sessions are disposable.

Reading path:

- [`README.md` Start in 60 seconds](../../README.md#start-in-60-seconds) — run the guided first work-record command and follow the printed next steps.
- [`docs/EXAMPLES.md` 60-second viewer demo](../EXAMPLES.md#60-second-viewer-demo) — mission → plan → verification → evidence in four shell commands.
- [`downstream-walkthrough.md`](downstream-walkthrough.md) — the same loop on Tiny Notes, a small non-Open-Scaffold project with concrete commands, expected outputs, and a day-2 resume check that works without chat history.
- [`examples/lifecycle-e2e-smoke/`](../../examples/lifecycle-e2e-smoke/README.md) — boring downstream fixture that proves the loop on a non-Open-Scaffold project. Run it with `npm run smoke:e2e`.

Loop in shell:

```bash
npx open-scaffold@latest first-run --non-interactive \
  --slug "<slug>" --mission "<mission>" --goal "<goal>"
# ... complete the first bounded task ...
npx open-scaffold@latest plan validate <slug> --strict
# edit .osc/plans/active/<slug>.md: mark the acceptance criteria that actually passed
# edit .osc/releases/<date>-<slug>.md: replace Pending with real command output
npx open-scaffold@latest close <slug> --message "verified" # move plan to done/
# if the evidence note still points at active/, update its Plan line to .osc/plans/done/<slug>.md
npx open-scaffold@latest verify --evidence-chain --plan <slug> --strict
```

What this mode does **not** require: a chat surface, a coordinator, a runtime harness, or any private deployment.

---

## 2. Team status room

Multiple humans and/or agents coordinating around the same repo. A team room (Slack/Discord/Telegram/CLI dashboard) shows status and collects approvals; the repo still owns durable truth.

Reading path:

- [`docs/SLICE_CLOSE_PROTOCOL.md`](../SLICE_CLOSE_PROTOCOL.md) — evidence receipts, approval strength, and correction routing when more than one person signs off.
- [`docs/TASK_RUN_MODEL.md`](../TASK_RUN_MODEL.md) — `task_id`, `run_id`, and `question_id` so cockpit messages, PRs, and evidence files can cross-reference.

How the loop differs from solo:

- Each plan binds to a `task_id` so multiple runs and reviewers can attach to the same work.
- Status-room events (status, blocker, question, approval) point back at a plan, run, evidence path, or PR — never at a chat thread alone.
- Approvals land as evidence/PR review, not as chat reactions.

Coordinators that can sit in front of this loop (issue trackers, Kanban tools, custom bots, or private deployment examples) are external by design. Open Scaffold core does not bundle, require, or authenticate against any of them.

---

## 3. GitHub-only workflow

A team or solo operator who wants to keep all coordination on GitHub: Issues for intake, PRs for review, Releases or `.osc/releases/` for evidence. No separate chat coordinator.

Reading path:

- [`docs/GITHUB_WORKFLOW.md`](../GITHUB_WORKFLOW.md) — standard chain from `ROADMAP.md` item or Issue to plan, `run.json` work package when delegated, branch, PR, CI/review, merge, and release/evidence note.
- [`docs/SLICE_CLOSE_PROTOCOL.md`](../SLICE_CLOSE_PROTOCOL.md) — evidence-backed completion / slice closure when the only status channel is a PR thread.

Minimal chain:

```text
GitHub Issue
  -> .osc/plans/active/<slug>.md
  -> branch
  -> Pull Request
  -> CI + reviewer approval
  -> .osc/releases/<date>-<slug>.md (or GitHub Release)
```

Acceptance criteria live in the plan; the PR description references the plan and the evidence note. CI runs `./verify.sh` so methodology drift is mechanical, not subjective.

What this mode does **not** require: a chat/status channel (operator surface), a coordinator service, or a runtime harness. An agent that opens PRs from a branch is one valid executor; a human terminal is another.

---

## 4. External handoff packet

When a runtime lane (Claude Code, Codex, OMC, OMX, a custom adapter, or a human terminal) should execute a plan, Open Scaffold core packages the work into `.osc/runs/<run_id>/run.json`. Core does not launch the lane — `spawning: false` is the boundary that keeps the protocol portable.

Reading path:

- [`docs/ADAPTERS.md`](../ADAPTERS.md) — historical adapter notes plus current runtime/coordinator label taxonomy.
- [`docs/RUNTIME_BINDING_CONTRACT.md`](../RUNTIME_BINDING_CONTRACT.md) — lifecycle/responsibilities for any binding that consumes a `run.json` work package (run packet).
- [`runtime-profiles/company-review-bot.json`](runtime-profiles/company-review-bot.json) — example project-local profile.
- [`runtime-binding-conformance/README.md`](runtime-binding-conformance/README.md) — fake/local adapter conformance fixture.

### Generate a `run.json` work package (run packet)

From a repository checkout with dependencies installed:

```bash
npm run osc -- run .osc/plans/done/013-binding-example.md \
  --task-id plan:013-binding-example-verification \
  --runtime codex \
  --workflow plan \
  --operator-surface cli \
  --repo "$PWD" \
  --worktree "$PWD" \
  --branch "$(git branch --show-current)" \
  --commit-policy "dry-run verification only; no runtime launch"
```

This writes a new `.osc/runs/<run_id>/run.json` package. Generic Open Scaffold only creates the artifact; it does not spawn the selected lane.

### Inspect the packet like an external binding

```bash
RUN_JSON="$(ls -td .osc/runs/*/run.json | head -1)"
node docs/examples/runtime-binding-dry-run.mjs "$RUN_JSON"
```

Expected result:

- exits `0` for an executable package;
- prints run id, plan path, executor lane, optional runtime command/mode (`harness skill`), status channel (`operator surface`), repo/worktree/branch, and commit policy;
- states that no runtime was launched;
- exits nonzero if the packet is not executable, has blockers, requests unsupported lanes, or violates the `spawning: false` boundary.

### Fake/local adapter conformance

To prove the receipt/evidence side of the boundary without a real runtime, run the fake/local adapter fixture:

```bash
node docs/examples/runtime-binding-conformance/fake-local-adapter.mjs \
  "$RUN_JSON" \
  --out "$(dirname "$RUN_JSON")/dispatch-receipt.json"
```

Expected result:

- exits `0` for an executable package;
- writes a deterministic receipt file for the external conformance fixture;
- writes a deterministic evidence artifact;
- states that no runtime was launched, no credentials were read, and no network was required.

### Boundary

These examples are intentionally a **dry-run/conformance consumer**, not a launcher. Real runtime bindings — external launch glue — coordinators, bots, or humans may use the same `run.json` fields to launch work outside Open Scaffold core, attach runtime metadata, return evidence, and request approval.

The fixtures are available from the repository checkout. They are not currently advertised as packaged npm executables or a stable adapter SDK.
