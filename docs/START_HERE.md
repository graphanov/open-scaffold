# Start Here

The single first action for a solo developer or their AI agent entering this repository cold.

## What is Open Scaffold?

Open Scaffold gives AI-assisted work a durable repo record. It keeps the goal, plan, handoff, evidence, approval trail, and lessons in git-tracked files — so any agent or future session can pick up work without relying on vanished chat context.

- **Version info:** see [`docs/VERSION_TRUTH.md`](VERSION_TRUTH.md) for the current package line and historical tags.
- **Jargon:** see [`docs/GLOSSARY.md`](GLOSSARY.md) for run packet, glass cockpit, OMC/OMX, operator surface, and namespace definitions.

## The one first action

```bash
npx open-scaffold init --tier min --target .
```

Run it from the repo you want to scaffold. This adds the minimal scaffold to the current directory: `MISSION.md`, `.osc/plans/`, and `.osc/releases/`.

After that: define your mission in `MISSION.md`, create a plan with `osc plan new <slug> --stage active`, hand it off with a run packet or amendment, capture evidence, verify, and close the slice.

## See the core idea before adopting

From this repository checkout, run the 30-second demo — no runtime, no provider account needed:

```bash
npx open-scaffold@latest compare \
  examples/attempt-compare/attempt-a \
  examples/attempt-compare/attempt-b
```

To see what zero-context resume looks like in practice, explore `examples/resume-demo/`. It is a committed mid-flight project snapshot: one active plan with unchecked acceptance criteria, one amendment, one closed slice, and an evidence note — everything a new agent or session needs to reconstruct bounded next work without any chat history.

See [`docs/RESUME_WALKTHROUGH.md`](RESUME_WALKTHROUGH.md) for the narrated walkthrough and the no-overclaim disclaimer about what is and is not a shipped stable command today.

## Where to go next

| I want to… | Go to |
|---|---|
| Understand the project mission and goals | [`MISSION.md`](../MISSION.md) |
| See the current roadmap | [`ROADMAP.md`](../ROADMAP.md) |
| Learn the core work-record loop | [`README.md`](../README.md) |
| Understand the version story | [`docs/VERSION_TRUTH.md`](VERSION_TRUTH.md) |
| Look up unfamiliar terms | [`docs/GLOSSARY.md`](GLOSSARY.md) |
| Understand the system boundary map | [`docs/OPEN_SCAFFOLD_SYSTEM.md`](OPEN_SCAFFOLD_SYSTEM.md) |
| Try the resume fixture | `examples/resume-demo/` |
| Read the zero-context resume walkthrough | [`docs/RESUME_WALKTHROUGH.md`](RESUME_WALKTHROUGH.md) |
