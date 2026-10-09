# Plan: 203-first-run-write-boundary

## Status

done

## Context

Public issue #309 records first-run following linked mission and evidence destinations outside the selected repository. Current source matches public commit 2cfef48295d3f83542b575cf7fe73b79b0ccb263; bounded CLI/API fixtures reproduce fourteen unsafe successful calls while ordinary setup and preserving repeats pass. This child of plan184 repairs the observed local-record boundary; it does not extend execution or release authority.

## Goal

First-run refuses unsafe linked record destinations before reading record content or mutating the selected project, while ordinary setup and repeat preservation continue to work.

## Constraints / Out of scope

- Select issue #309 alone: one onboarding write contract, refusal matrix and rollback. Issues #310/#311 evidence integrity and #312 close recovery have independent contracts and remain separate.
- Reuse init's existing lexical lstat guard through one narrow export and optional first-run file/directory checks, plus the existing guarded writer; preserve initializer behavior for its current calls. No new maintained module or changes to path-safety, capture, scaffold, evidence selection grammar, CLI grammar, bootstrap, dependencies or workflows.
- Preserve deliberately selected existing repository-root aliases; inspect descendants lexically. Preserve the initializer's specifically observed immediate-linked-parent refusal for a new target; promise no arbitrary-ancestor traversal defense above the chosen root.
- Static preflight and final-component guarded opens do not prove transactions, race-free access, hardlink safety, mount/junction safety or an OS sandbox. Native Windows symlink and separately published npm behavior remain unqualified.
- Maintained source starts at 16984 physical lines across 41 files. At most 120 additional readable lines are admitted (17104 ceiling); measure the final exact count and update both metric bindings to that count with this plan's rationale. Preserve 41 files, the 20890 cleanup baseline, counting roots/algorithm and POSIX cross-check; greater growth requires amendment and fresh review. Never compress code to evade the metric.
- Keep README, assets, parent184, frozen John/evaluation/controller inputs and canonical owner drafts unchanged. No provider/runtime activation, credentials, release/npm publication, protection changes or new public issue.

## Files to touch

- `src/init.ts` — narrowly export/reuse the existing lstat destination guard without changing existing initialization calls.
- `src/first-run.ts` — shared complete destination preparation before record selection/content reads/initialization/writes, with guarded record writes.
- `tests/first-run.test.ts` — direct API/preview refusal, dangling/staged identity, ordering, alias and preserving-repeat behavior.
- `tests/blueprint-mega.test.ts` — real CLI failure/recovery and ordinary local setup controls.
- `tests/first-run-docs.test.ts` — verify documented refusal/recovery/limits against the supported behavior.
- `tests/framework-cleanup-metric.test.ts` — intentionally bind the measured physical source count in both exact assertions, with file count and algorithm preserved.
- `docs/START_HERE.md` — concise linked-record refusal, operator recovery and supported limits.
- `.osc/releases/2026-10-09-203-first-run-write-boundary.md` — curated actual evidence, issue/plan traceability and honest boundaries.
- `.osc/plans/active/203-first-run-write-boundary.md` — this immutable intent; factual checkbox/reference-only evidence annotations only during implementation.

## Acceptance criteria

- [x] Meaningful real CLI and direct-API regressions reproduce mission-final and releases-parent redirection on the pinned unchanged baseline, then refuse on the repaired source and rebuilt artifact. | Evidence: .osc/releases/2026-10-09-203-first-run-write-boundary.md
- [x] Unsafe record destinations refuse before mission, plan, evidence or starter-guidance mutation with a useful repo-relative offending-path diagnostic and CLI nonzero/API error; exact repository and outside-target bytes, types, link targets and inventory stay unchanged. | Evidence: .osc/releases/2026-10-09-203-first-run-write-boundary.md
- [x] Preflight covers linked .osc/plans/releases parents, final and dangling mission/plan/evidence destinations, other staged same-slug candidates and selected prior evidence; wrong-type components fail without content reads or partial writes. | Evidence: .osc/releases/2026-10-09-203-first-run-write-boundary.md
- [x] Ordinary empty/brownfield targets, defined missions, selected existing root aliases, Unicode/space/apostrophe roots, prior staged plans/evidence and edited-record repeats preserve compatible outcomes; specifically observed initializer immediate-linked-parent refusal stays intact. | Evidence: .osc/releases/2026-10-09-203-first-run-write-boundary.md
- [x] Refusal followed by deliberate fixture link repair and rerun succeeds; documentation and independent observed CLI/API outcomes agree without claiming transactions, race-free access, installed npm or all-Windows support. | Evidence: .osc/releases/2026-10-09-203-first-run-write-boundary.md
- [x] The readable candidate stays within 17104 physical lines/41 files, with both metric bindings equal to the actual measured count and the original cleanup baseline/counting/POSIX cross-check preserved. | Evidence: .osc/releases/2026-10-09-203-first-run-write-boundary.md
- [x] Fresh independent review, strict verification, build and full tests bind the unchanged committed candidate before public effects; live CI/review/protection and actual merge readback precede completion. | Evidence: .osc/releases/2026-10-09-203-first-run-write-boundary.md

## Verification steps

1. Preserve baseline failed-first regression receipts and private exact fixture snapshots; do not reset production history or publish private synthetic transcripts.
2. Run focused first-run, blueprint, docs, init, CLI-init, metric and resume tests; inspect refusal/recovery and preserved regular/repeat paths.
3. Measure maintained physical source and both cap bindings; inspect `git diff --check` and full scoped diff.
4. Commit the bounded candidate, then run `./verify.sh --strict`, `npm run build`, `npm test` on that unchanged committed HEAD and record actual results.
5. Obtain independent source/outcome review, actual rebuilt CLI/API journeys, and native publication reservation. Public PR links #309, this plan and curated evidence; closure requires current CI/AI review and actual readback under delegated owner gates.

## Open questions

- No owner taste decision blocks this observed P1 repair. If the narrow design exceeds the accepted paths or 120-line budget, amend and return to independent review.
- Native Windows links, installed package behavior, hardlinks and concurrent replacements require separate qualification; none is claimed here.
