# Schema registry

Open Scaffold emits several small JSON/Markdown artifact shapes. The command-line registry is the source of truth for schema IDs, maturity, owners, emitters, and shape summaries:

```bash
osc schemas list
osc schemas list --json
osc schemas show open-scaffold.run.v1
```

This page explains the policy around that registry.

## Policy

- Every durable emitted artifact shape should have a schema ID.
- Every schema ID should name an owning source module or doc.
- Schema maturity uses the same language as command maturity: `stable`, `lab`, `advanced`, or `future`.
- Registry entries document artifact shape and ownership only. They are not correctness, compliance, production-readiness, or approval claims.

## Current owners

Use `osc schemas list --json` for the machine-readable list. Representative schemas include:

- `open-scaffold.run.v1` — run packet under `.osc/runs/<run_id>/run.json`.
- `open-scaffold.dispatch-receipt.v1` — adapter receipt under `.osc/runs/<run_id>/dispatch-receipt.json`.
- `open-scaffold.pr_check.v1` — structural PR work-record check.
- `open-scaffold.trace.v1` — local work-record replay.
- `open-scaffold.audit-envelope.v1` — digest-only audit envelope for curated local artifacts.
- `open-scaffold.evaluation.v1` — acceptance-criteria evaluation envelope scaffold / external scorer reference.
- `open-scaffold.evolution-judgment-checkpoint.v1` — retry authorization gate built from evolution analysis plus optional independent judge input.
- `osc.ambient-work-record.v1` — post-hoc work record extracted from observed run facts so workers do not hand-write bookkeeping in-loop.
- `osc.feedback.v1` and `osc.feedback-analysis.v1` — feedback records and repair hypotheses.
- `osc.accepted-improvement.v1` — accepted lesson files for relevant future-run inheritance.
- `osc.handoff-compiler.v1` — compact continuation packet contract.
- `osc.bench-suite-aggregate.v1` and `osc.handoff-lab-aggregate.v1` — benchmark/proof smoke aggregates with no-overclaim gates.

## Adding a schema

When adding a new durable artifact shape:

1. Add or update tests for the emitted artifact.
2. Add the schema entry in `src/schema-registry.ts`.
3. Link the source module or doc as the owner.
4. Add a short shape summary.
5. Keep output explicit about structural-only limits.
