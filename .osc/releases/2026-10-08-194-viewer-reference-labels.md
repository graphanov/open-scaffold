# Release / Evidence Note: 194-viewer-reference-labels

## Summary

Corrected the two remaining reader-path referrals to the delivered linked-record viewer. Both now describe three read-only commands showing a synthetic greeting-project mission, done bootstrap plan, and linked evidence note, and link to the viewer's actual heading.

## Traceability

- Task: plan 194, from independent plan 192 delivery audit and actual source inspection.
- Plan: `.osc/plans/done/194-viewer-reference-labels.md`.
- Run packet: N/A — native Codex repository maintenance; no osc runtime adapter dispatch.
- Branch: `codex/john-viewer-reference-labels`; actual delivery is [PR #298](https://github.com/graphanov/open-scaffold/pull/298).

## Verification

- Before correction, `docs/OPEN_SCAFFOLD_SYSTEM.md:13` called the target a "60-second viewer demo"; `docs/examples/downstream-walkthrough.md:372` called it the "60-second reading-path version of the same loop on Open Scaffold itself." The target actually displays a committed synthetic greeting-project snapshot.
- Read back both corrected relative targets: `EXAMPLES.md#linked-record-viewer` from the system document and `../EXAMPLES.md#linked-record-viewer` from the downstream walkthrough resolve to `docs/EXAMPLES.md`, heading `Linked-record viewer`.
- Executed the viewer's three literal `sed` reads. They display the complete `examples/resume-demo/MISSION.md`, `.osc/plans/done/scaffold-init.md`, and `.osc/releases/2026-05-10-scaffold-init.md` files; the note links to that done plan. Its recorded historical results do not certify the current checkout.
- `npm run osc -- resume` selected active plan 194; `./verify.sh --quick --quiet` passed before the edits.
- Existing focused coverage: `npm test -- tests/first-run-docs.test.ts tests/section-parser.test.ts tests/framework-cleanup-metric.test.ts` passed, 3 files / 43 tests. No new tests were added.
- Maintained source is unchanged at 16,865 physical TypeScript lines / 41 files, within the unchanged 16,866 / 41 cap. Root README SHA-256 remains `68067971c2916621fd7df485563b82929ff8c3a0bded508a49268f0ad81a5314`; no tracked SVG asset exists.
- Preparation checks on the working tree passed: `./verify.sh --strict` reported 9 pass / 0 fail / 18 preserved-history warnings; `npm run build` completed both TypeScript builds; `npm test` passed 56 files / 1,042 tests.
- The exact diff preserves all other text in the two reader documents. Unchanged committed-head verification and fresh independent full-publication review still gate publication; this note does not claim those later observations.

## Outcome

The local correction is implemented as a separate follow-up to the delivered primary viewer. The initial local snapshot preceded the observed delivery below. Plan 194 is now done; parent 184 stays active. No adoption or six-day completion is claimed.

## Follow-up

- Commit and freeze the exact three admitted paths after local verification. Rerun the worker floor on the unchanged committed candidate, then obtain fresh independent verification and full-publication review before push/PR; actual current GitHub CI gates delegated merge. Keep the plan active until publication is observed.

## Observed delivery and closeout

PR [#298](https://github.com/graphanov/open-scaffold/pull/298) merged at 2026-10-08T10:24:55Z as `5777306a022b5c3a68f0303e81cf5770a4065a63`, from reviewed candidate `739011f5528364d966f5eee01781f07415568801`. Root independently ran the pinned strict/build/npm-test floor on that unchanged committed head and observed exit 0 for each command. The native receipt records durations and output digests; numeric strict 9/0/18 and 1,042 tests / 56 files totals come from captured worker logs on the same head.

Fresh independent review returned SHIP across eight Git entries / ten no-rename paths. It validated both actual targets, exact preservation of unrelated reader text, three complete sample-file reads, four source traces and 43 focused checks. All four required actual GitHub checks passed, with two optional mirrors skipped. Root refreshed current head, base, scope and review before the delegated squash merge without admin bypass or fabricated human approval.

Default-branch readback confirms full candidate-tree equality, all ten changed-path identities and expected prior main parent. Root README still matches exact pre-announcement bytes and the removed SVG remains absent. Native publication readback is observed and the task lease released. Supported CLI closeout moved plan 194 to done; six-day parent 184 stays active. No package/release, credential, access or protection action occurred. The recorded private inspection failure is retained separately; no roleplay was published.
