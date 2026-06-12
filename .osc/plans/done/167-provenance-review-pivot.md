# Plan: 167-provenance-review-pivot

## Status

done

## Context

The benchmark program falsified the harness-as-worker-discipline architecture
and proved a narrower product: ambient provenance records, handoff packets, and
cheap-model review/gating (ADR:
`.osc-dev/decisions/2026-06-12-provenance-review-pivot.md`, evidence in
github.com/graphanov/harness-bench). The owner ratified a full pivot: positioning,
docs, value proposition, and command surface trim to the proven core, with the
parked surfaces labeled rather than deleted per the repo's migration discipline.

## Goal

Open Scaffold's public surface — mission, README, core help screen, key docs,
and MCP tool surface — presents exactly three capabilities (record, handoff,
review/gate) with the cheap-reviewer economic story and measured boundaries;
everything outside the proven core is relabeled lab/parked with migration
breadcrumbs; the two product-risk spikes (ambient capture from real hooks;
claims-vs-actual from tests/CI as criteria source) are validated.

## Constraints / Out of scope

- No deletions of history, plans, releases, or changelog entries; parked
  commands get maturity labels and breadcrumbs, not removal.
- Pinned honesty/positioning invariants survive (tagline, no forbidden
  vocabulary, "AI-assisted work" phrasing); pinned tests updated with rationale
  where emphasis legitimately changes.
- No version bump, npm publish, release, or merge (owner gates).
- harness-bench unchanged except a cross-link if needed.

## Files to touch

- `MISSION.md` (body; changelog via osc only), `README.md`, `docs/STABILITY.md` (command maturity + honest limits), `docs/START_HERE.md`, `docs/EVOLUTION_LOOP.md` (reframed as the review gate and record), `docs/HARNESS_ARCHITECTURE.md` (re-scoped intro), `docs/WORKFLOW.md`.
- `src/cli.ts` (core help re-centered: record/handoff/review first; parked surfaces to the appendix), `tests/cli-lifecycle-help.test.ts` (pins updated with rationale).
- `src/mcp-tools.ts` (+tests): expose handoff packet, checkpoint authorization, and ambient/digest reads as MCP tools if not already present.
- `tests/public-positioning.test.ts`, `tests/first-run-docs.test.ts`, `tests/reduced-cli-docs.test.ts`, `tests/framework-cleanup-metric.test.ts`, `tests/section-parser.test.ts` — pin updates with rationale.
- Spike artifacts under `examples/` or `.osc-dev/` per outcome.

## Acceptance criteria

- [ ] README and MISSION present record/handoff/review-gate as the product, the cheap-reviewer story, and the measured boundaries; no harness-as-OS framing remains in the first screen.
- [ ] Core `osc` help shows the proven core first and fits the pinned line budget; parked surfaces appear only in `help --all` with maturity labels; STABILITY's command-maturity table matches.
- [ ] MCP server exposes handoff-packet, checkpoint, and record/digest surfaces with tests.
- [ ] Spike 1: an ambient record + digest produced from a real Claude Code session via hooks/transcript on a non-bench repo, quality-checked against the bench digest format.
- [ ] Spike 2: claims-vs-actual verdict produced with `npm test` output as the criteria source (no bench scorer involved).
- [ ] Full chain green at every commit: `npm run build && npm test && ./verify.sh --strict && git diff --check`.

## Verification steps

1. Pinned-test files pass with documented pin changes only.
2. `osc mcp serve` tool list includes the three product surfaces.
3. Spike artifacts committed with short notes; both reproduce by command.
4. Read-through: no forbidden vocabulary; boundaries present wherever numbers appear.

## Open questions

- None. (Naming/rename of the package itself is deliberately out of scope until after this plan ships; owner decision.)
