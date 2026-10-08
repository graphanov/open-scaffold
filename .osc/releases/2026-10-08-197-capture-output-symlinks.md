# Release / Evidence Note: 197-capture-output-symlinks

## Summary

Private prototype preserves lexical capture output components for the existing safe writers, while canonical identities still protect transcript aliases. Only repository-root aliases are rebased. In-repository final and parent links are refused, and explicit external final links reach the existing final-component refusal.

## Traceability

- Plan: `.osc/plans/active/197-capture-output-symlinks.md`.
- Prototype baseline: `ce73a82fb0284adb58d818cdaa3e8952c78ad123`; capture source is unchanged from discovery code `c905becb5ea5ddc8329247248eb5f047d12ef671`.
- Exact proposed paths: `src/capture.ts`, `tests/capture.test.ts`, `tests/cli-capture.test.ts`, and this evidence note.
- Planned branch: `codex/john-capture-output-symlinks`; parent plan `184-john-six-day-maintainer` remains active.
- Private design only; this prototype performs no production source write or delivery. Implementation admission and its independent verification remain required.

## Verification

- Failed first on the bound baseline: six direct regressions and five public CLI regressions. Four additional actual CLI fixtures show target mutation or redirected creation for default final, hook-safe final, default parent, and explicit external final links.
- Candidate focused capture and CLI files: 126 tests passed. Eleven actual candidate CLI fixtures pass byte/link/transcript preservation or ordinary-output expectations, including malformed tail, root aliases, transcript alias refusal, and explicit external missing/regular files.
- Initial CLI test execution failed because tsx's IPC socket path exceeded the host limit in the private temporary directory. Retained that result; tests use the same `node --import` tsx loader route as checked-in hooks.
- Maintained source: 41 files, 16,866 baseline lines, 16,877 candidate lines (+11), under the unchanged 20,890 cleanup baseline. The unchanged 16,866 cap fails one targeted metric test; the shell measurement control passes. Metric roots and helper are unchanged.
- Full strict/build/full-suite verification and independent acceptance remain required on an admitted unchanged committed head.
- Earlier preparation's live-corpus parser check failed because this note omitted its required headings (31 other tests passed); metadata correction preserved that failed attempt. This prototype does not erase that preparation history.

## Outcome

Design status is REVISE solely because the readable source change exceeds the current cap and the metric helper is outside this four-path plan. Preserve the verified prototype for independent review; a supported scope amendment must authorize an intentional cap update before production admission. No cap compression or unrelated refactor is proposed.

Fixtures qualify actual macOS symlink behavior only. They do not claim race-free writes, transactions, hardlink protection, external-parent-link safety, or Windows symlink qualification. A private custom repository-root alias is exercised; the host `/tmp` alias is observed only.

## Scope amendment 1

Plan amendment: .osc/plans/active/197-capture-output-symlinks-amendment-1.md. Private readable candidate adds11 maintained lines (16,877/41); fixed source cap rejects that growth. Forge reported REVISE with no excluded metric edit. The amendment permits exact16,877 cap/assertion plus rationale in tests/framework-cleanup-metric.test.ts, preserving roots/algorithm/baseline/filecap. Five implementation paths require fresh acceptance/admission. No source fix or public effect is claimed by this metadata amendment.

Private behavioral design v1 remained REVISE under its original cap. Exact amended proposal adds the permitted metric patch; fresh acceptance and production verification remain pending. Retained private evidence: six direct and five CLI failed-first regressions,126 focused candidate tests; four baseline actual CLI redirections and eleven candidate CLI cases. These establish bounded fixture behavior, not whole-platform/security qualification.

## Local production checkpoint

John Lomein is an AI maintainer working within the bounded plan 197 production scope. The exact amended proposal received independent SHIP design acceptance, then its five authorized files were ported on clean source base `05ed07a6ed2ec1d162f9d0c1693d412832ad457c`, branch `codex/john-capture-output-symlinks`. Code and test bytes remain exactly those accepted; this note retains the accepted initial bytes and appends observed facts.

