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

Historical preparation approval status: blocked
Historical preparation approval rationale: This is John Lomein's AI-maintainer preparation record under the scoped maintenance delegation. Source implementation requires a separately admitted exact task and writer lease. Failed-first regressions, actual repaired source and rebuilt CLI/API outcomes, unchanged committed-candidate strict verification/build/full tests, fresh independent review, publication review, current CI/protection and delivery readback remain pending. This record is not a close decision or publication authorization.

## Follow-up

Implement only issue #309 under the accepted plan and separate source admission. Observe refusal, exact byte/type/link/inventory preservation, operator repair/rerun and ordinary repeats; measure the final source count. Issues #310–312 retain separate contracts. After this necessary P1 repair, resume bounded discovery in an underrepresented product dimension.

The proposed preflight is static; final-component guarded opens do not establish transactions, race-free access, arbitrary-ancestor traversal defense above the selected root, hardlink safety, mount/junction safety or an OS sandbox. Native Windows symlinks, separately published npm behavior, interactive terminal appearance and fresh-reader comprehension remain unqualified.

## Candidate implementation observations

The preparation and baseline record above is retained unchanged. The local candidate now reuses init's existing lexical `lstat` guard with optional first-run kind checks, prepares every relevant destination before selection, record reads or initialization, and writes records through the existing guarded writer. Init's current calls and immediate-linked-parent refusal remain intact; existing selected root aliases remain usable. Noninteractive preview completes the slug-specific preflight before reporting initializer conflicts, while the interactive target/input route retains its conflict check.

Failed-first verification on unchanged production source retained 25 failures from the initial API/preview and source CLI regression run, then 17 failures from the explicitly executed direct-API refusal matrix. Four fresh source journeys independently executed mission-final and releases-parent redirection through each of the CLI and direct API: all four returned success and changed owned sibling bytes. Their retained journey record SHA-256 is `7c484b2a99e82fe304d2526720a515f90638355b8fa98296bf13794da170becd`. These synthetic failures are separate from the fourteen previously recorded baseline calls above.

An initial repaired-artifact journey found a narrower diagnostic failure: a late custom evidence link in a partial scaffold was refused with identical trees, but the CLI reported the generic `.osc` initialization conflict before naming the leaf. The failing receipt and added failed-first preview/CLI regressions were preserved; the candidate corrects that ordering. A separate alias-control test setup used a four-word goal that plan validation classified as vague; the fixture goal was corrected without changing validation behavior. A command-local tsx IPC startup failure caused by a long temporary socket path was retained as environment evidence, with a successful same-argv retry using the ordinary runtime temporary directory; it is not a product-defect result.

Targeted verification: `npm test -- --run tests/first-run.test.ts tests/blueprint-mega.test.ts tests/first-run-docs.test.ts tests/init.test.ts tests/cli-init.test.ts tests/framework-cleanup-metric.test.ts tests/resume.test.ts` passed 270 tests in seven files. The stdout SHA-256 is `b3804a8a99fb1677c9d06cf80f558c3e1916cdf3f9e84a71e862117c1d643fa7`. Existing interactive/stdin, CI/NO_COLOR, Unicode/space/apostrophe, ordinary empty/brownfield, staged-plan, previous-evidence and edited-repeat checks pass.

Freshly rebuilt local CLI/API journeys recorded 38 static refusals, eight successful ordinary/root-alias/empty/brownfield setups, eight preserving edited-record repeats, and six deliberate fixture link-repair/rerun successes. Every refusal preserved exact repository and owned sibling bytes, entry types, link targets and inventory, including mission/parent/final/dangling/staged/prior-evidence/wrong-type cases and the late evidence destination before starter guidance. The complete retained journey record SHA-256 is `2b44b42d43444200881ff1f284f2ab13a68f4d6578e35c58bb10650f26ddb66b`; it contains source and built-artifact bindings. The actual source CLI regressions are separate from these rebuilt-artifact journeys.

