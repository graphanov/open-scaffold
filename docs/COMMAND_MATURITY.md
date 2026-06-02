# Command maturity

Open Scaffold commands are intentionally labeled by maturity so first-time users see the stable path before lab or advanced surfaces.

The CLI registry is in `src/command-maturity.ts` and is rendered by:

```bash
osc help
osc commands
osc commands --json
```

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

Use `osc compare` as a first-read demo surface, not as an objective agent-ranking claim.
