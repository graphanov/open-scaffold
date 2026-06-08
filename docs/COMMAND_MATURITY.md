# Command maturity

Status: historical/repositioned guidance after the framework cleanup. The previous command-maturity registry in `src/command-maturity.ts` and the `osc commands` / `osc commands --json` surfaces were removed from the reduced maintained CLI. Current command grouping is rendered by:

```bash
osc help
```

Open Scaffold commands should still be presented by maturity so first-time users see the stable path before lab, advanced, historical, or migration surfaces.

## Labels

- `stable` — day-one/day-two workflow path. Expected to be safe for normal users and docs examples.
- `lab` — useful but still proving product shape or runtime boundary.
- `advanced` — specialized maintenance, analysis, or power-user surface.
- `future` — documented direction, not implemented stable behavior.

## Rules

- Stable commands appear first in top-level help.
- Lab commands must say what is experimental or structurally limited.
- Runtime/spawn-capable commands must point to trust boundaries.
- Help wording must not imply semantic correctness, compliance, merge/publish authority, or default runtime spawning.

## Stable path today

The stable day-one/day-two path is:

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

## Removed / repositioned command migration notes

Framework cleanup removed several lab, analytics, and convenience commands from the
maintained CLI surface. Clean clones and npm installs should use this shipped page as
the migration breadcrumb; run-local break/removal ledgers under `.osc/runs/` are
evidence artifacts, not package documentation.

| Removed or repositioned surface | Current route |
|---|---|
| `osc plan wizard`, `osc plan graph`, `osc plan stats` | Use explicit plan files, `osc plan new`, `osc plan validate`, `osc plan move`, and the `.osc/plans/` folder-as-status workflow. |
| `osc evidence compact` | Use release/evidence notes, `osc evidence collect`, `osc trace`, and `osc verify --evidence-chain` for durable proof. |
| `osc task ...` | Use GitHub Issues, Kanban, or another external task tracker, then bind work back to `.osc` plans and run packets. |
| `osc eval import/check` | Use `osc eval init` only to scaffold a plan-based evaluation envelope; scorer import/check workflows are no longer a maintained live surface. |
| `osc status --dashboard`, `osc dashboard` | Use `osc status`, cockpit events, PR comments, and evidence notes instead of local dashboard modes. |
| `osc work` | Use `osc start` or `osc run --dry-run` to create explicit handoff/run packets; runtime execution remains adapter/orchestrator-owned. |
| `osc metrics`, `osc study`, broad `osc doctor` checks, resume helpers | Keep broad analysis, observational studies, and resume/handoff proof in docs/evidence unless a smaller maintained command exists. For bounded scaffolded-vs-control receipt comparisons, use `osc prove compare`; the full `osc ab` controlled-study surface remains documentation-only/future. |
