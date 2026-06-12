# Adapter notes (historical/repositioned)

Status: historical/repositioned.

Open Scaffold core no longer ships root `osc adapter` trust commands or
`osc dispatch` local-adapter execution glue. Those layers were retired in plan
168 so the core can stay focused on the repo-native work record, handoff
packets, review/gate judgments, evidence, and close protocol.

The current package still supports runtime intent in run packets:

```bash
osc run .osc/plans/active/<slug>.md --runtime codex --workflow plan --dry-run
osc run .osc/plans/active/<slug>.md --runtime codex --workflow plan
```

That command records intent and writes a `run.json` package. It does not launch
a runtime, trust project-local commands, read credentials, or certify the work.
A coordinator, CI job, local script, or runtime-specific package may consume the
packet outside Open Scaffold core and return evidence.

## runtime-dispatch-pattern

The supported pattern is now deliberately thin:

1. Open Scaffold validates plan intent and writes `run.json`.
2. An external operator or coordinator chooses the actual worker/runtime.
3. The worker produces code/docs/tests outside Open Scaffold core.
4. Evidence, evaluations, PR links, and verification output are promoted back
   into `.osc/releases/`, `.osc/evolution/`, PR bodies, or other repo truth.
5. `osc review` / `osc gate` judge the recorded facts; they do not execute or
   approve work on their own.

## reference-labels-for-named-tools

Use these labels when public docs mention concrete tools:

| Label | Meaning |
| --- | --- |
| Open Scaffold core | Repo-native protocol and CLI for plans, run packets, handoff, review/gate, evidence, and close. |
| Runtime lane | A tool that can do work when a human/coordinator hands it a bounded plan or run packet (Claude Code, Codex, Gemini, a human). |
| Runtime harness | A workflow wrapper around a runtime (OMC for Claude Code, OMX for Codex). Its native commands are not Open Scaffold core UX. |
| Coordinator | A system that decides what to run next and routes work (Hermes, Kanban, CI, custom scripts). |
| Operator surface | Where humans watch or steer work (Discord, Slack, GitHub comments, terminal). Not canonical truth. |
| Historical adapter glue | The retired root `osc adapter` / `osc dispatch` implementation. Mention only as migration history. |

## Packages

`packages/runtime-omx/` remains a runtime-specific package with its own explicit
boundary and tests. It is not a reason to reintroduce core spawning or the
retired root adapter commands.
