# Release / Evidence Note: 136-compact-evidence-mode

## Summary

Adds `osc evidence compact` as a repo-hygiene surface for run packets and evolution-loop directories. The command emits a compact Markdown summary plus a machine-readable `open-scaffold.compact-evidence.v1` manifest that keeps failed criteria, evaluation status, verification commands, decisions, and digest-backed raw/local evidence refs visible without embedding raw logs or private paths.

## Traceability

- Roadmap / issue / task: Post-2000m evolve-v2 evidence-volume follow-up from `docs/decisions/2026-05-31-osc-evolve-v2-after-2000m.md`; no GitHub issue selected for this bounded slice.
- Plan: `.osc/plans/done/136-compact-evidence-mode.md`
- Run ID / run packet: `N/A` — this slice changed the CLI/docs/tests directly and did not spawn a runtime.
- Branch / PR: `feat/compact-evidence-mode`; https://github.com/graphanov/open-scaffold/pull/163

## Verification

- `git diff --check` — PASS.
- `node dist/cli.js plan validate .osc/plans/done/136-compact-evidence-mode.md --strict` — PASS, `0 issues found`.
- `npm test -- --run tests/cli-evidence-compact.test.ts tests/cli-lifecycle-help.test.ts` — PASS, 2 files / 16 tests.
- `node dist/cli.js evidence compact --help` — PASS; prints the compact-evidence usage surface.
- `npm test` — PASS, 55 files / 564 tests.
- `npm run build` — PASS, core and runtime-omx TypeScript builds.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- Public-safety scan over changed files — PASS; no owner identity, local absolute path, secret-token, raw-score-win, or unsupported proof-claim hits.

## Outcome

Candidate implementation is prepared on a feature branch. The shipped behavior is analysis/summary only: it writes compact evidence only when explicitly requested, does not spawn runtimes, does not delete raw evidence, does not mutate evolution attempt/frontier state, and does not claim benchmark-score or usage-proof wins.

No npm publish, GitHub Release, benchmark rerun, merge, or package-release sync is included in this slice.

## Follow-up

- Owner gate remains for PR review and merge.
- Package/public release reconciliation remains out of scope unless the owner explicitly authorizes a release train.
