# Release evidence: implementation architecture lens

## Summary

PR #39 was rescoped after owner review from a compact implementation-architecture concept page into an architecture-direction slice for Open Scaffold's audit/evaluation envelope standards.

The slice now states that Open Scaffold core should own the portable loop and record shapes for audit envelopes, evaluation envelopes, closed evaluation loops, and feedback-based improvement routing. It keeps domain evaluators, model benchmarks, automated compliance judgment, runtime spawning, provider SDKs, external ledgers, legal attestation, and production business authority outside core unless future plans explicitly bring them in through adapters or sibling products.

## Scope

- Plan: `.osc/plans/done/033-implementation-architecture-evaluation-lens.md`.
- Amendment: `.osc/plans/done/033-implementation-architecture-evaluation-lens-amendment-1.md`.
- Roadmap area: V2 adoption trust, implementation architecture clarity, evidence/evaluation/audit loop discipline.
- Branch: `docs/implementation-architecture-lens`.

## Traceability

- Original operator task: Hermes Kanban `t_8fb8b4e2`.
- Rescope operator task: Hermes Kanban `t_b2fbe5bf`.
- Plan: `.osc/plans/done/033-implementation-architecture-evaluation-lens.md`.
- Amendment: `.osc/plans/done/033-implementation-architecture-evaluation-lens-amendment-1.md`.
- Run ID: not applicable; local docs/protocol architecture slice.
- PR: https://github.com/graphanov/open-scaffold/pull/39.
- Evidence: this release note plus verification commands below.

## Changes

- Expanded `docs/wiki/concepts/implementation-architecture-lens.md` with:
  - architecture stance;
  - audit envelope;
  - evaluation envelope;
  - closed evaluation loop;
  - feedback-based improvement routing;
  - stronger non-claims around compliance, runtime, ledger, and model-benchmark scope.
- Updated `docs/SLICE_CLOSE_PROTOCOL.md` with `open-scaffold.evaluation.v1` and `open-scaffold.audit-envelope.v1` envelope sketches.
- Updated `docs/RUNTIME_BINDING_CONTRACT.md` with adapter responsibilities for filling audit/evaluation envelopes.
- Updated `docs/TASK_RUN_MODEL.md` with `evaluation_id` and `audit_envelope_id` identity concepts.
- Updated `docs/REFERENCE_TRUTH.md` with an external-anchor-adapter label for future ledger/notary references.
- Expanded `.osc/plans/handoff-template.md` so future plans can name audit envelope, evaluation envelope, feedback routing, and boundaries.
- Updated `ROADMAP.md` with a compact implementation-architecture direction note.
- Updated `docs/wiki/index.md` and `docs/wiki/log.md`.
- Added `.osc/plans/backlog/036-evaluation-envelope-schema-and-osc-eval.md` as the follow-up implementation candidate.

## Boundary

This slice defines architecture direction and protocol vocabulary. It does not add:

- `osc eval` implementation;
- schema-backed envelope validation;
- model benchmarking or model/task-fit recommendations;
- automated compliance judgment;
- legal audit certification;
- runtime spawning or runtime permission enforcement;
- provider SDKs;
- Hedera/hashgraph, Sigstore, timestamping, or other external anchoring integration;
- raw private/runtime log anchoring;
- production business-action reversal.

## Verification

Before the rescope amendment, the original PR passed:

- `./verify.sh --standard` — passed, 6 pass / 0 fail / 0 warn.
- `npm test` — passed, 8 files / 74 tests.
- `npm run build` — passed.
- `npm run osc -- verify` — passed, 0 warnings.
- `git diff --check` — passed.

Final verification for the rescoped PR is rerun after implementation and recorded in the PR body.

## Outcome

Open Scaffold now frames implementation architecture as more than a map of boundaries: core owns the durable audit/evaluation envelope standards and feedback-improvement loop, while adapters, systems of record, evaluators, ledgers/notaries, and humans supply execution, judgment, anchoring, and authority.

## Follow-up

Next implementation candidate: `.osc/plans/backlog/036-evaluation-envelope-schema-and-osc-eval.md`.

That follow-up should start with template generation and validation for evaluation envelopes, not automated domain judgment, model benchmarking, runtime spawning, or external-ledger integration.
