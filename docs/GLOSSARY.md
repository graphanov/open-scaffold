# Glossary

Definitions for terms that appear across Open Scaffold docs, plans, and runtime harness documentation. Each entry states what the term means in this project's context.

---

## run packet

A repo-native handoff package stored at `.osc/runs/<run_id>/run.json`. It captures the plan, task, executor lane, runtime preset, operator surface, and any binding constraints needed for a worker (agent, human, or runtime) to begin bounded work without re-reading the full chat history. The core scaffold creates run packets; external agents or adapters do the work and return receipts or evidence. See [`docs/TASK_RUN_MODEL.md`](TASK_RUN_MODEL.md) for the full `task_id` / `run_id` / `question_id` identity model.

## glass cockpit

An event stream protocol for real-time status broadcasting. A glass cockpit transport relays structured events — status updates, blockers, questions, approvals, evidence receipts, and PR links — to a human-facing channel such as Discord, Slack, or a local dashboard. It is an opt-in lab/experimental surface: the core work-record loop does not require it. See [`docs/GLASS_COCKPIT_PROTOCOL.md`](GLASS_COCKPIT_PROTOCOL.md) for the event vocabulary.

## OMC / OMX / Codex

Runtime harnesses that extend a base agent with workflow modes.

- **OMC** (Oh-My-ClaudeCode): a runtime harness for Claude Code. It provides workflow skills (`/team`, `/ralph`, `/ultrawork`, `/ralplan`) and orchestration tooling on top of the Claude Code CLI. OMC is not itself an orchestrator; it is a harness that routes work to specialized sub-agents.
- **OMX** (Oh-My-Codex): the equivalent harness for OpenAI Codex. It provides parallel workflow commands (`$team`, `$ralph`, `$ultrawork`, `$ralplan`) on top of the Codex CLI.
- **Codex**: OpenAI's coding agent. In this project, "Codex" refers to the CLI agent, not to the historical Codex language model.

OMC and OMX are **not** orchestrators in the same sense as Hermes or Claw/OpenClaw. They are harnesses that add workflow modes to a base agent. See [`docs/OPEN_SCAFFOLD_SYSTEM.md`](OPEN_SCAFFOLD_SYSTEM.md) for the ontology.

## operator surface

The human-facing side of a run. An operator surface is where a human receives questions from the agent (`question_id`), approves or rejects decisions, and feeds back corrections. In a typical run, the operator surface is a chat thread, a Discord channel, or a CLI session. The glass cockpit protocol is the formalized event vocabulary for the operator surface; the run packet's `operator_surface` field identifies which surface is active for a given run. See [`docs/TASK_RUN_MODEL.md`](TASK_RUN_MODEL.md).

## Directory namespaces

| Path | What lives there |
|---|---|
| `.osc/` | Open Scaffold core: `plans/`, `runs/`, `releases/`, `specs/`, and state. The repo-native work record. Ships with the npm package. |
| `.omc/` | OMC runtime harness state: session state, notepad, plans managed by the OMC layer, research, logs. Not shipped in the public package. |
| `.omx/` | OMX runtime harness state: equivalent of `.omc/` for the Codex/OMX harness. |
| `.osc-dev/` | Owner workspace: full internal decision history, ADRs, specs, and snapshots for the open-scaffold project itself. Gitignored; not present in cloned templates or published packages. |

## Core-vs-adapter boundary

**Open Scaffold core is non-spawning.** Core creates and reads repo artifacts (plans, run packets, evidence notes, trace reports) and exposes a CLI for the work-record loop. It does not launch agents, call provider APIs, or execute work on its own. Work execution is adapter-owned: an external agent or runtime harness (OMC, OMX, a custom adapter) receives a run packet, does the work, and returns receipts or evidence to the scaffold.