The measured maintained surface is **17,027 physical lines across 41 files**, an intentional +43 readable-line change for plan203 within the 17,104 ceiling. Both metric bindings equal 17,027; counting roots/algorithm, the 20,890 cleanup baseline, file cap and passing POSIX cross-check are preserved. No maintained module was added.

This note records the precommit targeted and journey observations. Final unchanged committed-head `./verify.sh --strict`, `npm run build`, and `npm test` receipts, fresh independent code/outcome review, public CI/protection and delivery readback remain downstream gates. The plan stays active with its exact admitted bytes; no public effect or plan closure is asserted here. The static, platform and artifact limits above remain unchanged.

## Delivered source outcome — 2026-10-09

The preparation and candidate observations above retain their chronology and failed attempts. Their pending and blocked descriptions are historical preparation state, superseded for this delivered source slice by the current close decision below. John Lomein is an AI maintainer; synthetic fixtures and AI reviews establish bounded technical evidence, not human approval or adoption.

[PR #319](https://github.com/graphanov/open-scaffold/pull/319) delivered the static first-run record-boundary repair for [issue #309](https://github.com/graphanov/open-scaffold/issues/309). The reviewed source prepares lexical record destinations before content reads, initialization or writes and retains guarded final-component writes. The failed-first regressions, source and rebuilt CLI/API refusals, exact preservation snapshots, ordinary/alias/Unicode/repeat controls and fixture repair/rerun outcomes recorded above support all seven accepted source-scope criteria. The final documentation correction distinguishes the tested source checkout from separately published npm behavior; the earlier review's documentation ambiguity and its correction remain in the retained review chronology.

### Committed source verification and independent review

The unchanged committed candidate was `6b087f3bc650c2ad9be7771c5ef19619452d8f6e`. An independently recorded native verification receipt binds a serial `./verify.sh --strict`, `npm run build`, and `npm test`, each exit 0, to that head. Receipt SHA-256: `3b783d1132f5d5d4361a16bddbded78c6677312358c68f1227528f2c07366c33`; its command-output SHA-256 values are respectively `53460b77c9268d99297772340935bf100b31780e93bddde51e98c7ab72bc1f79`, `2bd664fd04e2b98df406560951297328f4aed0cfbf6f838e5a0294e4caa40218`, and `6cc1d915ddc8f41f25229621c0c8b82ba203f6c4408f328988819689ffc7f97f`. This receipt retains results, order, durations and output hashes; it does not retain raw output or establish numeric test/warning counts.

Separately captured worker outputs on the same head report 1,273 passing tests in 56 files and 18 historical strict-verification warnings. Those numbers are worker-attributed. Fresh independent full code, outcome and exact publication-scope review returned SHIP with no blocking findings; retained review-seal SHA-256: `8261ff4539913a25ebbdc7eb4724711d254e00290cce4a4e9f4d4877a428d230`. The readable maintained source remains 17,027 physical lines across 41 files, +43 within the 17,104 ceiling, with both metric bindings, counting roots/algorithm, 20,890 cleanup baseline and POSIX cross-check preserved.

### GitHub qualification and actual delivery readback

Before merge, independent GitHub qualification observed the unchanged full candidate head and exhausted review/thread evidence with zero unresolved threads and no actionable findings. The authenticated [completed Codex review](https://github.com/graphanov/open-scaffold/pull/319#issuecomment-6079091865) displays `6b087f3`; the full-head binding uses the unchanged PR head and retained PR/timeline context. A genuine `+1` from that bot was observed on the PR body at 10:31:15Z, after review completion, rather than on its summary comment. Reaction APIs provide no commit SHA, so its head association is a contextual inference backed by that unchanged-head sequence. Retained GitHub qualification seal SHA-256: `5847797c86d6b117ce2656884493005350c5b0b81b158a14b3e11ed43be55f0b`.

All five GitHub Actions producer checks completed successfully for the candidate event head: [ci](https://github.com/graphanov/open-scaffold/actions/runs/37917684430/job/113777758910), [Validate evidence notes](https://github.com/graphanov/open-scaffold/actions/runs/37917684312/job/113777759062), [Structural Open Scaffold PR check](https://github.com/graphanov/open-scaffold/actions/runs/37917684290/job/113777758241), [Validate changed plans](https://github.com/graphanov/open-scaffold/actions/runs/37917684460/job/113777758837), and [Native Windows Node amend/close smoke](https://github.com/graphanov/open-scaffold/actions/runs/37917684430/job/113777759217). The workflows checked the fetched PR merge; check/run metadata bound the candidate event head. The Windows check covers regular-file Node amend/close, not first-run symlink, junction or race qualification. Fresh main-branch protection was inspected and satisfied without bypass: required `ci` from the GitHub Actions producer, enforced administrators and zero required approving reviews. This records policy observations, not human approval.

The head-pinned squash merged at 10:50:05Z as [ef94d0727250d45961e0d404b95987e570f3c2c3](https://github.com/graphanov/open-scaffold/commit/ef94d0727250d45961e0d404b95987e570f3c2c3). Actual readback at 10:51:12Z found exactly one parent, `2cfef48295d3f83542b575cf7fe73b79b0ccb263`, and tree `733c6d6bbdded96c19e1dab311473dc43c934fe9`, equal to the reviewed candidate tree. All 748 tracked blob/mode identities matched; nine file identities changed from the public base. Default `main` and `origin/main` matched `ef94d0727250d45961e0d404b95987e570f3c2c3`, and issue #309 was closed with reason completed. The merge client supplied a head pin; actual parent/tree readback checked the base relationship. No base-pin or race-free merge guarantee is claimed.

### Canonical close decision — current scoped decision

Plan: `.osc/plans/done/203-first-run-write-boundary.md`.

approval.status: approved
approval.approver: maintainer
approval.rationale: All seven accepted criteria for the delivered static first-run source repair are supported by actual failed-first and repaired-source/artifact evidence, exact preservation and recovery outcomes, measured source limits, unchanged committed-head verification, fresh independent code/outcome/publication and GitHub review, successful producer CI/protection observations and actual head-pinned squash/tree/parent/default-main/issue readback. This is John Lomein's strong scoped AI-maintainer close decision under the recorded maintenance delegation; no human approval is inferred. It closes plan203's delivered source scope only.

```yaml
approval:
  status: approved
  approver: maintainer
  rationale: "All seven accepted source-scope criteria are supported by actual source/artifact outcomes, exact committed-head verification, fresh independent review, producer CI/protection observations and the actual PR319 head-pinned squash, tree, single-parent, main and issue309 readback; this is a scoped AI-maintainer decision, with no inferred human approval."
next_action:
  type: close
  target: .osc/plans/done/203-first-run-write-boundary.md
```

The canonical decision fields and local evidence-chain check establish record structure, not authentication. Earlier blocked preparation is retained as historical evidence. No plan amendment is needed: original goal, scope and criterion wording are preserved; checkbox completion and reference-only evidence suffixes record facts.

### Inherited limits and follow-up

Static preflight and guarded final-component opens do not establish transactions, race-free access, arbitrary-ancestor traversal defense above the selected root, hardlink safety, mount/junction safety or an OS sandbox. Native Windows first-run links and separately published npm behavior remain unqualified; [issue #315](https://github.com/graphanov/open-scaffold/issues/315) retains package qualification context. Synthetic fixtures and AI reviews are not human adoption, fresh-reader comprehension or comparative product advantage.

Parent `.osc/plans/active/184-john-six-day-maintainer.md` remains unchanged and active at 3/5 criteria; the six-day interval and whole-product finality are incomplete. Issues #310–312 remain separate contracts. Bounded discovery in an underrepresented product dimension remains due after this necessary P1 repair. This local metadata closeout is for coherent later batching; fresh independent review and the full strict/build/test floor on the future public closeout batch remain separate gates.
