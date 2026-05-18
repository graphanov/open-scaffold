# Plan: 059-adoption-metrics

## Status

backlog — depends on 058 (doctor-auto-fix) for clean scaffold state that metrics can read reliably, and 050 (npm-publish) for baseline `osc` availability. This is the second slice in the 058–064 batch, providing the aggregation layer that turns raw scaffold data into actionable numbers. After doctor keeps the scaffold healthy and evidence collection captures verification data, metrics answer the natural next question: "how are we doing?" — cycle time, close velocity, stale plan count, evidence completeness, and approval distribution.

## Context

The scaffold system collects evidence across `.osc/releases/`, plan creation timestamps in `.osc/plans/`, plan movement through stage folders (active → done/blocked), amendment files, and evidence note verification data — but there is no aggregation layer to turn this raw data into answers. A user or team lead who wants to know "how long do our slices typically take?" or "how many plans are sitting stale?" has to manually grep and count across the filesystem. This is fragile, slow, and inconsistent. An `osc metrics` command that reads scaffold state from disk and computes standard engineering metrics — cycle time, stale plan count, close velocity, evidence completeness, approval distribution — would give teams real visibility into their development cadence without requiring an external analytics service, database, or dashboard. It keeps Open Scaffold self-contained while providing the kind of data-driven feedback that teams expect from modern project management tools.

## Goal

Add `osc metrics` that computes cycle time, stale plan count, close velocity, evidence completeness, and approval distribution from local scaffold state, with `--json` output for CI/dashboard consumption and `--since` for date-range filtering.

## Constraints / Out of scope

- Local-only: reads scaffold state exclusively from the filesystem — `.osc/plans/`, `.osc/releases/`, `.osc/evidence/`, and file timestamps. No network calls, no analytics service, no database.
- Metrics are calculated from file timestamps and plan content, not from an external database or event log. This means metrics are a snapshot of current file state, not a time-series.
- Output supports `--json` for machine consumption (CI pipelines, dashboards, monitoring tools) and human-readable table output by default.
- Does NOT benchmark, rank, or judge team performance. Reports facts only — no "your team is slow" commentary. The user interprets the numbers.
- Does NOT generate charts, graphs, or visualizations. The output is text (terminal table or JSON). Charting is future work.
- Does NOT require git history (works with file mtimes), though git-aware cycle time (using commit dates) is more accurate and preferred when available.
- Cycle time is measured from plan file creation timestamp to plan movement into `done/`. If a plan was created before the scaffold was initialized, its creation time is unknown — report as "insufficient data" rather than guessing.

## Files to touch

- `src/metrics.ts` — new file: metrics engine with `computeMetrics(opts?: { since?: Date; json?: boolean })` that returns a `ScaffoldMetrics` object. Sub-computations: `cycleTimeMetrics()` (mean/median/p90/p99 days from creation to close), `stalePlanMetrics()` (count of active plans >30 days since last file modification), `closeVelocity()` (plans closed per week over the lookback window), `evidenceCompleteness()` (percentage of done plans with non-empty evidence notes), `approvalDistribution()` (counts by approval strength: approved/weak_approved/rejected/blocked), `planDistribution()` (counts by stage: active/backlog/done/blocked). Date filtering via `--since` cuts off plans created before the given date.
- `src/cli.ts` — wire `metrics` command with `--json`, `--since <date>`, `--lookback <weeks>` (default 12 weeks for velocity calculation), `--table` (force human-readable table even when stdout is not a TTY), and `--verbose` (include per-plan breakdown). Update help text.
- `tests/metrics.test.ts` — test cases: metrics on the open-scaffold repo itself (50+ done plans — verify reasonable numbers), empty scaffold (all zeros, no crash), date filtering (`--since 2026-01-01` only includes plans created after that date), JSON output parseable by `jq`, evidence completeness calculation (8 plans closed, 3 have evidence notes → 37.5%), approval distribution counting, cycle time with git commit dates vs file mtime, stale plan detection boundary (plan at exactly 30 days is not stale; plan at 31 days is), zero-plan scaffold (reports zeros gracefully), lookback window effect on velocity.
- `tests/fixtures/` — create test scaffold states: `healthy-scaffold/` (10 plans at various stages with realistic timestamps), `empty-scaffold/` (no plans), `partial-evidence/` (7 of 10 done plans have evidence notes), `stale-mix/` (3 active plans, 2 stale). Include a `timestamps.json` manifest that `touch`-based test setup reads to set realistic file mtimes without requiring git.
- `docs/WORKFLOW.md` — mention `osc metrics` as the go-to command for understanding scaffold health numerically, and `osc metrics --json` for CI dashboards.

