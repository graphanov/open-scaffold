# Release / Evidence Note: 180-repository-revival

## Summary

Prepared the owner-requested public maintenance update: coherent source/generated instructions, self-contained newcomer setup, task-specific handoff isolation, compatible dependency refresh, and one owned stale-plan reminder. Reconciled historical release preparation and portfolio intake while preserving incomplete/deferred work. Plan 181 records the orchestrator/report-transfer frontier; this note does not authorize merge or publication.

## Traceability

- Roadmap / issue / task: owner maintenance direction on 2026-10-06; contributor issues #281 and #282; portfolio intake #250, #252, #254, #258, #260, #262.
- Plan: `.osc/plans/active/180-repository-revival.md` until the implementation and review checks are complete, then `.osc/plans/done/180-repository-revival.md`.
- Run ID / run packet: N/A; parallel implementation groups share this bounded maintenance plan and return reviewed diffs to one coordinator.
- Branch / PR: branch `codex/revive-open-scaffold`; maintenance PR https://github.com/graphanov/open-scaffold/pull/283.

## Verification

- Preserved owner's untracked content draft — SHA-256 `72ac09f40792a1b03e76f389454ea2951fec24c54f9a6c2f4ea8dcc900ec0c62` before and after source refresh; excluded from commits and package payload.
- Baseline source `38c014b4565549cb677003fc295f063dd845f168` — clean-lock build and 51 files / 631 tests passed before this change.
- Handoff isolation — 13 failure cases reproduced before the fix; 48 resume and 18 MCP tests pass after coherent plan/run/task binding and feedback identity checks.
- Dependency refresh — both TypeScript 7 builds and 50 focused tests pass; npm audit reports zero vulnerabilities; no installed dependency is behind its compatible wanted version. Vitest 5 is deferred because it drops Node 20 support.
- Stale-reminder lifecycle — 12 focused tests pass, including exact bot/marker ownership, quiet unchanged state, resolution, and later reopening.
- Initial integrated `npm run build` and `npm test` — PASS: 55 files / 692 tests on Node 26.6.0 with a clean lockfile install. Additional closure regressions and the final updated corpus checks are recorded below after the GitHub lifecycle finding.
- Packed-package npm-only newcomer lifecycle — PASS: download the packed exact version from an isolated loopback registry, stop that registry, start a fresh process with npm offline, and execute the handoff's actual first suggested command unchanged. Progress, competing tasks, evidence-backed close, and repeated closed-plan setup are covered.
- `./verify.sh --strict` — PASS: 9 pass / 0 fail / 19 warnings. Eighteen historical records have literal/content differences that the old rename-blind checker missed, including older evidence annotations; the other warning is plan 180's explicitly recorded presentation correction. No stale active-plan warning remains. Historical content is preserved rather than rewritten to silence the guard.
- `npm run osc -- verify` and `npm audit --json` — PASS; zero structural failures and zero audit vulnerabilities.
- Independent final review — PASS after fixing all three P2 findings: invocation-aware npm handoff commands, unambiguous reserved evidence annotations, and scaffold-relative index reads for nested Git/linked-worktree staged intent changes.
- Required source growth — 119 physical TypeScript lines across existing files; the deliberate maintained-source cap is 16,866, still below the 20,890 baseline, with 41 maintained files.
- `npm pack --dry-run --json` — PASS: `open-scaffold@0.35.0`, 228 package files, no owner `content/` draft or dogfood plan/release history in the payload. The real package newcomer regression validates the packed CLI rather than a source-checkout alias.
- First GitHub CI result — package CI, structural PR check, and evidence validation passed; changed-plan validation caught active Status text in newly closed preparation records. This was a real close-helper invariant defect, not waived.
- Closure repair — CLI and shell now keep the genuine Status aligned with done while preserving all other text and avoiding duplicate mission stamps on retry. The packed newcomer regression immediately runs strict plan validation after real closure. Fifty-one older done-folder Status mismatches were repaired through the same idempotent core helper; all non-Status sections and mission history were mechanically compared and preserved. The two newly reconciled prep plans are also strict-valid. The entire parent-plan corpus now has zero validation errors, asserted before its pinned hash comparison.
- Final integrated verification after closure repair — PASS: both builds, 56 test files / 710 tests, and strict structural verification with 9 pass / 0 fail / 19 preserved-history warnings. All parent-plan validation errors are zero. The final package regression covers the corrected closure through the actual installed CLI and the supported shell path has its own preservation/collision tests.
- GitHub verification at code commit `355f342` — PASS: package CI, changed-plan validation, evidence validation, and structural PR check. Optional comment mirrors were skipped; no external review comments were posted.
- GitHub cleanup — closed superseded PRs #251/#253/#255/#259/#261/#263/#265/#267/#269/#276 while preserving branches and history. Closed duplicate/false-positive/deferred issues #250/#252/#254/#260/#262/#273/#274/#275/#277/#278/#279. Only PR #283 remains open. Genuine issues #258/#280/#281/#282 remain linked to that PR for merge-time closure. Issue #280 now has the exact owned marker and evergreen title; its original reported mainline facts remain visible until integration.

## Outcome

Implementation is verified and independently reviewed for one maintenance PR. Source changes are not yet merged or published. No John workflow/service, live model run, package publication, tag/release creation, or repository-settings mutation has been performed.

- approval.status: weak_approved
- approval.rationale: Implementation and process checks pass with independent code review; human merge and publication approval remain separate owner gates. The historical-content warnings are acknowledged, not represented as clean immutable history.

Portfolio disposition: #251/#250 and #255/#254 were false-positive intake of non-blocking release-prep notes. #253/#252 is covered by plan 163's amendment and parked benchmark status. #259/#258 is covered by amendments parking duplicate subplans 110/111/115/116 under plan 164's retained distribution scope. #261/#260 and #263/#262 remain explicit dashboard/cockpit parking-lot deferrals, not newly approved work. The six old planning-only draft PRs are superseded by this coherent reconciliation.

Dependency PRs #265, #267, #269, and #276 are covered by the tested newer dependency/action versions and should not be merged as older competing lockfiles. Repeated stale reminder issues #273/#274/#275/#277/#278/#279 duplicate #280; #280 is the marker-owned evergreen record.

## Follow-up

- The verified maintenance PR is published and duplicate/superseded GitHub records are reconciled. The implementation criteria are complete; owner merge and publication review remain the next action.
- Owner reviews the finished maintenance PR before merge. Plan 182 separately records live npm/GitHub publication gates.
- Plan 181 runs the next small orchestrator report-transfer pilot after the maintenance baseline is integrated; qualify a pinned John Lomein workflow before using it as an executor.
- Before relying on ambient usage for pilot cost claims, reproduce and address the earlier static observation that missing Claude usage fields can normalize to zero; this maintenance slice does not claim that separate fidelity issue is fixed.
