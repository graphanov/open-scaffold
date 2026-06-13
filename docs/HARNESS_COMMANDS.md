# Harness command surface (retired)

Status: historical/repositioned.

Plan 168 removed the `osc harness` backend and the `$interview` / `$plan` /
`$work` / `$team` grammar from the maintained Open Scaffold CLI. They remain
architecture history only. Current work starts from the repo record:

```bash
osc handoff
osc review <loop-dir> --compact
osc gate <loop-dir> --format json
```

Use `osc plan`, `osc amend`, `osc run`, `osc evidence`, `osc verify`, and
`osc close` for durable repo-state changes. `osc run` creates or previews a
`run.json` package only; execution belongs to the external agent, runtime, or
coordinator you already use.

## Migration recipe

- Clarification: ask questions in the operator surface or external runtime, then
  promote the result into `osc plan new <slug> --stage active`.
- Planning: use `osc plan new`, templates, and `osc plan validate --strict`.
- Execution: preview with `osc run <plan-path> --dry-run --runtime <id>`, then
  hand the plan or run packet to Claude Code, Codex, Hermes, a human, or another
  external runner.
- Review and retry: record attempts in `.osc/evolution/`, use `osc review` and
  `osc gate`, and record feedback/evidence before another attempt.
- Closure: `osc evidence new <slug>`, `osc verify`, and
  `osc close <slug> --message "<what shipped>"`.

## Historical note

The retired surface proved useful as a lab backend, but it also made Open
Scaffold look like it owned runtime orchestration. The current product boundary
is narrower and easier to verify: Open Scaffold owns the record, handoff,
review/gate, evidence, and close protocol; external runtimes own execution.
