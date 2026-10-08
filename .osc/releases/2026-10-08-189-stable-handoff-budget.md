# Release / Evidence Note: 189-stable-handoff-budget

## Summary

The stable source handoff compiler now retains dedicated navigation and its complete read-only boundary when the legacy packet exceeds the supported character budget. It keeps whole executable commands in their original order, or points to intact JSON detail when they cannot fit. Already-fitting full, brief and no-ambient packets remain byte-compatible.

## Traceability

- Roadmap / task: plan 189, following verified plan 181 delivery; [issue #293](https://github.com/graphanov/open-scaffold/issues/293) records the real source finding.
- Plan: `.osc/plans/active/189-stable-handoff-budget.md`.
- Run packet: N/A — a native Codex worker performed bounded source development under the existing delegation; no osc run package or runtime adapter was used to dispatch this work.
- Branch: `codex/john-stable-handoff-budget-v2`; writer base `fb8da91321779557de22ebe5f8a85c502c9195e4`. No PR, merge or package publication exists for this slice at this evidence snapshot.

## Verification

- Before source edits, a meaningful 600/601-character fixture regression failed on the dedicated Next actions section, complete first command, honest detail cue and full boundary. The accepted-base local source CLI also emitted 600 characters with no dedicated Next actions, generated command or boundary. The next bounded action still appeared in the checklist. Both failed tests and the actual base packets were retained.
- Candidate local source CLI output for the same byte-preserved resume-demo fixture is 567 characters at budget 600, with the complete action, all three whole commands, the detail cue and full boundary. Only the installed local source CLI/loader was invoked; the published npm executable was not run.
- Frozen accepted-base captures were replayed from private byte-preserved fixture copies. Fixture bytes, ambient mtimes, packet hashes and JSON encodings stayed intact. Fitting default/exact packets remain 1115 characters; fitting full/brief/no-ambient modes remain 1772/1236/706 characters at their exact and adjacent budgets. The default packet SHA-256 remains `c42bf65df6b1fb289bd9e6f106074c8651cc3a4a1187f3fefa7bb4260fd196e7`.
- Entire accepted-base JSON summaries match across budgets, including bound gated, completed-with-gate, failed, legacy, null and arbitrary-state cases. The public run projection remains the same ordered allowlist: `run_id`, `command`, `state`, `pending_gates`, `pending_gate_ids`, `updated_at`; nullable values remain intact and synthetic extra status metadata is absent. Original run state and gate precedence are unchanged.
- Private instrumentation of an exact candidate source copy measured the assembled worst-case essential frame at 575 characters at budgets 600 and 601: complete 160-character sanitized identity, 24-character display state, ten-digit count widths, requested-unavailable ambient warning, action placeholder, detail cue and exact 130-character boundary plus final newline. This is synthetic layout evidence, not a real run with billions of criteria or gates. No product export or large array was added.
- Targeted resume/maintained-source tests pass: 92 tests. Controls cover bulky actions, all reviewed invocation prefixes, bootstrap/undefined mission/no-plan/backlog, current run binding, gate precedence, ordinary and hostile state display, ambient/redaction boundaries, whole-command exact/adjacent fitting, and stopping before a later verify/close command when the evidence prerequisite cannot fit. The supported 600..20000 range is unchanged.
- The initial readable implementation passed resume tests but failed the unchanged source cap at 16878 lines. Approved local typed-action and rendering boilerplate factoring recovered that excess; final measured source is 16865 lines / 41 files, with `src/resume.ts` at 636 lines. No cap change or public-run projection recovery was used. The failed cap check is retained.
- Precommit candidate verification passed: `./verify.sh --strict` (9 pass, 0 fail, 18 historical-intent warnings), `npm run build`, and `npm test` (839 tests / 56 files). Exact committed-head rechecks follow this snapshot; independent full publication review and GitHub CI remain required before public effects.

## Outcome

Local implementation and compatibility checks are observed. Only `src/resume.ts`, `tests/resume.test.ts` and this evidence note changed after writer admission. JSON/schema/API, dependencies, routing, range, core authority and the source-size cap are unchanged. Root README still matches the exact pre-announcement SHA-256 `68067971c2916621fd7df485563b82929ff8c3a0bded508a49268f0ad81a5314`; `docs/assets/john-lomein-on-duty.svg` remains absent.

This records local source work, not public delivery or completion of the six-day parent. Plan 189 and parent 184 remain active. No human approval, merge, release, credential or protection action is claimed.

## Follow-up

- Freeze the source after committing these three paths and rerun strict/build/full tests on that unchanged candidate.
- Independently review the full publication diff from current target, including inherited 181/190 closure and 189 preparation metadata. The pinned three-path writer scope is narrower than that publication diff.
- Require exact-head GitHub CI and authorized effect readback before publication/merge and supported closeout.

## Design gate

Initial design critique returned REVISE before source implementation: specify a concrete compact state cap and worst-case frame, retain the ordered six-key public-run allowlist, and distinguish writer scope from publication scope. Revised design and fresh independent design critique returned SHIP before writer admission; this accepted a bounded design, not a tested candidate or human approval. The earlier design/review and rejected implementation measurements remain retained evidence.
