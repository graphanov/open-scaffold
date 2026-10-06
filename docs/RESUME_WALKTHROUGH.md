# Zero-Context Resume Walkthrough

This walkthrough shows how a fresh AI agent — or you, a week later — resumes bounded work straight from the repo after total chat-context loss. One read-only command compiles the working memory.

The example uses the committed mid-flight fixture at [`examples/resume-demo/`](../examples/resume-demo/): one active plan with mixed acceptance criteria, one amendment, one closed slice, and one evidence note. These paths exist in the Open Scaffold source checkout; an initialized downstream project uses its own `.osc/` record instead. For first-use installation and a two-session path, see [`START_HERE.md`](START_HERE.md#your-first-session-to-session-handoff).

## The scenario

You open a repo you have not touched in a week. There is no chat context. The agent has no memory of previous discussion. The only source of truth is the repository.

## One command

```bash
cd examples/resume-demo
npx open-scaffold@latest handoff --plan demo-add-greeting
```

If the CLI is installed globally with `npm install --global open-scaffold@latest`, use `osc handoff --plan demo-add-greeting`. From a built source checkout, use `node ../../dist/cli.js handoff --plan demo-add-greeting`. `resume` remains an alias for the same command. A prior `npx` invocation does not install the bare `osc` command.

Packet excerpt (generic `osc` invocation shown):

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

A fresh agent now has the recorded goal, checklist state, open work, next bounded action, and verification commands without recovering the old conversation. Read the referenced amendments and evidence before acting on details or accepting completion claims.

The CLI preserves its invocation context for generated scaffold commands: through `npx`, the command above is printed with the running package's exact version; through `npm run osc --`, it uses that source runner. Programmatic and MCP calls retain the generic `osc` form. Verification commands supplied by the plan stay verbatim.

## What the packet contains

- A mission digest from `MISSION.md`.
- The selected active plan, its goal, and checklist acceptance criteria with their checked state. Without `--plan`, the highest-numbered active plan is selected; for concurrent work, pass the exact active plan slug explicitly.
- Amendments in numeric order — committed intent stays immutable; new scope layers on top. Factual completion checkboxes and reserved ` | Evidence: <reference-only-list>` suffixes may change while preserving criterion wording.
- The latest coherently bound run for the selected active plan when one exists: state, pending human gates, and the recorded repair hypothesis for failed or blocked runs, with a next bounded action such as `osc trace <plan-slug>` followed by `osc run .osc/plans/active/<plan-slug>.md --dry-run`. Explicit plan selection and multiple-active-plan handoffs exclude unbound runs instead of borrowing another task's blocker. A default handoff with only one active plan may still include a legacy unbound run.
- Compact ambient capture summaries from `.osc/state/ambient/*.json` when records exist: session id, normalized source/adapter, time span, tool census, files touched summary, valid final-message digest, and generated fidelity notes. Pick one explicitly with `--ambient-session <id>`. These are repo-wide observed transcript evidence; they do not establish task ownership or task-specific completion.
- Accepted lessons from `.osc/improvements/applied/` so future runs inherit them.
- The next bounded action, chosen by precedence: answer a pending gate → repair a failed run → complete the first unchecked acceptance criterion → verify and close → create or promote a plan.

## Machine-readable form

```bash
npx open-scaffold@latest handoff --plan demo-add-greeting --json
```

Emits the `open-scaffold.resume.v1` summary, including additive `ambient_capture` with normalized records when available. The fixture's expected output is committed at [`examples/resume-demo/expected-resume-summary.json`](../examples/resume-demo/expected-resume-summary.json) and locked by the resume test suite.

## Budget and boundaries

The packet is budgeted (default 4,000 characters; tune with `--max-chars`), deterministic for a given repo state, and redacts secrets and local absolute paths. Under tight budgets, ambient capture reduces to fewer records and fewer samples or is omitted rather than slicing raw records into output. It is compiled read-only from repo truth: it spawns nothing, approves nothing, certifies no correctness, authorizes no retry, and replaces chat archaeology — not human judgment.
