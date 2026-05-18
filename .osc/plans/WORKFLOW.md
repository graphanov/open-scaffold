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

1. **New plans land in `active/` for immediate work or `backlog/` for future work.** Use `osc plan new <slug> --stage active|backlog|blocked` when the CLI is available.
2. **Backlog is for future work.** When an agent identifies follow-up tasks or next steps, create a plan in `backlog/`. Do not start work on backlog items without moving them to `active/` first. Use `osc plan move <slug> --to active` for that promotion.
3. **One focus at a time.** Prefer at most 2–3 plans in `active/` simultaneously. If `active/` is full, finish or park existing work before pulling from `backlog/`.
4. **Moving to `done/`** requires:
   - Acceptance criteria met (from the plan file).
   - `./verify.sh` passes at standard tier or above.
   - MISSION.md changelog stamped (via `osc close <slug> --message "<what shipped>"`, `./close.sh <slug>`, or manually).
5. **Moving to `blocked/`**: add a comment at the top of the plan file explaining what it's blocked on and the date. Move with `osc plan move <slug> --to blocked`; move back with `osc plan move <slug> --to active` when unblocked.
6. **Never rename files when moving.** The NNN prefix is the plan's permanent ID. Just `mv` the file between folders.
7. **Read order**: when starting a session, check `active/` first, then `blocked/`, then `backlog/`. Ignore `done/`.
8. **Amendments stay with their parent.** If `003-auth.md` is in `active/`, its amendments (`003-auth-amendment-1.md`, etc.) live in `active/` too. They move together.

## Agent Directive

Before starting any substantive work in this project:

1. Read `MISSION.md`.
2. Check `.osc/plans/active/` — is there work in flight?
3. If yes, continue that work unless explicitly told otherwise.
4. If no, check `backlog/` for the next priority item and move it to `active/`.
5. Re-read `.osc/RULES.md` if you are unsure about conventions.
