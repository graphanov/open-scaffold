# Release / Evidence Note: 168-dollar-verb-retirement

## Summary

Plan 168 retires the Open Scaffold-owned `$`-verb/harness/dispatch layer from the maintained CLI, makes `osc review` the front-door alias for recorded-attempt analysis while keeping `osc analyze` as a synonym, and removes the outdated README resume screencast GIF. The core product boundary is now narrower: work record, handoff, review/gate, evidence, and close; external runtimes/coordinators own execution.

## Traceability

- Roadmap / issue / task: Plan 168 from `.osc/plans/done/168-dollar-verb-retirement.md` plus amendment `.osc/plans/done/168-dollar-verb-retirement-amendment-1.md`.
- Plan: `.osc/plans/done/168-dollar-verb-retirement.md`.
- Run ID / run packet: N/A — this was implemented directly on branch `168-dollar-verb-retirement`; no runtime spawned and no run packet was required.
- Branch / PR: branch `168-dollar-verb-retirement`; PR #212 `https://github.com/graphanov/open-scaffold/pull/212`.

## Verification

- `npm run build` — PASS (`tsc -p tsconfig.json` and `tsc -p packages/runtime-omx/tsconfig.json`).
- `npm test` — PASS post-close final: 46 test files, 503 tests.
- `./verify.sh --strict` — PASS post-close final: 10 pass, 0 fail, 0 warn.
- `git diff --check && git diff --cached --check` — PASS.
- `npm run osc -- plan validate 168-dollar-verb-retirement --strict` — PASS: 0 issues found.
- `npm run -s osc -- help --all | grep -c '\$'` — PASS: `0`.
- `npm run -s osc -- harness` — PASS removal behavior: exit 2 with `osc harness was removed/repositioned by the framework cleanup. See docs/STABILITY.md#command-maturity for shipped migration notes.`
- Maintained source measurement — PASS: `src` + `packages/runtime-omx/src` = 14,437 LOC across 39 TypeScript files; `tests/framework-cleanup-metric.test.ts` repinned with plan-168 and Codex-review rationale.
- README GIF removal — PASS: README no longer references `.github/assets/readme-resume-screencast.gif`; the tracked `.github/assets/readme-resume-screencast.gif` asset is deleted in this branch.
- Stale public-command guard — PASS: current docs no longer publish a runnable `osc bench suite --mode live` recipe, old root adapter-trust command snippets, or the retired active `osc dispatch` trust wording.
- Runtime receipt metadata guard — PASS: built-in runtime profile evidence paths now point at `.osc/runs/<run_id>/dispatch-receipt.json` for `open-scaffold.dispatch-receipt.v1`, not the run-packet `run.json`.

## Outcome

The shipped candidate removes `src/harness.ts`, `src/dispatch.ts`, `src/runtimes.ts`, and `src/adapter-trust.ts`; preserves runtime-profile metadata in `src/runtime-profiles.ts`; keeps ambient record extraction, run-packet generation, evolution analysis, `osc review`/`osc analyze`, and `osc gate`; gives `osc review --help` / `osc analyze --help` alias-specific help before dispatching to the evolution analyzer; keeps the runtime-omx validator compatible with core-generated `ralplan` packets while accepting legacy `$ralplan` packets; keeps `open-scaffold.dispatch-receipt.v1` registered for adapter receipts; points built-in runtime profile receipt metadata at `dispatch-receipt.json`; rewrites public docs around the record/handoff/review boundary; updates proof-harness docs so live adapter benchmarks are external-harness evidence rather than dead core commands; updates trust-boundary docs so root adapter/dispatch trust commands are clearly retired; and tombstones the retired adapter/harness docs instead of pretending they are live product guidance.

No merge, npm publish, GitHub Release, deployment, force-push, or runtime execution is authorized by this evidence note.

## Follow-up

- PR is open; update it only with final post-close verification and review-loop evidence as needed.
- Owner gate remains: review and merge only; no publish/release/version bump is part of this slice.
- Phase 2 (`169-review-battery`) and Phase 3 (RCM adoption kit) remain inactive until owner explicitly activates them.
