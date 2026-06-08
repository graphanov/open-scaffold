# Future control-room foundation

Open Scaffold's harness is designed so a future desktop/app/control-room surface can call the same core router as the CLI.

This document describes the product direction. It does not mean this PR ships a desktop UI.

## Direction

A future Open Scaffold control room could feel like a small work cockpit:

```text
left rail        center                  right rail
repos           chat with $commands      active plan
plans           command palette          workers
runs            progress/events          human gates
PRs             feedback capture         verification
benchmarks      postflight summaries     PR/release state
```

Primary command palette:

- `$interview`
- `$plan`
- `$work`
- `$team`

## Why the current foundation matters

The current harness writes transport-neutral contracts:

- `osc.harness-status.v1`
- `osc.harness-event.v1`
- `osc.controlled-work-run.v1`
- `osc.team-run.v1`
- `osc.feedback.v1`
- `osc.feedback-analysis.v1`
- `osc.handoff-compiler.v1`
- `osc.bench-suite-aggregate.v1`

A future app can render those shapes without changing core behavior.

## Human gate UI

The app should show required gates as blocked work, not as approvals:

- missing context,
- unanswered acceptance criteria,
- required owner decision,
- unsafe/no-go action.

Answering a gate resumes or updates the run package. It does not authorize commit, push, merge, publish, release, deployment, or history rewrite.

## Worker status UI

A `$team` run should show workers with:

- role/id,
- current state,
- evidence path,
- blockers,
- postflight summary.

The app should preserve one shared evidence record so multiple lanes do not split the source of truth.

## Benchmark UI

Benchmarks should show:

- mode: simulated or live,
- fixtures,
- ablations,
- aggregate metrics,
- proof gate status,
- blockers to broad claims,
- evidence paths.

The app should make “not proven” visually normal, not a failure to hide.

## Out of scope for this PR

- No Electron/Tauri/native desktop app.
- No long-lived worker supervisor.
- No direct Codex spawn from Open Scaffold core.
- No provider credential handling.
- No merge/publish/release buttons.
