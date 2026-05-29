# Zero-Context Resume Walkthrough

This walkthrough shows how a fresh AI agent, or its solo-developer operator, can resume bounded work straight from the repo after total chat-context loss — no re-explaining needed.

The example uses the committed mid-flight fixture at `examples/resume-demo/`. The command output below is taken from that fixture with the local CLI build.

> **Disclaimer:** The consolidated resume summary shown at the end is reconstructed by test tooling (`src/resume.ts` + `tests/resume-snapshot.test.ts`). It is not emitted by a shipped stable command today, and Open Scaffold core still does not spawn an agent.

---

## The scenario

You open a repo you have not touched in a week. There is no open chat context. The agent has no memory of previous discussion. The only source of truth is the repository.

The repo contains:

- one active plan: `demo-add-greeting`;
- one amendment: `demo-add-greeting-amendment-1`;
- one closed slice: `scaffold-init`;
- one evidence note under `.osc/releases/`.

---

## Step 1 — Check what is in flight

Run `osc status` from the fixture root:

```text
$ cd examples/resume-demo
$ node ../../dist/cli.js status
Open Scaffold status
Namespace: .osc
Mission: defined
active: 1
  - demo-add-greeting
backlog: 0
blocked: 0
done: 1
  - scaffold-init
```

The repo tells the fresh reader that there is exactly one active slice and one completed setup slice.

---

## Step 2 — Replay the work-record chain

Run `osc trace demo-add-greeting` to inspect the active plan:

```text
$ node ../../dist/cli.js trace demo-add-greeting
Open Scaffold trace: demo-add-greeting
Status: active
Stage: active
Path: .osc/plans/active/demo-add-greeting.md
Goal: Implement a greeting module that returns "Hello, <name>!" and records each greeting to the releases folder.

Acceptance criteria:
  - AC1 [x] Greeting module exports a greet function that returns the string "Hello, <name>!".
  - AC2 [ ] Greeting history is written to the releases folder as an evidence note on each run.
  - AC3 [ ] All greeting tests pass (npm test exits 0).

Links:
  [local] plan_file: .osc/plans/active/demo-add-greeting.md — Plan file found in local scaffold stage.
  [local] acceptance_criterion: AC1 — Greeting module exports a greet function that returns the string "Hello, <name>!".
  [local] acceptance_criterion: AC2 — Greeting history is written to the releases folder as an evidence note on each run. (unchecked)
  [local] acceptance_criterion: AC3 — All greeting tests pass (npm test exits 0). (unchecked)
  [missing] run_packet: .osc/runs/*/run.json — No local run packet found for demo-add-greeting.
  [missing] release_note: .osc/releases/*-demo-add-greeting.md — No local release/evidence note found for demo-add-greeting.

Summary: local=4, external=0, missing=2, unverified=0
```

The next bounded action is the first unchecked acceptance criterion:

```text
Greeting history is written to the releases folder as an evidence note on each run.
```

---

## Step 3 — Reconstructed resume summary

The resume summary below is reconstructed by `src/resume.ts`, a test-only helper that reuses existing scaffold/trace internals, and verified deterministically by `tests/resume-snapshot.test.ts` against `examples/resume-demo/expected-resume-summary.json`.

```json
{
  "schema": "open-scaffold.resume.v1",
  "mission": {
    "defined": true
  },
  "active_plan": {
    "slug": "demo-add-greeting",
    "stage": "active",
    "status": "active",
    "goal": "Implement a greeting module that returns \"Hello, <name>!\" and records each greeting to the releases folder.",
    "acceptance_criteria": [
      {
        "text": "Greeting module exports a greet function that returns the string \"Hello, <name>!\".",
        "checked": true
      },
      {
        "text": "Greeting history is written to the releases folder as an evidence note on each run.",
        "checked": false
      },
      {
        "text": "All greeting tests pass (npm test exits 0).",
        "checked": false
      }
    ]
  },
  "amendments": {
    "count": 1,
    "ids": [
      "demo-add-greeting-amendment-1"
    ]
  },
  "work_done": {
    "done_slices": [
      "scaffold-init"
    ],
    "evidence": [
      ".osc/releases/2026-05-10-scaffold-init.md"
    ]
  },
  "status": "active plan demo-add-greeting; 1/3 acceptance criteria complete",
  "next_bounded_action": "Greeting history is written to the releases folder as an evidence note on each run."
}
```

The `next_bounded_action` value is derived deterministically from the first unchecked acceptance criterion of the single active plan. The snapshot test asserts it does not drift.

---

## What the agent does next

With this summary, a fresh agent knows:

1. **Mission:** defined — no need to ask what the project is for.
2. **Active work:** one plan, `demo-add-greeting`, with a scope clarification in `demo-add-greeting-amendment-1`.
3. **Progress:** one of three criteria is done; the greeting export does not need to be repeated.
4. **Next step:** implement evidence-note writing: `Greeting history is written to the releases folder as an evidence note on each run.`
5. **Prior art:** the closed `scaffold-init` slice and its evidence note show the starting structure already exists.

No chat history. No re-explaining. The repo is the context.

---

## Links

- Fixture: [`examples/resume-demo/`](../examples/resume-demo/)
- Golden file: [`examples/resume-demo/expected-resume-summary.json`](../examples/resume-demo/expected-resume-summary.json)
- Resume composer (test-only): [`src/resume.ts`](../src/resume.ts)
- Snapshot test: [`tests/resume-snapshot.test.ts`](../tests/resume-snapshot.test.ts)
- Front door: [`docs/START_HERE.md`](START_HERE.md)
