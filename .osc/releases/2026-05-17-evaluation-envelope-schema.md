# Release evidence: evaluation envelope schema and osc eval

## Summary

This slice turns the PR #39 evaluation-envelope architecture into the first small, testable CLI mechanic.

It adds `osc eval init` and `osc eval check` for JSON-backed `open-scaffold.evaluation.v1` envelopes. The command can draft an evaluation envelope from a plan or run packet, then validate schema, acceptance-criterion coverage, evidence/rationale presence, evaluator source, decision consistency, feedback target IDs, and correction routing.

The command is intentionally structure-only. It does not judge domain correctness, certify compliance, benchmark models, run verification commands, approve release/merge, spawn runtimes, or anchor evidence externally.

## Scope

- Plan: `.osc/plans/done/036-evaluation-envelope-schema-and-osc-eval.md`.
- Branch: `feat/evaluation-envelope-schema`.
- Parent architecture: PR #39 / `.osc/plans/done/033-implementation-architecture-evaluation-lens-amendment-1.md`.
- Operator card: Hermes Kanban `t_83cb2410`.

## Traceability

- Plan: `.osc/plans/done/036-evaluation-envelope-schema-and-osc-eval.md`.
- Parent architecture release note: `.osc/releases/2026-05-17-implementation-architecture-lens.md`.
- New implementation module: `src/evaluation.ts`.
- CLI integration: `src/cli.ts`.
- Tests: `tests/evaluation.test.ts`, `tests/cli-eval.test.ts`.
- PR: pending owner review.

## Changes

- Added JSON envelope generation from:
  - plan acceptance criteria;
  - `open-scaffold.run.v1` run packets.
- Added deterministic fallback criterion IDs (`AC1`, `AC2`, etc.) without mutating immutable plan files.
- Added Bellman-informed identity/correlation hooks:
  - `evaluation_id`;
  - `idempotency_key`;
  - `subject`;
  - `correlation`;
  - feedback target validation.
- Added validation for:
  - schema presence;
  - criterion IDs and duplicate IDs;
  - allowed statuses: `pass`, `partial`, `fail`, `blocked`, `not_evaluated`;
  - evaluator source;
  - evidence/rationale coverage;
  - pass criteria needing evidence;
  - non-pass criteria needing correction routes;
  - approval not allowed while non-pass criteria remain;
  - weak approvals carrying explicit caution;
  - local evidence path existence;
  - feedback references to known criterion IDs.
- Updated public protocol docs to state that v1 CLI emits/checks JSON envelopes while preserving the no-judgment/no-compliance/no-runtime boundary.

## Verification

Completed verification for the PR branch:

- `npm test` — passed, 10 files / 94 tests.
- `npm run build` — passed.
- `npm run --silent osc -- eval init .osc/plans/done/036-evaluation-envelope-schema-and-osc-eval.md` — passed; generated the structure-only JSON envelope template.
- `npm run --silent osc -- eval check /tmp/osc-036-evaluation.json` — passed after filling the generated template with local verification evidence; 7 criterion evaluations / 0 warnings.
- `npm run osc -- verify` — passed, 0 warnings.
- `./verify.sh --standard` — passed, 6 pass / 0 fail / 0 warn.
- `git diff --check` — passed.
- Manual wording scan — passed for structure-only wording and no domain correctness, compliance certification, model benchmarking, runtime spawning, or external-ledger/anchor claims.

Final PR/Codex verification is recorded in the pull request after push.

## Outcome

Open Scaffold now has a concrete evaluation-envelope mechanic: users can generate the record that maps acceptance criteria to evidence and check whether the record is structurally complete before close/postflight.

The result makes the closed feedback loop more real without expanding Open Scaffold core into evaluator, model lab, compliance product, runtime, or ledger provider.

## Follow-up

Audit-envelope digest/Merkle/anchor mechanics remain a separate future slice.

Potential future refinements, after adopter evidence:

- optional JSON schema export;
- tracked default evidence location guidance;
- evaluation-event JSONL replay/dedupe;
- audit-envelope generation/checking;
- explicit integration from `osc verify` if/when repo-wide evaluation checks stop being surprising.
