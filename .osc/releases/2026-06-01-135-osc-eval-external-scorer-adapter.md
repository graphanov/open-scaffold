# Release / Evidence Note: 135-osc-eval-external-scorer-adapter

## Summary

Adds `osc eval import`, a read-only external-scorer import path that maps structured 2000m v1 scorer JSON into an `open-scaffold.evaluation.v1` envelope. The adapter records scorer provenance, criterion status, correction routes, determinism/composite-score metadata, and analysis hints for `osc evolve analyze` without running the scorer or turning Open Scaffold into a domain judge.

## Traceability

- Roadmap / issue / task: follow-up from the 2000m v1 two-lane benchmark reset; no separate GitHub issue in this slice.
- Plan: `.osc/plans/done/135-osc-eval-external-scorer-adapter.md`.
- Run ID / run packet: N/A — direct CLI/evaluation-contract feature slice; no runtime or benchmark rerun.
- Branch / PR: branch `feat/osc-eval-import-scorer`; PR pending.

## Verification

- Focused tests: `npm test -- --run tests/evaluation.test.ts tests/cli-eval.test.ts` — PASS (2 files / 32 tests) after fixing pre-commit and Codex review findings.
- `npm test` — PASS (54 files / 558 tests).
- `npm run build` — PASS (core and runtime-omx TypeScript builds).
- `git diff --check` — PASS.
- `./verify.sh --strict` — PASS (10 pass / 0 fail / 0 warn).
- Added-line public-safety scan — PASS.
- Built CLI smoke: `node dist/cli.js eval import ... --adapter 2000m-v1 --scorer <tmp>/scorer.json --out <tmp>/imported-evaluation.json` then `node dist/cli.js eval check <tmp>/imported-evaluation.json` — PASS; imported schema `open-scaffold.evaluation.v1`, decision `rejected`, 2 criteria.

## Outcome

Implemented and locally verified. The slice adds a package-visible CLI surface for importing already-produced scorer output only. It does not spawn runtimes, call APIs, rerun benchmarks, certify correctness/compliance/model quality, approve work, or claim Open Scaffold improved raw 2000m v1 score.

## Follow-up

- Continue with compact evidence mode only after this import path is coherent and verified.
- No npm publish or GitHub Release work is included in this slice.
