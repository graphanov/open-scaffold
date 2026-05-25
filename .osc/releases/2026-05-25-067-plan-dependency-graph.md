# Release / Evidence Note: 067-plan-dependency-graph

## Summary

Added `osc plan graph`, a read-only plan dependency graph command with ASCII, Mermaid, and JSON renderers. The command parses explicit plan references from plan text, reports unresolved/circular dependency warnings without blocking, and supports stage and focused upstream/downstream views.

## Traceability

- Roadmap / issue / task: repo backlog slice selected by runner automation; no GitHub issue was open for this slice.
- Plan: `.osc/plans/done/067-plan-dependency-graph.md`
- Run ID / run packet: `N/A` — implemented directly by runner automation for the selected backlog plan.
- Branch / PR: `feat/067-plan-dependency-graph`; https://github.com/graphanov/open-scaffold/pull/111

## Verification

- `node dist/cli.js plan graph --format json --stage active` — passed; produced machine-readable JSON with 1 active node, 0 edges, and 0 warnings after closing plan 067.
- `node dist/cli.js plan graph --format mermaid --stage active` — passed; produced a Mermaid `flowchart TD` without external URLs.
- `node dist/cli.js plan graph` — passed; produced an ASCII graph including `067-plan-dependency-graph`.
- Focused downstream regression for `blocks: <focus>` relationships — covered by `tests/plan-graph.test.ts` after Codex review feedback.
- `git diff --check` — passed.
- `npm test -- --run` — passed, 38 files / 337 tests.
- `npm run build` — passed.
- `npm pack --dry-run --json` — passed; package payload includes `dist/cli.js`, `dist/plan-graph.js`, and `docs/WORKFLOW.md`.
- `./verify.sh --strict` — passed, 10 pass / 0 fail / 0 warn.

## Outcome

Plan 067 shipped as a local CLI/documentation slice and was closed to `done/`. It does not infer dependencies from git history, mutate plans, validate dependency targets as blocking errors, or compute a critical path; warnings remain informational as scoped.

## Follow-up

- Owner gate: review and merge the PR.
- Publication gate: npm publication, if any, should be owner-approved and batched with the release train.
- GitHub Release gate: do not move Latest for this PR alone without owner approval.
