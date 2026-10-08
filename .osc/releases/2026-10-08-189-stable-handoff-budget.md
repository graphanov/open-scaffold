# Release / Evidence Note: 189-stable-handoff-budget

## Summary

The stable source handoff CLI drops its dedicated navigation and boundary prose at the supported 600-character minimum. This new slice will preserve useful compact structure and existing JSON/default compatibility. Implementation has not started.

## Traceability

- Roadmap / task: plan 189, following independently verified plan 181 delivery; https://github.com/graphanov/open-scaffold/issues/293 (open).
- Plan: `.osc/plans/active/189-stable-handoff-budget.md`.
- Run packet: N/A — design preparation, before native source-writer admission.
- Branch: `codex/john-stable-handoff-budget-v2`. No PR exists for this slice; design and independent review precede implementation/publication.

## Verification

- Root independently called the library and source CLI against committed `examples/resume-demo`: default text 1115 characters has Next actions and Boundary; maxChars 600 emits exactly 600 characters and omits those sections. The checklist still contains the next bounded action, and JSON next_commands is unchanged.
- Reproduction source `src/resume.ts` SHA-256: `f40c6848266603e2d200dd5f0b56555c6a73b02aeeff0f7813a8ac63a26fa613`. The fourteen-path PR 292 publication did not change this file.
- Existing 600-character tests check length/title; no stable required-section validation was claimed. A new failed-first regression is pending.
- Published npm executable was not run. New implementation and committed-head checks are pending.

## Outcome

Prepared from a real source discovery and separate Root reproduction; no source repair or public effect exists for task 189. Prior plan 181 and its failed attempts remain recorded. The owner delegated routine development; no release, credential, protection or personal-memory action is authorized here.

## Follow-up

- Fresh Forge design and independent Overwatch critique must resolve a readable budget-rendering approach within the unmodified source cap before exact task admission.
- Preserve both the failed source behavior and compatibility evidence; independently verify the unchanged committed candidate and current GitHub CI before public effects.

## Design gate

Fresh design critique returned REVISE before source implementation: specify a compact run-state cap and worst-case 600-character frame, retain an ordered six-key public-run allowlist, and distinguish the three-path writer scope from the full publication diff. The earlier design and review remain private evidence. The source branch was recreated from main after PR 294 and copied only prior unpublished lifecycle preparation; the owner-requested README restoration remains exact. A revised design and fresh critique precede writer admission.
