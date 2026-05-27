# Release / Evidence Note: 071-evidence-chain-verifier

## Summary

Added `osc verify --evidence-chain`, a local structural verifier for Open Scaffold work-record chains. It checks whether plan, acceptance-criterion, evidence-note, run-packet, PR/reference, and close-decision links are present, missing, broken, or locally unverifiable without judging evidence quality or calling external services.

## Traceability

- Roadmap / issue / task: Context Authority prerequisite chain before `117-osc-trace-work-record-replay` and reserved context slices `119`-`121`.
- Plan: `.osc/plans/done/071-evidence-chain-verifier.md`
- Amendment: `.osc/plans/done/071-evidence-chain-verifier-amendment-1.md`
- Run ID / run packet: N/A — local Hermes implementation slice; no `osc run` packet was generated.
- Branch / PR: Branch `cli/evidence-chain-verifier`; PR pending owner review / not generated at evidence-note creation time.

## Verification

- RED focused check: `npm test -- --run tests/evidence-chain.test.ts tests/verify-help.test.ts` — failed before implementation because `src/evidence-chain.ts` did not exist and `osc verify --help` had no evidence-chain flags.
- GREEN focused check: `npm test -- --run tests/evidence-chain.test.ts tests/verify-help.test.ts` — 2 files passed, 13 tests passed.
- Public-boundary regression check: `npm test -- --run tests/evidence-chain.test.ts tests/verify-help.test.ts tests/public-positioning.test.ts` — 3 files passed, 23 tests passed.
- Full test suite: `npm test -- --run` — 46 files passed, 406 tests passed.
- Build: `npm run build` — PASS.
- Whitespace: `git diff --check` — PASS.
- Scaffold verifier: `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- Local full-project evidence-chain smoke: `node dist/cli.js verify --evidence-chain` — intentionally exits 1 on historical broken links and missing legacy evidence; latest summary observed `plans checked=108`, `links found=1423`, `broken=7`, `missing=899`, `unverifiable=139`. This validates reporting behavior and exposes historical chain debt without blocking this slice's local structural implementation.
- Plan-scoped evidence-chain smoke: `node dist/cli.js verify --evidence-chain --plan 071-evidence-chain-verifier --strict` — PASS with `links found=27`, `intact=25`, `broken=0`, `missing=0`, `unverifiable=2`.
- Independent pre-commit review: Hermes subagent re-reviewed the local diff after fixes for non-done `--plan`, close-decision rationale, and `links found=` reporting — PASS; no blocking issues remaining.

## Outcome

approval:
  status: approved
  rationale: The 071 local structural verifier is implemented with focused tests, CLI wiring, bounded public wording, documentation, and full local verification. It remains a structural work-record check only; merge remains an owner gate.

## Follow-up

- Next chain slice after owner-approved 071 merge: `117-osc-trace-work-record-replay`.
- Reserved Context Authority slices remain sequenced after 117: `119-context-authority-page`, `120-osc-context-current`, and optional `121-doctor-stale-context-check`.
