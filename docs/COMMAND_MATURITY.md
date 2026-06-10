# Command maturity

Status: current public command-readiness guide after the framework cleanup and harness migration.

The top-level command list is rendered by:

```bash
osc help
```

This page explains how to read that help. It does not make an experimental runtime path stable.

## Labels

- `stable` — day-one/day-two workflow path. Safe for normal docs examples and normal repository use.
- `lab` — useful backend surface, but still proving product shape, runtime behavior, or evidence value.
- `advanced` — specialized maintenance, analysis, or power-user surface.
- `future` — direction only; not implemented as stable behavior.

## Rules

- Stable commands appear first in top-level help.
- Lab commands must say what is experimental or structurally limited.
- Runtime/spawn-capable commands must point to trust boundaries.
- Help wording must not imply semantic correctness, compliance, merge/publish authority, or default runtime spawning.

## Stable path today

The stable day-one/day-two path is the repo work record:

```bash
osc first-run --non-interactive --slug <slug> --mission <text> --goal <text>
osc plan new <slug> --stage active
osc plan validate <slug> --strict
osc start <plan> --runtime codex
osc run <plan> --runtime codex
osc trace <slug>
osc pr check <slug>
osc verify --evidence-chain --plan <slug> --strict
osc close <slug> --message <text>
```

Use `osc compare` as a first-read demo surface, not as an objective agent-ranking claim. Use `osc prove compare` as a lab receipt comparator for bounded scaffolded-vs-control evidence; it must keep caveats and source refs visible.

## Harness backend path

The primary human-facing harness UX is the small `$command` grammar:

```text
$interview
$plan
$work
$team
```

The maintained CLI backend for that grammar is:

```bash
osc harness '$interview ...'
osc harness '$plan ...'
osc harness '$work ...'
osc harness '$team ...'
osc harness status <run-id>
osc harness answer <run-id> --gate <id> --answer <text>
osc feedback record <run-id> ...
osc feedback analyze <run-id>
osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke
osc bench handoff-lab --out .osc/bench/handoff-lab-15
```

Help should return without side effects for:

```bash
osc harness --help
osc feedback --help
osc bench --help
osc bench suite --help
osc bench handoff-lab --help
```

Current maturity:

| Surface | Current maturity | Why |
| --- | --- | --- |
| `$interview` via `osc harness` | lab backend | Writes clarification drafts and gates; useful, but not the default day-one path. |
| `$plan` via `osc harness` | lab backend | Writes/proposes plans through the harness route; normal `osc plan` remains the stable path. |
| no-spawn `$work` | lab backend | Writes work packages, status, receipts, gates, feedback, retries, and handoff files without launching a runtime by default. |
| `$work --allow-spawn` | experimental | May launch an external adapter only with explicit backend authority and trust checks; live runtime behavior is not called stable. |
| `$team` | lab backend | Coordinates worker-lane records, shared evidence, gates, and feedback; useful for control-room surfaces but not a stable autonomous team runner. |
| `osc feedback record/analyze` | lab backend | Records repair signals and accepted-improvement input; not approval. |
| `osc bench suite` / `osc bench handoff-lab` | lab backend | Writes reproduction receipts and reports; broad claims stay blocked unless strict proof gates clear. |

These commands are backend/CI/repro surfaces. They are not a revival of `osc work ...` as the main UX, and they do not grant runtime spawn, merge, publish, release, deploy, or force-push authority.

## Removed / repositioned command migration notes

Framework cleanup removed several lab, analytics, and convenience commands from the maintained CLI surface. Clean clones and npm installs should use this shipped page as the migration breadcrumb; run-local break/removal ledgers under `.osc/runs/` are evidence artifacts, not package documentation.

| Removed or repositioned surface | Current route |
|---|---|
| `osc plan wizard`, `osc plan graph`, `osc plan stats` | Use explicit plan files, `osc plan new`, `osc plan validate`, `osc plan move`, and the `.osc/plans/` folder-as-status workflow. |
| `osc evidence compact` | Use release/evidence notes, `osc evidence collect`, `osc trace`, and `osc verify --evidence-chain` for durable evidence. |
| `osc task ...` | Use GitHub Issues, Kanban, or another external task tracker, then bind work back to `.osc` plans and run packets. |
| `osc eval import/check` | Use `osc eval init` only to scaffold a plan-based evaluation record; scorer import/check workflows are no longer a maintained live surface. |
| `osc status --dashboard`, `osc dashboard` | Use `osc status`, status events, PR comments, and evidence notes instead of local dashboard modes. |
| `osc work` | Use `osc start`, `osc run --dry-run`, or the harness backend `$work` route. Runtime execution remains adapter/orchestrator-owned. |
| `osc metrics`, `osc study`, broad `osc doctor` checks, resume helpers | Keep broad analysis, observational studies, and resume/handoff proof in docs/evidence unless a smaller maintained command exists. For bounded scaffolded-vs-control receipt comparisons, use `osc prove compare`; the full `osc ab` controlled-study surface remains documentation-only/future. |
