# Examples

Short examples for understanding Open Scaffold without reading every protocol page.

For four worked paths — solo developer, team status room, GitHub-only workflow, and runtime handoff — see [`examples/README.md`](examples/README.md). For the evolution-ledger wedge, see [`examples/evolution-loop-compare.md`](examples/evolution-loop-compare.md): two attempts, `osc evolve compare`, and a PR-ready frontier rationale. For a fixture you can run locally, see [`examples/evolution-ledger-demo/`](../examples/evolution-ledger-demo/) — `osc evolve check` and `osc evolve compare` against committed loop, attempts, frontier, and evaluation files.

For the next reproducible proof layer, see [Lifecycle E2E Smoke Strategy](CI.md#lifecycle-e2e-smoke). It defines and links the local smoke test that proves a fresh downstream project can move through mission → plan → verification → evidence → close without Hermes, Discord, or private infrastructure.

Run the smoke:

```bash
npm run smoke:e2e
```

## Linked-record viewer

Run these three read-only commands from the Open Scaffold source-checkout root. They need no CLI installation or build. The example paths belong to this checkout; an initialized downstream project does not contain them.

This is a committed synthetic work record: one mission, a done bootstrap plan, and the evidence note linked to that plan.

### Mission

```bash
sed -n '1,80p' examples/resume-demo/MISSION.md
```

The mission defines the greeting demo and its goals and non-goals.

### Done plan

```bash
sed -n '1,120p' examples/resume-demo/.osc/plans/done/scaffold-init.md
```

The plan records the bootstrap goal, constraints, three checked acceptance criteria, and verification steps.

### Linked evidence

```bash
sed -n '1,120p' examples/resume-demo/.osc/releases/2026-05-10-scaffold-init.md
```

The note's Plan line points to the displayed done plan. Read its recorded **Verification**, **Outcome**, and **Follow-up**: bootstrap checks are recorded as successful, and the next slice is `demo-add-greeting`. No run packet is linked.

These are historical sample results, not certification of the current checkout. The checked stage-folder criterion includes `backlog` and `blocked`, but those empty directories are absent from the committed fixture.

## Continue your own active work

Follow [START_HERE's session-to-session handoff](START_HERE.md#your-first-session-to-session-handoff) and the [resume walkthrough](RESUME_WALKTHROUGH.md) for the invocation appropriate to your setup. Choose an exact active slug, then use `handoff --plan <slug>` and `trace <slug>` with that same slug. Read the selected plan, its amendments, and only the evidence trace binds to it.

Missing evidence or a missing run is a valid recorded state. The fixture's active `demo-add-greeting` plan has no matching evidence note; the `scaffold-init` note above belongs to a different, done plan. Keep the absence visible instead of substituting the latest repository-wide note.