## Acceptance criteria

- [ ] `osc metrics` prints a table with: total plans by stage (active/backlog/done/blocked counts), average days from plan creation to close, median cycle time, p90 cycle time, stale active plans (>30 days since last modification), close velocity (plans closed per week over the lookback window), evidence completeness (percentage of done plans with evidence notes), and approval distribution (approved/weak_approved/rejected/blocked counts).
- [ ] `osc metrics --json` outputs a single JSON object with keys `summary` (top-level counts), `cycle_time` (mean/median/p90/p99 in days), `stale` (count and list of slugs), `velocity` (plans/week), `evidence` (completeness percentage and per-plan detail), `approval` (distribution object). Output is valid JSON parseable by `jq`.
- [ ] `osc metrics --since 2026-01-01` filters all calculations to only include plans created on or after the given date.
- [ ] `osc metrics --lookback 4` calculates close velocity over the most recent 4 weeks instead of the default 12.
- [ ] Works with zero plans: reports all zeros, no crash, exit code 0. Output says "No plans found in scaffold — run `osc plan new` to create your first plan."
- [ ] All data sourced from local filesystem only — no network activity during `osc metrics` execution (verify with network monitoring or by running offline).
- [ ] Reports when data is incomplete: "8 plans closed but only 3 have evidence notes (37.5%)" — clearly indicates data gaps without penalizing.
- [ ] `osc metrics --verbose` includes per-plan breakdown: each plan's slug, stage, age in days, evidence status, and approval strength.
- [ ] Cycle time uses git commit dates when available (more accurate); falls back to file mtime with a warning "git not available — using file modification times for cycle time calculation".
- [ ] Date parsing for `--since` handles ISO 8601 dates (`2026-01-01`), relative dates (`30 days ago`, `last month`), and rejects ambiguous formats with a clear error message.

## Verification steps

1. Run `osc metrics` on the open-scaffold repository (which has 50+ done plans). Verify output shows reasonable numbers: total plans >50, non-zero cycle time, some done plans with evidence, approval distribution entries.
2. Run `osc metrics --json | jq .summary.total_plans`. Verify jq parses successfully and returns a number.
3. Run `osc metrics --json | jq .cycle_time.mean_days`. Verify a reasonable positive number.
4. Create an empty scaffold directory with `.osc/plans/` and no plan files. Run `osc metrics`. Verify output says "No plans found" and all numbers are zero. Exit code is 0.
5. Create a scaffold with 10 plans: 5 done (3 with evidence notes, 2 without), 3 active (1 stale with mtime 45 days ago), 2 backlog. Run `osc metrics`. Verify evidence completeness is 60% (3/5), stale count is 1, total plans is 10, done count is 5.
6. Run `osc metrics --since 2026-06-01` on the test scaffold. If all plans were created before June 2026, verify output reports zero plans in range.
7. Run `osc metrics --lookback 2` to test lookback window. Verify velocity calculation only considers plans closed in the last 2 weeks.
8. Run `osc metrics --verbose`. Verify per-plan breakdown lists each plan slug with stage, age, evidence status, and approval.
9. Run `osc metrics --help`. Verify all flags are documented with usage examples.

## Open questions

- Should `osc metrics` also report amendment frequency (plans with 0/1/2+ amendments)? Plans with many amendments indicate scope volatility and could be a useful signal. Add as `--include-amendments` flag initially; promote to default if useful.
- Should metrics track "time in each stage" (backlog → active → done) rather than just creation → close? Multi-stage timing requires tracking folder-move events, which we don't currently log. This would require a state-change log (`.osc/metrics-log.jsonl`) that records when a plan moves between folders. Future work.
- Should `osc metrics` be runnable as a git hook or scheduled task that writes a metrics snapshot to `.osc/metrics/` for historical comparison? A `--snapshot` flag that writes the current metrics to `.osc/metrics/YYYY-MM-DD.json` would enable trend analysis over time without a database. Defer to future slice.
- What's the right default lookback window for close velocity? 12 weeks (one quarter) provides enough data for meaningful velocity without being skewed by ancient history. Teams on 1-week sprint cycles may prefer 4 weeks; teams on monthly cycles may prefer 26 weeks. The 12-week default with `--lookback` override handles both.
- Should metrics distinguish between "plan created" and "plan activated" (moved from backlog to active)? Currently the scaffold doesn't track activation time separately from creation time. If activation tracking is added later, metrics should update to use activation time as the start of the cycle time clock.
