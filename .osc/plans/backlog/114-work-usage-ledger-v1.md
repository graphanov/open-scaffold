# Plan: 114-work-usage-ledger-v1

## Status

backlog

## Context

Open Scaffold records plans, runs, evidence, releases, and attempt comparisons, but it does not record what a work unit cost to produce. The strategy review found that Open Scaffold should not compete with LangSmith-style span tracing; its distinct lane is cost and usage joined to plan/run/PR/frontier artifacts.

## Goal

Add an optional `open-scaffold.usage.v1` per-run usage record and `osc ledger` roll-up that reports usage by work unit without storing prompts or tool-call traces.

## Constraints / Out of scope

- No hosted dashboard, live monitoring, per-token trace viewer, or per-tool-call span capture.
- Usage fields are nullable and source-labeled; do not fake exact costs when the adapter cannot provide them.
- Do not store prompt bodies, secrets, environment variables, or raw transcripts in `usage.json`.
- No automatic pricing tables in core unless explicitly versioned and optional.
- Ledger is per repository, like `git log`, not global analytics.

## Files to touch

- `docs/USAGE_LEDGER.md` — schema, source enum, nullability, privacy, and examples.
- `src/usage.ts` — usage schema validation and read helpers.
- `src/cli.ts` — add `osc ledger [--json] [--plan PLAN_SLUG] [--since DATE]`.
- `packages/runtime-omx/` — write a reference `usage.json` with nulls where exact numbers are unknown.
- `tests/usage.test.ts` — schema and ledger aggregation tests.

## Implementation Architecture Coverage

- Strengthens: token/cost accountability, audit trails, and work-unit reporting.
- Audit envelope: run IDs, plan slugs, usage source, ledger output, and adapter write evidence.
- Evaluation envelope: schema validation, aggregation tests, privacy scan for forbidden prompt/body fields.
- Feedback routing: unknown provider usage becomes `source: "unknown"`, not a blocker.
- Boundary: no observability SaaS, no pricing authority, no productivity benchmark claims.

## Acceptance criteria

- [ ] `docs/USAGE_LEDGER.md` defines `open-scaffold.usage.v1` with required `schemaVersion`, `runId`, `adapter`, and `source` fields plus nullable token, wall-clock, and estimated-cost fields.
- [ ] `osc ledger` joins `.osc/runs/*/usage.json` to `run.json` plan slugs and plan folder status.
- [ ] Markdown output includes plan slug, run ID, adapter, source, token fields, estimated USD, and status.
- [ ] `--json` outputs stable machine-readable ledger rows.
- [ ] Runtime OMX writes a minimal valid `usage.json` or explicitly documents why a source is `unknown`.
- [ ] Tests prove prompt bodies and raw transcripts are not required or duplicated in usage records.

## Verification steps

1. Run `npm test -- --run tests/usage.test.ts`.
2. Run a fixture `osc ledger --json` and parse the output as JSON.
3. Inspect generated `usage.json` fixtures for absence of prompt/transcript/secret fields.
4. Run `npm run build`.
5. Run `./verify.sh --strict`.

## Open questions

- Should `usage.json` be tracked by default, ignored by default, or left to project policy?
- Which adapters can provide real token/cost data without brittle log scraping?
