# Release / Evidence Note: 192-viewer-record-chain

## Summary

The viewer now reads the existing synthetic resume-demo mission, done scaffold-init plan and its linked evidence note explicitly. This replaces selectors that can open a directory guide or an amendment and keeps recorded results separate from current-checkout certification.

## Traceability

- Task: plan 192, from read-only repository discovery and independent local corroboration.
- Plan: `.osc/plans/active/192-viewer-record-chain.md`.
- Run packet: N/A — native Codex repository maintenance under the six-day delegation; no osc runtime adapter dispatch.
- Branch: `codex/john-viewer-demo-docs-v2`; no PR for this slice yet.

## Verification

- Maintainer retained 52 original selector/handoff/trace invocations across explicit C, en_US.UTF-8 and da_DK.UTF-8 locales, plus seven existing fixed-chain checks. Original commands selected the releases README in actual source and scratch inputs; the two-plan scratch input selected an amendment. No CLI or fixture mutation occurred.
- Root independently reproduced both selectors on actual source and the same labeled two-plan fixture under LC_ALL=C: directory README selected in both, amendment selected in the scratch input. Source HEAD was f3cf4ddb, whose tree equals the subsequently observed diagnostic-repair delivery. This is local source-selection proof, not published npm execution or human timing.
- The fixed example consists of examples/resume-demo/MISSION.md, its done scaffold-init plan and dated scaffold-init evidence note. The trace reports that exact note and a missing run. The sample's checked folder criterion does not certify current empty-directory contents; documentation must describe a recorded synthetic example honestly.
- Failed-first regression at base `956daa12ea0397573a5d65e5a677f58f1edcf4e4`, before the viewer edit: `npm test -- tests/first-run-docs.test.ts` returned 1 with one failed / eight passed. The advertised mission read executed successfully but returned the repository mission rather than the sample's mission. The failure is retained.
- `npm test -- tests/first-run-docs.test.ts tests/section-parser.test.ts tests/framework-cleanup-metric.test.ts` — passed, 43 tests in three files. The viewer regression executes the three documented safe file reads and uses the existing trace library to bind exactly the displayed done plan and evidence note, preserving missing-run state.
- Maintained source remains 16,865 physical TypeScript lines / 41 files under the unchanged 16,866 / 41 cap. README SHA-256 remains `68067971c2916621fd7df485563b82929ff8c3a0bded508a49268f0ad81a5314`; the removed SVG remains absent. The shipped fixture and CLI/core are unchanged.
- The evidence creation helper refused to overwrite this existing preparation note; no file was written by that failed command. This note was then updated within the admitted scope.
- Working-implementation floor: `./verify.sh --strict` passed with 9 pass / 0 fail / 18 retained historical-intent warnings; `npm run build` passed both TypeScript builds; `npm test` passed 1,042 tests in 56 files. These are local worker results; committed-head verification and independent review are separate checks.

## Outcome

Local documentation and executable regression are implemented. The viewer labels the record synthetic and historical, explains the absent empty stage folders, and links active-work guidance using an explicit same-slug handoff and trace. Missing evidence stays visible. No delivery or approval is claimed; parent 184 stays active.

## Follow-up

- Commit the exact three admitted paths, freeze the head and verify that unchanged committed candidate; retain those results separately so verification does not change the tested head.
- Before branch or PR publication, require worker/Root local strict/build/full verification of the unchanged committed head plus fresh independent review of the full public diff. Before delegated merge, require fresh actual GitHub CI and refresh the current head, base, scope and review bindings. Plan closure requires observed delivery.
