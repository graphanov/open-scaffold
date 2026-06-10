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
| Understand the version story | [`VERSION_TRUTH.md`](VERSION_TRUTH.md) |
| Look up unfamiliar terms | [`GLOSSARY.md`](GLOSSARY.md) |
| Read the system boundary map | [`OPEN_SCAFFOLD_SYSTEM.md`](OPEN_SCAFFOLD_SYSTEM.md) |
