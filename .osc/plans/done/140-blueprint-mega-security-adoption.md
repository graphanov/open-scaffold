# Plan: 140-blueprint-mega-security-adoption

## Status

done

## Context

The 2026-06-02 Open Scaffold review/blueprint package identified fifteen implementation items. The earlier dispatch-hardening PR completed the first two dispatch hardening items (`OSB-003` and `OSB-004`). The owner explicitly requested one large Ralph-loop PR to complete the remaining P0/P1/P2 blueprint work instead of continuing with separate small PRs.

## Goal

Implement the remaining blueprint security, adoption, runtime-boundary, PR-review, schema/help, and proof-program surfaces in one evidence-backed PR without publishing, releasing, merging, or weakening the no-spawn core boundary.

## Constraints / Out of scope

- Do not add Korean adoption/localization work.
- Do not publish npm, create/mark GitHub Releases, merge, deploy, or push to protected branches.
- Do not grant runtime/spawn/credential/network/commit/push/PR/merge/publish authority to adapters by default.
- Do not claim semantic correctness, compliance certification, production readiness, or runtime correctness from structural checks.
- Treat the blueprint ZIP as research input, not product documentation.
- Keep Open Scaffold core runtime-neutral and no-spawn by default.

## Files to touch

- `src/adapter-trust.ts`, `src/dispatch.ts`, `src/cli.ts` — adapter trust, dispatch enforcement, worktree isolation, command surfaces.
- `src/redaction.ts`, `src/doctor.ts` — redaction and committed-secret scan helper/check.
- `src/first-run.ts`, `src/pr-check.ts`, `src/command-maturity.ts`, `src/schema-registry.ts` — adoption/review/help/schema surfaces.
- `src/evidence-chain.ts`, `src/trace.ts`, `src/pr-summary.ts`, `src/compact-evidence.ts` — structural-only warnings and optional online GitHub labeling.
- `.github/workflows/open-scaffold-pr-check.yml` — fork-safe PR-native structural check workflow template.
- `README.md`, `SECURITY.md`, `docs/*.md`, `.osc/plans/*`, `.osc/releases/*` — first-touch docs, trust-boundary docs, runtime beta docs, proof templates, schema wording, plan/evidence closeout.
- `tests/*.test.ts` — focused regression tests for the blueprint surfaces.

## Implementation Architecture Coverage

- Strengthens: adapter trust, secret hygiene, runtime boundary, PR-native review, first-run adoption, command/schema discoverability, structural warning consistency.
- Audit envelope: this plan, the active program plan `138-blueprint-security-adoption-program`, evidence note `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`, and the PR opened from this branch.
- Evaluation envelope: TDD/focused tests, full test/build/strict gates, plan validation, evidence-chain strict, doctor secret scan, diff/private-leak scans, CI/Codex review loop.
- Feedback routing: valid reviewer/Codex/CI findings become immediate fixes on this branch; non-selected product ideas become backlog/follow-up only if mechanically scoped.
- Boundary: runtime execution remains adapter-owned and gated; Open Scaffold core remains a repo-native work-record and structural verifier, not a compliance/sandbox/runtime product.

## Acceptance criteria

- [x] `OSB-005 / SEC-03` adapter trust workflow exists with `osc adapter check`, `osc adapter trust`, `osc adapter list --trusted`, gitignored local trust records, digest invalidation, and dispatch refusal for untrusted adapters. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-006 / SEC-04` central redaction/secret scanning exists, dispatch logs are redacted, and `osc doctor --check secret-scan` reports obvious token/webhook/private-path findings without printing secrets. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-014` trust boundaries documentation exists and is linked from security/runtime/dispatch-facing docs. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-010` README first-touch path puts the problem, first command, file record, and use/skip guidance near the top while preserving maturity/no-spawn boundaries. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-001` `osc first-run` supports interactive/stdin and non-interactive modes, can initialize an existing repo, creates/validates a mission-plan-evidence skeleton, and prints next commands without runtime/network side effects. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-007` `osc pr check` emits Markdown/JSON structural reports, warns that results are structural-only, and ships a fork-safe GitHub Action template. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-009` one Codex/OMX runtime beta lane is documented with adapter trust, restricted environment, bounded logs, isolated worktree/non-main branch, evidence/receipt containment, and no correctness overclaim. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-002` command maturity/help registry puts stable day-one/day-two commands first and labels lab/advanced surfaces consistently. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-012` adoption proof template and proof index define honest labels, reproduction commands, friction/caveats, and boundary statements. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-008` optional GitHub online verification mode is exposed without changing offline defaults and labels references structurally/online separately. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-011` plan schema wording consistently explains `Status` plus seven required content headings, with optional execution/architecture headings. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-013` central schema registry exists with schema IDs, owners, maturity, emitters, and shape summaries. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`
- [x] `OSB-015` structural-only warnings are consistent across trace/evidence-chain/pr-summary/pr-check/evidence outputs touched by the slice. Evidence: `.osc/releases/2026-06-02-140-blueprint-mega-security-adoption.md`

## Verification steps

1. Run `git diff --check`.
2. Run focused tests for touched areas: `npm test -- tests/blueprint-mega.test.ts tests/cli-dispatch.test.ts tests/cli-lifecycle-help.test.ts --run`.
3. Run `npm test -- --run`.
4. Run `npm run build`.
5. Run `npm run osc -- doctor --check secret-scan`.
6. Run `./verify.sh --strict`.
7. Run `npm run osc -- verify`.
8. Run `npm run osc -- plan validate 138-blueprint-security-adoption-program --strict` and `npm run osc -- plan validate 140-blueprint-mega-security-adoption --strict` while active, then validate moved done plans if closed.
9. Run `npm run osc -- verify --evidence-chain --plan 140-blueprint-mega-security-adoption --strict` after evidence and closeout.
10. Run public-safety/private-leak scans across the diff before commit.
11. Open the PR, trigger/poll CI/Codex, and keep fixing until latest-head CI is green and unresolved current Codex threads are zero.

## Open questions

- None for implementation. Owner gates remain for merge, npm publish, GitHub Release/latest movement, real-provider runtime execution, deployment, and credential side effects.
