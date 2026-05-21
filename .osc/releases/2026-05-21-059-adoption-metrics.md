# Release / Evidence Note: 059-adoption-metrics

## Summary

Added a local `osc metrics` command that turns scaffold state into numerical health signals: plan distribution, cycle time, stale active plans, close velocity, evidence completeness, and approval distribution. The command supports JSON output for dashboards, date filtering with `--since`, lookback-window velocity with `--lookback`, and verbose per-plan details without using network services.

## Traceability

- Roadmap / issue / task: deterministic runner selected backlog plan `059-adoption-metrics`; no GitHub issue existed for this slice.
- Plan: `.osc/plans/done/059-adoption-metrics.md`.
- Run ID / run packet: `N/A` — direct runner implementation; no runtime run packet needed.
- Branch / PR: branch `cli/adoption-metrics`; PR https://github.com/graphanov/open-scaffold/pull/86.
- Version candidate: `open-scaffold@0.4.11` in `package.json` / `package-lock.json` for owner-gated npm publication after merge.
- Automation provenance: Opened/advanced by Open Scaffold runner automation; selected source `backlog_plan`.
- Owner gates: merge, npm publication, and GitHub Release creation/latest movement remain owner-gated.

## Verification

- `git diff --check` — pass.
- `npm test -- --run tests/metrics.test.ts` — pass; 1 file / 6 tests.
- `npm test -- --run` — pass; 32 files / 278 tests.
- `npm run build` — pass; core TypeScript and runtime OMX TypeScript builds succeeded.
- `node dist/cli.js metrics` — pass; default human-readable metrics table renders without flags.
- `node dist/cli.js metrics --json | jq .summary.total_plans` — pass; JSON parsed and returned `89` for the current repository metrics view.
- `node dist/cli.js metrics --json | jq .cycle_time.mean_days` — pass; JSON parsed and returned `0.99` for the current repository metrics view.
- `node dist/cli.js metrics --lookback 4 --verbose` — pass; verbose per-plan output rendered without errors.
- `npm pack --dry-run --json` — pass; package candidate `open-scaffold@0.4.11` includes `dist/metrics.js` and `dist/metrics.d.ts`.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.

## Outcome

`osc metrics` now reads only local scaffold files and local git history when available. It reports factual counts and percentages without benchmarking or ranking team performance, and it falls back to file modification timestamps with a warning when git history is unavailable. Codex review round 1 found two actionable edges before this note was finalized: the no-flag `osc metrics` path now renders the default table, and done plans without evidence-note dates now contribute mtime fallback cycle-time samples instead of being marked insufficient. The slice deliberately does not add charts, dashboards, metrics snapshots, databases, analytics services, network collectors, runtime spawning, npm publication, GitHub Release changes, or merge automation.

## Follow-up

- Owner gate: merge approval after review.
- Owner gate: publish `open-scaffold@0.4.11` only after explicit approval.
- Owner gate: create or update a GitHub Release for `v0.4.11` and mark it Latest only after explicit approval.
