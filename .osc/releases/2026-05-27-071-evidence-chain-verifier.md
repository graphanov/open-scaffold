# Release / Evidence Note: 071-evidence-chain-verifier

## Summary

Added `osc verify --evidence-chain`, a local structural verifier for Open Scaffold work-record chains. It checks whether plan, acceptance-criterion, evidence-note, run-packet, PR/reference, and close-decision links are present, missing, broken, or locally unverifiable without judging evidence quality or calling external services.

## Traceability

- Roadmap / issue / task: Context Authority prerequisite chain before `117-osc-trace-work-record-replay` and reserved context slices `119`-`121`.
- Plan: `.osc/plans/done/071-evidence-chain-verifier.md`
- Amendment: `.osc/plans/done/071-evidence-chain-verifier-amendment-1.md`
- Run ID / run packet: N/A — local Hermes implementation slice; no `osc run` packet was generated.
- Branch / PR: Branch `cli/evidence-chain-verifier`; https://github.com/graphanov/open-scaffold/pull/137

## Verification

- RED focused check: `npm test -- --run tests/evidence-chain.test.ts tests/verify-help.test.ts` — failed before implementation because `src/evidence-chain.ts` did not exist and `osc verify --help` had no evidence-chain flags.
- GREEN focused check: `npm test -- --run tests/evidence-chain.test.ts tests/verify-help.test.ts` — PASS for the focused evidence-chain and verify-help suites.
- Public-boundary regression check: `npm test -- --run tests/evidence-chain.test.ts tests/verify-help.test.ts tests/public-positioning.test.ts` — PASS.
- Full test suite: `npm test -- --run` — PASS locally; GitHub PR `ci` also passed.
- Build: `npm run build` — PASS.
- Whitespace: `git diff --check` — PASS.
- Scaffold verifier: `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- Local full-project evidence-chain smoke: `node dist/cli.js verify --evidence-chain` — intentionally exits 1 on historical broken links and missing legacy evidence; latest summary observed `plans checked=108`, `links found=1407`, `broken=1`, `missing=911`, `unverifiable=139`. This validates reporting behavior and exposes historical chain debt without blocking this slice's local structural implementation.
- Plan-scoped evidence-chain smoke: `node dist/cli.js verify --evidence-chain --plan 071-evidence-chain-verifier --strict` — PASS with `links found=28`, `intact=25`, `broken=0`, `missing=0`, `unverifiable=3`.
- Independent pre-commit review: Hermes subagent re-reviewed the local diff after fixes for non-done `--plan`, close-decision rationale, and `links found=` reporting — PASS; no blocking issues remaining.
- Codex review follow-up: PR #137 review found six valid P2 issues; follow-up tests/fixes require concrete `done/` plan-path citations in evidence notes, classify bare non-PR external evidence URLs as `unverifiable` instead of `missing`, recognize `PR #NN` / `#NN` references as acceptance-criterion evidence, reject stale pre-close plan paths as evidence-note backlinks, require run-packet references to include `run.json`, and restrict acceptance-criterion reference extraction to explicit `Evidence:` clauses.

## Outcome

approval:
  status: approved
  rationale: The 071 local structural verifier is implemented with focused tests, CLI wiring, bounded public wording, documentation, and full local verification. It remains a structural work-record check only; merge remains an owner gate.

## Follow-up

- Next chain slice after owner-approved 071 merge: `117-osc-trace-work-record-replay`.
- Reserved Context Authority slices remain sequenced after 117: `119-context-authority-page`, `120-osc-context-current`, and optional `121-doctor-stale-context-check`.
