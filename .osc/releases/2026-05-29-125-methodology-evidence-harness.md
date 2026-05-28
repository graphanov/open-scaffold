# Release / Evidence Note: 125-methodology-evidence-harness

## Summary

Added an `osc study` command plus a documented measurement protocol that derives honesty-bounded, source-labeled evidence for the methodology's value claims from a repo's own committed git history and `.osc/` artifacts. Every figure carries a source (`git` | `osc-artifact` | `metrics` | `unavailable`); unmeasurable claims are emitted as `null`/`unavailable` rather than imputed, and no causal claim is made. A first self-study over this repository is committed and reports its own null and negative findings.

## Traceability

- Roadmap / issue / task: Direction set in `docs/decisions/2026-05-28-pursue-methodology-evidence-harness.md`; no GitHub issue created in this lane.
- Plan: `.osc/plans/done/125-methodology-evidence-harness.md`.
- Run ID / run packet: N/A — implemented directly in this branch; no `osc run` packet was created for this lane.
- Branch / PR: branch `cli/methodology-evidence-harness-125`; PR: https://github.com/graphanov/open-scaffold/pull/145.

## Verification

All five of the plan's verification steps were run from the repo root; commands and results below.

- `npm test -- --run tests/study.test.ts` — PASS. 17 tests in 1 file (schema/validation, null-handling, source-label coverage, forbidden-imputation guards, fixture aggregation, git-unavailable regression, zero-commit git range regression, `--since` scoping regression, CLI `--json` valid JSON, markdown unavailable rows, computed headline observation).
- `npm run osc -- study --json --out /tmp/hermes-study-125-after-close.json` then JSON parse — PASS. 19 signals; 0 missing a source; 0 `unavailable` signals carrying a value.
- `npm run osc -- study --out /tmp/hermes-self-study-125-after-close.md` then comparison against committed `docs/EVIDENCE_SELF_STUDY.md` ignoring the `Computed at:` line — PASS after regenerating the self-study for the closed plan state.
- `npm run build` — PASS (exit 0; `tsc` core + runtime-omx, zero TypeScript errors).
- `./verify.sh --strict` — PASS (exit 0; 9 pass, 0 fail, 1 warn). The single warn is the pre-existing/environmental "Plan immutability check skipped (not a git repository or git not available)" from the verify.sh sandbox; it is unrelated to this change.
- Full suite regression check: `npm test -- --run` — PASS. 443 tests across 48 files (includes the runtime-omx no-spawn boundary test after `study.ts` was added to its local-git-reader allowlist).

## Outcome

Implemented in this branch:

- `src/study.ts` — `open-scaffold.study.v1` report model, `computeStudy`, `validateStudyReport` (imputation guards: every figure needs a source; `unavailable` ⇒ value must be `null`; values are number-or-null only), `renderStudyMarkdown` with a derived "Headline observations" section, and `writeStudyOutput`.
- `src/cli.ts` — `osc study [--json] [--since <date>] [--out <path>]` command, usage, dispatch case, and help-text entry, reusing the existing `metrics.ts` readers.
- `docs/EVIDENCE_METHODOLOGY.md` — protocol mapping ≥3 named FAQ hypotheses to repo-observable signals, honesty rules, scaffolded-vs-unscaffolded control model, threats to validity, explicit no-causation disclaimer, and a link to the out-of-scope A/B protocol.
- `docs/EVIDENCE_SELF_STUDY.md` — the committed `osc study` run over this repo.
- `tests/study.test.ts` — 17 tests covering schema, honesty guards, git-unavailable handling, zero-commit range rendering, `--since` scoping, rendering, and the CLI.
- `packages/runtime-omx/tests/no-spawn-boundary.test.ts` — added `src/study.ts` to the core local-git-reader allowlist (same justification as the already-allowlisted `metrics.ts`: read-only `git log`/`rev-parse`, no runtime spawn, no network).

What the self-study currently finds over this repo after plan close:

- Negative finding: 110 of 112 done plans carry no machine-readable approval decision — an honesty gap in this repo's own records, not evidence of adherence.
- Null observation: 3 of 6 value hypotheses (resume time, context re-explanation, token cost) are `unavailable` — no committed proxy exists; reported as null, not estimated.
- Traceability floor: only 3 commit subjects name a known plan slug (a floor, not a total).

Out of scope / boundaries respected: no causal claim; no provider/model benchmarking; no telemetry; `osc study` makes no network calls; the A/B comparison (`docs/AB_COMPARISON_PROTOCOL.md`) remains protocol-only text and was not run; no README/MISSION marketing claim was added.

approval.status: approved
approval.rationale: Daniel approved the `src/study.ts` no-spawn-boundary allowlist edit, approved closing plan 125, and approved staging/commit/push/PR preparation. Merge, publish, GitHub Release, and npm publish remain explicitly owner-gated.

## Follow-up

- PR review gate: open a PR from `cli/methodology-evidence-harness-125` and review CI/Codex feedback before any merge decision.
- Publication gate: no package publish or GitHub Release is needed/approved for this methodology/docs/CLI slice unless Daniel separately asks for a package/public-surface release sync.
- The self-study's remaining "approval not recorded" finding suggests a separate backlog item: backfill historical machine-readable approval decisions where evidence exists, or stop treating missing historical approval fields as adherence evidence.
- Optional, owner-gated, later: run `docs/AB_COMPARISON_PROTOCOL.md` to move from correlation to causation before any public value claim.
