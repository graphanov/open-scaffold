# Start Here

The single first action for a developer or AI agent entering this repository cold.

## What is Open Scaffold?

Open Scaffold is a harness for AI-assisted work. It clarifies messy intent into bounded slices, plans them in the repo, gates execution through explicit adapters, and keeps the whole work record — goal, plan, handoff, evidence, approvals, lessons — in git-tracked files. Any agent or future session can resume the work cold, with no chat history.

## The one first action

In the repo you want to scaffold:

```bash
npx open-scaffold@latest first-run
```

Three guided questions produce the minimum work record — `MISSION.md`, one active plan with acceptance criteria, an evidence skeleton — and print the exact commands to run next.

From there, the whole human grammar is four verbs:

```bash
osc harness '$interview "clarify the work"'
osc harness '$plan "describe the slice" --slug my-slice'
osc harness '$work "implement the slice" --context "plan is ready"'
osc harness '$team "split work across lanes" --worker implementation --worker review'
```

## See the core trick before adopting

Zero-context resume is the point. Explore [`../examples/resume-demo/`](../examples/resume-demo/) — a committed mid-flight project snapshot: one active plan with unchecked acceptance criteria, one amendment, one closed slice, and an evidence note. Everything a fresh agent needs to continue bounded work without any chat history. The narrated path is [`RESUME_WALKTHROUGH.md`](RESUME_WALKTHROUGH.md).

For a 30-second taste with no setup at all, compare two recorded attempts:

```bash
npx open-scaffold@latest compare \
  examples/attempt-compare/attempt-a \
  examples/attempt-compare/attempt-b
```

## Where to go next

| I want to… | Go to |
|---|---|
| Understand the mission and goals | [`MISSION.md`](../MISSION.md) |
| Learn the harness loop and the four verbs | [`HARNESS_COMMANDS.md`](HARNESS_COMMANDS.md) |
| See how the loop is wired | [`HARNESS_ARCHITECTURE.md`](HARNESS_ARCHITECTURE.md) |
| Pick or write a runtime adapter | [`ADAPTERS.md`](ADAPTERS.md) |
| Check what is stable vs experimental | [`STABILITY.md`](STABILITY.md) |
| Understand the version story | [`STABILITY.md#release-status`](STABILITY.md#release-status) |
| Look up unfamiliar terms | [`GLOSSARY.md`](GLOSSARY.md) |
| Read the system boundary map | [`OPEN_SCAFFOLD_SYSTEM.md`](OPEN_SCAFFOLD_SYSTEM.md) |

## Why this exists

AI-assisted work often dissolves into chat logs, terminal sessions, and PR comments. Weeks later, nobody can reconstruct what was asked, what changed, what was verified, or who approved it.

Open Scaffold makes the repository the shared memory:

```text
MISSION.md
  -> .osc/plans/...
  -> .osc/runs/<run_id>/run.json or amendment
  -> verification
  -> .osc/releases/...
  -> next slice
```

The scaffold helps when losing context is expensive: multi-session AI work, client delivery, audit-sensitive handoffs, and multi-agent review. It is overkill for disposable one-off scripts or clean single-session tasks.

## Adopt the minimum scaffold

Greenfield:

```bash
npx open-scaffold init --tier min --target <repo>
# or: --tier standard / --tier max
```

Brownfield:

```bash
npx open-scaffold init --from-existing --tier min --target .
```

Source checkout fallback:

```bash
git clone https://github.com/graphanov/open-scaffold open-scaffold
cd open-scaffold
npm install
npm run build
node dist/cli.js init --tier min --target <repo>
```

Minimum loop:

1. Define `MISSION.md`.
2. Create one active plan with acceptance criteria and verification: `npx open-scaffold plan new <slug> --stage active`, or `osc plan new <slug> --stage active` if installed locally. Shell fallback: copy `.osc/plans/handoff-template.md` into `.osc/plans/active/<slug>.md`.
3. Execute the slice and run project checks plus `./verify.sh --standard`.
4. Record evidence with `npx open-scaffold evidence new <slug>` or `osc evidence new <slug>`.
5. Amend when learning changes the plan with `npx open-scaffold amend <slug> --message "<what changed>"` / `osc amend <slug> --message "<what changed>"`; close when verified with `npx open-scaffold close <slug> --message "<what shipped>"` / `osc close <slug> --message "<what shipped>"`. Shell fallback: `./amend.sh <slug>` and `./close.sh <slug> --message "<what shipped>"`.

First-user checklist:

- `MISSION.md` is project-specific.
- `.osc/plans/active/` has one current plan before work starts.
- `.osc/plans/done/` does not contain unrelated maintainer history.
- `.osc/releases/` contains only downstream evidence or clearly labeled examples.
- `./verify.sh --standard` passes.
