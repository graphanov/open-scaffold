# Open Scaffold — Rules (Quick Reference)

Re-read this file before any major action on project structure.

## Non-Negotiables

1. **Mission first.** Read `MISSION.md` before doing anything. If `<!-- mission:unset -->` is present, stop and define the mission.
2. **Committed intent is immutable.** Fill generated TODOs before committing. Afterwards, goal, scope, and acceptance-criterion wording change only through amendments. Checkbox completion, the reserved ` | Evidence: <reference-only-list>` suffix on criteria, and valid `## Status` stage values may record facts without rewriting requirements.
3. **Prefer helpers.** Use `npx open-scaffold` CLI helpers first, then supported shell helpers such as `./amend.sh`. Manual fallback is permitted only when neither is available: follow `.osc/plans/README.md`, preserve schemas and changelog linkage, then validate before continuing.
4. **Folder = status.** Plans live in `active/`, `backlog/`, `done/`, or `blocked/`. Move files, don't rename them. See `.osc/plans/WORKFLOW.md`.
5. **Verify before claiming done.** Run `./verify.sh` against acceptance criteria. Use `./close.sh` to move plans to `done/`.
6. **Check active/ first.** Before starting new work, check `.osc/plans/active/`. Continue in-flight work unless told otherwise.
7. **Scope changes go through amendments.** Clarify what changed, run `npx open-scaffold amend <slug>` or the supported shell fallback, fill the new TODOs before committing, and review the diff.
8. **One focus at a time.** Keep `active/` small (2–3 plans max). Finish or park before pulling from `backlog/`.

## File Conventions

- Plan files: `NNN-slug.md` (number is permanent ID, never changes)
- Amendments: `NNN-slug-amendment-N.md` (stays with parent plan in same folder)
- All plans follow the Status + seven content-heading schema in `.osc/plans/handoff-template.md`

## When In Doubt

- Structure questions → re-read this file and `.osc/plans/WORKFLOW.md`
- Phase/tool questions → `docs/WORKFLOW.md`
- Design rationale → `docs/decisions/README.md`