Tests and the permitted metric change were ported first while capture source remained at the bound baseline. The actual source-based focused capture/CLI run returned exit 1 with six direct and five CLI regressions failing, 115 controls passing (126 total). After the exact accepted capture source was ported, the same focused files plus both metric tests returned exit 0: 128/128 passed. The CLI regressions exercise the source CLI through the checked-in tsx loader route, including default/hook-safe final and parent refusal and explicit external final refusal.

The actual maintained-source measurement is 16,877 physical lines across 41 files. Its unchanged roots are `src` and `packages/runtime-omx/src`; the unchanged cleanup baseline is 20,890, file ceiling 41, and POSIX shell cross-check also measures 16,877. Only maintained source path `src/capture.ts` changed, by the intentional eleven lines allowed in amendment 1. No compression or unrelated path was used to meet the cap.

Exact command arguments, UTC timings, exit statuses, raw stdout/stderr and before/after bindings are retained privately. A read-only helper lookup named absent `src/fs.ts` and returned exit 2; that operator-context error was retained, reported, and corrected to the imported `src/path-safety.ts` before production continuation. Earlier failed attempts remain preserved. At this checkpoint, precommit strict/build/full verification and its unchanged committed-head repeat remain next steps.

Observed tests qualify macOS filesystem fixtures only. Actual Windows capture, hardlinks, concurrent replacement races and explicit external parent links remain unqualified. This local work performs no push, PR, merge, issue/plan close, admission or release action. Parent 184 remains active; independent floor, complete publication review, current CI and public-effect readback belong to later gates.

The first precommit strict check returned exit 0 with 9 passes, 0 failures and 18 historical plan-intent warnings on untouched paths. After this factual note update, strict verification will run again before build/full-suite verification and commit. The earlier strict attempt remains retained.

## Delivered capture correction

PR [#302](https://github.com/graphanov/open-scaffold/pull/302) delivered source head `545bfca440013a98f53a6cd626cb759e3eb0e016` on 2026-10-08 at 17:51:14Z. Squash merge `d3babe25932b02da5b8fb3cc843cac60bb2997fb` has parent `c40e07f281638b095e2eba831484076238633af9` and reviewed tree `cbf8f3e2c358a8e701dcc53c89eb2e9872a8bf5b`. Actual PR/main readback matched the complete tree and all eleven public path identities.

The worker passed strict/build/full verification before commit and again on unchanged committed head `545bfca`; its retained full-suite logs prove 1,129 tests across 56 files, with strict 9 passes, 0 failures and 18 historical warnings. Independent Root repeated the same floor on that head (canonical receipt `8ae23739`); numerical counts come from worker logs, not Root raw stdout. Fresh independent SHIP review covered all ten publication entries/eleven identities and seven additional passing controls (review `579a8c5c`, seal `e199217d`). Maintained source is 16,877 physical lines/41 files, with the intentional eleven-line cap increase and unchanged roots, algorithm, 20,890 baseline and file ceiling.

Five required GitHub Actions checks passed on `545bfca`: ci, Validate evidence notes, Structural Open Scaffold PR check, Validate changed plans, and Native Windows Node amend/close smoke. Two optional mirror checks were skipped. The complete review-thread readback had zero unresolved threads and no next page. The Windows job qualifies its amend/close fixtures; it adds no Windows capture or symlink qualification.

The single merge command returned exit 1 with HTTP 502. Independent actual PR/main readback proved the merge had already succeeded, so no repeated merge command was issued. The implementation release record reports released; earlier failed-first regressions, source-cap refusal, socket-path and lookup failures, and checkpoint snapshots remain retained.

This delivery qualifies observed macOS fixtures only. Hardlinks, transactions, concurrent parent replacement, explicit external parent links and actual Windows capture remain unqualified; the host /tmp alias was observed rather than newly exercised. Model identity and per-task usage remain unknown. Parent plan 184 remains active, and this local factual closeout is unpublished and makes no six-day completion claim.

Native source CLI close ran once with exit 0, moved both regular plan records to done, set the original Status to done, automatically retargeted MISSION's amendment reference, and added one close stamp. Amendment bytes and committed requirements are unchanged. Completed records: `.osc/plans/done/197-capture-output-symlinks.md` and `.osc/plans/done/197-capture-output-symlinks-amendment-1.md`. No manual pointer repair was needed.
