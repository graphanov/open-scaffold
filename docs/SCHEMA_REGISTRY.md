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
- `open-scaffold.adapter.v1` — project-local adapter config.
- `open-scaffold.trusted_adapters.v1` — gitignored local adapter trust records.
- `open-scaffold.dispatch-receipt.v1` — adapter receipt.
- `open-scaffold.pr_check.v1` — structural PR work-record check.
- `open-scaffold.trace.v1` — local work-record replay.
- `open-scaffold.audit-envelope.v1` — digest-only audit envelope for curated local artifacts.
- `open-scaffold.evaluation.v1` — acceptance-criteria evaluation envelope scaffold / external scorer reference.

## Adding a schema

When adding a new durable artifact shape:

1. Add or update tests for the emitted artifact.
2. Add the schema entry in `src/schema-registry.ts`.
3. Link the source module or doc as the owner.
4. Add a short shape summary.
5. Keep output explicit about structural-only limits.
