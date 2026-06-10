# Zero-Context Resume Walkthrough

This walkthrough shows how a fresh AI agent — or you, a week later — resumes bounded work straight from the repo after total chat-context loss. One read-only command compiles the working memory.

The example uses the committed mid-flight fixture at [`examples/resume-demo/`](../examples/resume-demo/): one active plan with mixed acceptance criteria, one amendment, one closed slice, and one evidence note.

## The scenario

You open a repo you have not touched in a week. There is no chat context. The agent has no memory of previous discussion. The only source of truth is the repository.

## One command

```bash
cd examples/resume-demo
osc resume        # source checkout: node ../../dist/cli.js resume
```

Output:

```text
# Resume Packet

Status: active plan demo-add-greeting; 1/3 acceptance criteria complete

## Mission

Build a demo greeting project to serve as an Open Scaffold resume-proof fixture.

## Active plan: demo-add-greeting

Goal: Implement a greeting module that returns "Hello, <name>!" and records each greeting to the releases folder.

Acceptance criteria (1/3 complete):
- [ ] Greeting history is written to the releases folder as an evidence note on each run.
- [ ] All greeting tests pass (npm test exits 0).
- [x] Greeting module exports a greet function that returns the string "Hello, <name>!".

Amendments (read in order after the plan): demo-add-greeting-amendment-1

## Next actions

1. Greeting history is written to the releases folder as an evidence note on each run.
2. `osc plan validate demo-add-greeting --strict`
3. `node -e "import('./src/greet.js').then(m => console.log(m.greet('World')))" → prints Hello, World!`

Boundary: read-only packet compiled from repo truth. It is not approval and grants no merge, publish, release, or spawn authority.
```

A fresh agent now knows the goal, what is already done, what is open, the next bounded action, and how to verify — without reading any other file and without a word of re-explaining.

## What the packet contains

- A mission digest from `MISSION.md`.
- The active plan (highest-numbered when several are active; pick explicitly with `--plan <slug>`), its goal, and checklist acceptance criteria with their checked state.
- Amendments in numeric order — the plan is immutable; learnings layer on top.
- The latest harness run when one exists: state, pending human gates, and the recorded repair hypothesis for failed or blocked runs, with a ready `--retry-of` recipe.
- Accepted lessons from `.osc/improvements/applied/` so future runs inherit them.
- The next bounded action, chosen by precedence: answer a pending gate → repair a failed run → complete the first unchecked acceptance criterion → verify and close → create or promote a plan.

## Machine-readable form

```bash
osc resume --json
```

Emits the `open-scaffold.resume.v1` summary. The fixture's expected output is committed at [`examples/resume-demo/expected-resume-summary.json`](../examples/resume-demo/expected-resume-summary.json) and locked by the resume test suite.

## Budget and boundaries

The packet is budgeted (default 4,000 characters; tune with `--max-chars`), deterministic for a given repo state, and redacts secrets and local absolute paths. It is compiled read-only from repo truth: it spawns nothing, approves nothing, and replaces chat archaeology — not human judgment.
