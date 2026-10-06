# Plan Workflow — Folder State Machine

Plans move between stage folders. The folder IS the status. File numbering (NNN-slug.md) is permanent and never changes.

## Folders

| Folder      | Meaning                                      |
|-------------|----------------------------------------------|
| `backlog/`  | Identified work, not yet committed to.       |
| `active/`   | Currently being worked on.                   |
| `done/`     | Completed and verified.                      |
| `blocked/`  | Parked — waiting on external input or dependency. |

## Rules

1. **New plans land in `active/` for immediate work or `backlog/` for future work.** Prefer `npx open-scaffold plan new <slug> --stage active|backlog|blocked`. Fill generated TODOs before committing. Use supported shell helpers next; manual fallback is permitted only when neither is available, following `.osc/plans/README.md` and validating the schema and linkage.
2. **Backlog is for future work.** When an agent identifies follow-up tasks or next steps, create a plan in `backlog/`. Do not start work on backlog items without moving them to `active/` first. Use `osc plan move <slug> --to active` for that promotion.
3. **One focus at a time.** Prefer at most 2–3 plans in `active/` simultaneously. If `active/` is full, finish or park existing work before pulling from `backlog/`.
4. **Moving to `done/`** requires:
   - Acceptance criteria met (from the plan file).
   - `./verify.sh` passes at standard tier or above.
   - MISSION.md changelog stamped (prefer `osc close <slug> --message "<what shipped>"`, then `./close.sh <slug>` when available; manual fallback only when neither is available).
5. **Moving to `blocked/`**: record the blocker and date in an evidence/progress note without rewriting committed plan intent. Move with `osc plan move <slug> --to blocked`; move back with `osc plan move <slug> --to active` when unblocked.
6. **Never rename files when moving.** The NNN prefix is the plan's permanent ID. Prefer lifecycle helpers; manual movement under the fallback policy moves the parent and all amendments together and aligns its `## Status` stage value.
7. **Read order**: when starting a session, check `active/` first, then `blocked/`, then `backlog/`. Ignore `done/`.
8. **Amendments stay with their parent.** If `003-auth.md` is in `active/`, its amendments (`003-auth-amendment-1.md`, etc.) live in `active/` too. They move together.
9. **Committed intent stays immutable.** Valid `## Status` stage values, factual checkbox completion, and the reserved ` | Evidence: <reference-only-list>` suffix on acceptance criteria may record progress. Never change the committed requirement wording, goal, or scope; use an amendment.

## Agent Directive

Before starting any substantive work in this project:

1. Read `MISSION.md`.
2. Check `.osc/plans/active/` — is there work in flight?
3. If yes, continue that work unless explicitly told otherwise.
4. If no, check `backlog/` for the next priority item and move it to `active/`.
5. Re-read `.osc/RULES.md` if you are unsure about conventions.
