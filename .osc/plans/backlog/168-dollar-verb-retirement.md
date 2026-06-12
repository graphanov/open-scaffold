# Plan: 168-dollar-verb-retirement

## Status

backlog

## Context

Plan 167 removed the `$`-verb grammar and runtime-dispatch layers from every
public surface (README, MISSION, core help, docs) and labeled them deprecated
in `osc help --all`, with removal staged here. The code is still shipped and
reachable. The measured product is the record, the handoff packet, and the
review/gate loop; the dispatch layer is architecture history.

## Goal

The `$`-verb grammar (`$interview`/`$plan`/`$work`/`$team`), `osc harness`,
and the runtime-dispatch glue are removed from the maintained CLI, and the
freed `review` name becomes the front-door alias (`osc review` = today's
`osc analyze`), with `analyze` kept as a working synonym.

## Constraints / Out of scope

- No removal of the evolution loop, ambient record, handoff/resume, MCP, or
  schema surfaces — they are the product.
- Migration recipes in `docs/STABILITY.md#command-maturity` must survive with
  updated wording, not vanish.
- History stays: `.osc/plans/done/`, releases, and architecture docs keep
  describing what existed.

## Files to touch

- `src/harness.ts`, `src/dispatch.ts`, `src/runtimes.ts` (and their tests) — remove or fold residual maintained pieces.
- `src/cli.ts` — drop `harness` dispatch, reassign `review` alias, update help.
- `tests/cli-harness-backend.test.ts`, `tests/cli-lifecycle-help.test.ts`, `tests/framework-cleanup-metric.test.ts`, `tests/reduced-cli-docs.test.ts` — repin with rationale.
- `docs/HARNESS_COMMANDS.md`, `docs/HARNESS_ARCHITECTURE.md`, `docs/ADAPTERS.md`, `docs/STABILITY.md` — retire or mark historical.

## Acceptance criteria

- [ ] `osc help --all` contains no `$`-verb or `osc harness` entries; `osc harness` exits with a removal notice pointing at the migration recipe.
- [ ] `osc review` runs the analysis front door; `osc analyze` still works.
- [ ] Maintained-source LOC and file pins shrink and carry the removal rationale.
- [ ] Full chain green: `npm run build && npm test && ./verify.sh --strict && git diff --check`.

## Verification steps

1. `npm run build && npm test && ./verify.sh --strict && git diff --check` — all green.
2. `node dist/cli.js help --all | grep -c '\$'` — zero `$`-verb mentions.

## Open questions

- Whether `osc run`/runtime profiles survive as a thin adapter example or leave entirely — decide at plan activation.
