# Release / Evidence Note: 203-first-run-write-boundary

## Summary

John Lomein, an AI maintainer, prepared the exact reviewed plan for [issue #309](https://github.com/graphanov/open-scaffold/issues/309): refuse unsafe first-run record destinations before reading record content or changing the selected project. This note records the observed baseline and accepted design. Source implementation and repaired behavior remain pending.

## Traceability

- Issue: [#309 — Reject symlinked first-run record destinations before local writes](https://github.com/graphanov/open-scaffold/issues/309). The original public source finding is bound to `6abc8fbb35d4ec78e8bedf236332758561a5b558`, version `0.35.0`; its disposable files are synthetic.
- Plan: `.osc/plans/active/203-first-run-write-boundary.md`, SHA-256 `b80defa875aa8507acf193bcd510a04f310e3f5e9c237810d07033349c98c911`.
- Parent: `.osc/plans/active/184-john-six-day-maintainer.md` remains active, with 3/5 criteria complete; the six-day interval is incomplete.
- Source base: [public commit 2cfef48295d3f83542b575cf7fe73b79b0ccb263](https://github.com/graphanov/open-scaffold/commit/2cfef48295d3f83542b575cf7fe73b79b0ccb263).
- Branch: `codex/issue-309-first-run-write-boundary`; PR and delivery pending.
- Run ID / run packet: N/A — no Open Scaffold execution run was generated for this metadata preparation.
- Retained private baseline journey record SHA-256: `ceacc8ad467fd1b55b6934ed86781729acd716182b4d720529dd85def89eb932`; design v2: `ebc149a0af657e433b6e95a5e616d5ed981757378f5d5877517056516f23b7b6`; independent pre-admission review: `8d3ab84a9bcdf18eed998e7e95d1c6dec42a1bfd6bea92773e3c6b1b29d7902f`. These hashes identify retained bytes, not authenticated execution or authority.

## Verification

The prior Maintainer discovery recorded fourteen unsafe successful calls: seven linked-destination cases through each of the CLI and direct API. Final/dangling mission links, linked `.osc`, plan and releases parents, and dangling plan/evidence leaves each exited 0 and changed data in an owned sibling outside the selected fixture repository. Four regular/root-alias setup controls succeeded, and their four repeats preserved edited records and inventory. Every repository and sibling was inside the owned private fixture root. These observations establish no owner data-loss incident or human adoption.

The discovery used the existing built `dist` with retained source/artifact bindings; it did not rebuild that artifact. The independent reviewer inspected the saved receipts, streams, snapshots and current fixtures without executing another first-run batch. Its byte comparison found all 41 maintained source blobs equal to public `2cfef48295d3f83542b575cf7fe73b79b0ccb263`; the baseline measures 16,984 physical lines across 41 files. This metadata preparation changes no maintained source.

Current [first-run source](https://github.com/graphanov/open-scaffold/blob/2cfef48295d3f83542b575cf7fe73b79b0ccb263/src/first-run.ts) explains the result: existing-root discovery bypasses initialization checks, selection treats dangling paths as absent, preview can read mission content through a link, and ordinary record writes follow links. The accepted design reuses the existing lexical `lstat` guard in [init](https://github.com/graphanov/open-scaffold/blob/2cfef48295d3f83542b575cf7fe73b79b0ccb263/src/init.ts) for complete destination preparation before selection, reads, initialization or mutation, then uses the existing guarded writer. Deliberately selected existing root aliases remain compatible while record descendants stay lexical.

Independent acceptance covers seven existing implementation paths: `src/init.ts`, `src/first-run.ts`, `tests/first-run.test.ts`, `tests/blueprint-mega.test.ts`, `tests/first-run-docs.test.ts`, `tests/framework-cleanup-metric.test.ts` and `docs/START_HERE.md`. The +120 readable-line allowance, at most 17,104 lines with 41 files, is a proposed implementation budget, not measured growth. Final source count must bind both metric assertions and preserve the 20,890 cleanup baseline, counting roots/algorithm and POSIX cross-check.

## Outcome

prepared_not_observed: the reviewed intent and curated baseline/design record are prepared. Independent scope acceptance establishes no implemented repair, passing repaired-code checks, closed plan, PR, merge or release.

approval.status: blocked
approval.rationale: This is John Lomein's AI-maintainer preparation record under the scoped maintenance delegation. Source implementation requires a separately admitted exact task and writer lease. Failed-first regressions, actual repaired source and rebuilt CLI/API outcomes, unchanged committed-candidate strict verification/build/full tests, fresh independent review, publication review, current CI/protection and delivery readback remain pending. This record is not a close decision or publication authorization.

## Follow-up

Implement only issue #309 under the accepted plan and separate source admission. Observe refusal, exact byte/type/link/inventory preservation, operator repair/rerun and ordinary repeats; measure the final source count. Issues #310–312 retain separate contracts. After this necessary P1 repair, resume bounded discovery in an underrepresented product dimension.

The proposed preflight is static; final-component guarded opens do not establish transactions, race-free access, arbitrary-ancestor traversal defense above the selected root, hardlink safety, mount/junction safety or an OS sandbox. Native Windows symlinks, separately published npm behavior, interactive terminal appearance and fresh-reader comprehension remain unqualified.
