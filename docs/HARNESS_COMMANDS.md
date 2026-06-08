# Harness command surface

Open Scaffold now has a small command grammar for human-facing chat, plugin, CLI, and future app surfaces:

| Command | Use it for | What Open Scaffold records |
| --- | --- | --- |
| `$interview` | Clarify messy intent before work starts. | A bounded work-package draft, missing-context gates, and captured constraints. |
| `$plan` | Create or amend repo-native plans. | A plan artifact or amendment proposal with acceptance criteria and verification. |
| `$work` | Package one bounded slice for controlled worker execution. | `.osc/runs/<run-id>/run.json`, events, gates, postflight, feedback paths, and inherited accepted improvements. |
| `$team` | Package multiple coordinated worker lanes against one goal or plan. | Worker status records plus one shared evidence/postflight record. |

The product UX is the four `$commands`. The `osc` CLI is the backend surface for shell, CI, tests, and transport adapters.

## CLI backend

Use the backend when a shell, CI job, Codex plugin, Hermes worker, or future desktop app needs a deterministic call:

```bash
osc harness '$interview "tighten the task"' --json
osc harness '$plan "add the harness docs" --slug harness-docs --acceptance "Docs explain gates"'
osc harness '$work "implement one bounded slice" --context "plan is ready"' --json
osc harness '$team "split implementation docs review" --worker implementation --worker docs --worker review'
```

Human gates use the backend too:

```bash
osc harness status <run-id> --json
osc harness answer <run-id> --gate missing-required-context --answer "Use README and local tests only." --json
```

A gate answer is task input. It is not approval to commit, push, merge, publish, release, deploy, or rewrite history.

## Backend-only feedback and benchmark commands

Feedback and improvement commands exist for scripts and repro runs, not as a fifth primary UX command:

```bash
osc feedback record <run-id> \
  --source reviewer \
  --verdict retry \
  --scope run \
  --what-happened "The run overclaimed benchmark proof." \
  --why-it-matters "Open Scaffold claims must be evidence-backed." \
  --repair-hypothesis "Downgrade the wording and cite aggregate paths." \
  --evidence-path .osc/runs/<run-id>/run.json \
  --next-action retry

osc feedback analyze <run-id> --json
osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke
osc bench handoff-lab --out .osc/bench/handoff-lab-15
```

The backend commands write repo-local receipts. They do not spawn Codex from core, rank models, certify correctness, or grant owner approval.

## Transport boundary

The router takes command text and returns event/status/artifact shapes. It is transport-agnostic:

- CLI can call it through `osc harness`.
- A Codex plugin can call it and render the same status/events.
- Hermes can call it and preserve the same run record.
- A future desktop/control-room app can call it without changing the core protocol.

Runtime execution remains adapter-owned. Open Scaffold core packages controlled work, preserves receipts, and exposes gates; it does not become an autonomous authority.
