# Design choices

The decisions that shaped open-scaffold and why. Every entry here is a fork in the road we explicitly chose, not a default we stumbled into. Read this if you want to understand what the scaffold *is*, not just what it does.

## The decisions

**Why CLAUDE.md and AGENTS.md are hand-duplicated instead of generated.** Because a build script that breaks in six months is worse than two files that might drift in six months. Drift you notice on the next read; a broken generator rots silently. The paired-view header in each file tells you to mirror edits, and if drift happens three times in the first year, we revisit.

**Why orchestration is adapter-mediated, not embedded in the core.** The plan's `Execution strategy` section is a portable contract. Generic open-scaffold stores and parses that contract under `.osc/`; runtime adapters translate it into runtime-native handoffs or spawning. This keeps the core portable across OMC, OMX, Cursor, plain Claude/Codex, or a human in a terminal. Open Scaffold should expose runtime selection in run packets, but core should not depend on old adapter repositories or claim they are first-class packages.

**Why executable Open Scaffold starts with an agentic runtime package, not hidden core spawning.** The owner accepted that Open Scaffold should become executable, but the product strength is still source-of-truth-first evidence and auditability. The first executable boundary is an in-repo agentic runtime package, `packages/runtime-omx/`, targeting OMX / oh-my-codex with `$ralplan` first. Core continues to create run packets and evidence expectations; the package proves dry-run/receipt behavior first and may only launch real runtime work behind explicit opt-in gates. See [`docs/AGENTIC_RUNTIME_LAYER.md`](../AGENTIC_RUNTIME_LAYER.md).

**Why runtime strategy research is evidence-first.** Open Scaffold core does not own autonomous spawning today, but Milestone 16 treats thin adapter invocation or a sibling runtime as explicit strategic options. Use [`docs/RUNTIME_STRATEGY_RESEARCH_CRITERIA.md`](../RUNTIME_STRATEGY_RESEARCH_CRITERIA.md) to compare external frameworks before changing the spawning boundary. Use [`docs/SPAWNING_BOUNDARY.md`](../SPAWNING_BOUNDARY.md) for the current adapter/runtime boundary and dispatch-receipt direction.

**Why plans are immutable once committed.** Because edits silently rewrite history. Six weeks from now, you won't remember whether the plan said X all along or whether you quietly switched last Tuesday. The amendment protocol is the trade: when the world changes, write `<plan>-amendment-1.md` next to the plan, add a one-line entry to MISSION.md's changelog, and the original plan stays frozen. Slower in the moment, honest forever after.

**Why mission-first gating is the first thing `verify.sh` checks.** Because everything downstream is meaningless without it. A plan with no mission is a plan for nothing. The check exists so the very first failure mode is impossible to ignore — and so progressive disclosure can hide everything else until the mission is real.
