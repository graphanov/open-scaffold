# Plan: 036-evaluation-envelope-schema-and-osc-eval

## Status

backlog — follow-up implementation candidate after PR #39's architecture-direction rescope. Do not start until the architecture direction is reviewed and approved.

## Context

PR #39 rescopes the implementation-architecture lens to define audit envelopes, evaluation envelopes, the closed evaluation loop, and feedback-based improvement routing as Open Scaffold core standards. That PR intentionally remains docs/protocol-only so the architecture can be reviewed without bundling CLI mechanics.

This plan captures the next implementation slice: turn the evaluation-envelope standard into small, testable, schema-backed Open Scaffold mechanics.

## Goal

Add the smallest useful `osc` surface for generating and validating evaluation envelopes without turning Open Scaffold core into a domain evaluator, model benchmark, compliance judge, or runtime spawner.

## Constraints / Out of scope

- Do not add automated domain/business correctness judgment.
- Do not add model benchmarking, model/task-fit scoring, or LLM-as-judge orchestration.
- Do not add compliance certification or legal audit sufficiency claims.
- Do not add runtime spawning, process supervision, credentials, or provider-specific execution.
- Do not add Hedera/hashgraph, Sigstore, timestamping, or external anchor integration in this slice.
- Do not require users to rewrite old plans with stable AC IDs; generate fallback IDs such as `AC1`, `AC2` when needed.
- Keep the UX lightweight enough for solo developers and small teams.

## Files to touch

Likely candidates:

- `src/cli.ts` — add `osc eval` subcommands only if the architecture direction is approved.
- `src/artifacts.ts` or a new focused module — generate evaluation-envelope templates from run packets or plan criteria.
- `src/validation.ts` — validate evaluation-envelope structure and required correction routing.
- `tests/*` — cover template generation, validation, warning/error behavior, and no-regression CLI behavior.
- `docs/SLICE_CLOSE_PROTOCOL.md` — update only if implementation reveals a needed clarification.
- `docs/wiki/concepts/implementation-architecture-lens.md` — update only if the implementation changes the public concept.
- `.osc/releases/<date>-evaluation-envelope-schema.md` — release/evidence note for the implementation slice.

## Acceptance criteria

- [ ] `osc eval init <run-or-plan>` or equivalent generates an evaluation-envelope template with acceptance criteria, evaluator placeholders, evidence placeholders, decision, and improvement routing.
- [ ] `osc eval check <evaluation-path>` or equivalent validates that every criterion has a status, evidence or rationale, evaluator source, and correction route when status is not `pass`.
- [ ] Validation distinguishes schema/coverage checks from domain correctness; it never claims the result is correct, compliant, or production-grade.
- [ ] The command works for plans without explicit AC IDs by generating stable display IDs for the envelope.
- [ ] Tests cover pass, partial, fail, blocked, and not-evaluated criteria; weak approval; missing evidence; and missing improvement route.
- [ ] Docs and CLI help use owner-neutral, public-safe wording and preserve runtime/adapters/human approval boundaries.
- [ ] Release evidence records verification, scope, non-goals, and follow-up work.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `npm test`; expected exit 0.
3. Run `npm run build`; expected exit 0.
4. Run `npm run osc -- verify`; expected exit 0 with no unexpected warnings.
5. Run `git diff --check`; expected no whitespace errors.
6. Manually inspect CLI/docs wording for unsupported claims about compliance, model benchmarking, domain correctness, runtime spawning, or ledger anchoring.

## Open questions

- Should the public command be named `osc eval`, `osc postflight`, or `osc evidence eval` to avoid implying automatic judgment?
- Should evaluation envelopes live under `.osc/runs/<run_id>/evaluation.md`, `.osc/evaluations/`, or a tracked docs/evidence path when runs are gitignored?
- Should the first implementation validate Markdown/YAML only, or also emit JSON for tool consumers?
- Should audit-envelope digest mechanics be a separate plan after evaluation-envelope validation ships?
