# Plans — Amendment Protocol

Plans in this directory and its stage subfolders (`active/`, `backlog/`, `done/`, `blocked/`) are **immutable** once committed. When new information changes a plan's goal, constraints, or acceptance criteria, do NOT edit the plan file in place. Instead, run `osc amend <plan-slug> --message "<what changed>"` (or `npx open-scaffold amend <plan-slug> --message "<what changed>"`) — it handles the common npm/day-two mechanical path so you can focus on the content. To move non-done work between stages, run `osc plan move <plan-slug> --to active|backlog|blocked`. To close a completed plan, run `osc close <plan-slug> --message "<what shipped>"` (or `npx open-scaffold close <plan-slug> --message "<what shipped>"`) — it moves the plan and its amendments to `done/` and stamps MISSION.md's changelog. Shell fallbacks remain supported via `./amend.sh` and `./close.sh`; manual file movement remains the compatibility floor. See `.osc/plans/WORKFLOW.md` for the full stage-folder workflow.

## The helpers (recommended path)

```bash
osc plan new <plan-slug> --stage active|backlog|blocked
osc plan move <plan-slug> --to active|backlog|blocked
osc amend <plan-slug> [--message "<text>"]
osc close <plan-slug> [--message "<text>"]
```

The CLI helpers:

1. Create new plan skeletons in `active/`, `backlog/`, or `blocked/` with the standard 7-section schema.
2. Move non-done plans plus their amendment files between `active/`, `backlog/`, and `blocked/`, while aligning the parent plan's `## Status` body with the destination folder.
3. Autonumber the next amendment file as `<plan-slug>-amendment-<n>.md` in the same stage subfolder as the parent plan.
4. Scaffold the amendment file with the 5-section schema below (Parent / Date / Learning / New direction / Impact on acceptance criteria), filling Parent and Date automatically and leaving `TODO:` placeholders for the three content sections.
5. Append a one-line dated entry to `MISSION.md`'s `## Changelog` section referencing the new amendment filename.
6. Move a verified plan plus its amendments to `done/` and stamp `MISSION.md` when `osc close` is used.

You then fill in TODO sections, review the diff, and commit. Amendment and close helpers refuse to run if the parent plan is missing or the mission is still unset.

## Amendment schema

- `## Parent` — the original plan slug
- `## Date` — YYYY-MM-DD
- `## Learning` — what changed and why (the "I got smarter" moment)
- `## New direction` — the revised goal or criteria, stated verbatim
- `## Impact on acceptance criteria` — which AC numbers change, how

## Read order rule

Agents and humans read `<slug>.md` first, then `<slug>-amendment-1.md`, `<slug>-amendment-2.md`, ... in numeric order. Later amendments supersede earlier ones where they conflict. Plans and their amendments live together in the same stage subfolder — look in `active/`, `backlog/`, `done/`, or `blocked/` as appropriate.

## Shell fallback

If you need repo-local bash behavior, the original scripts remain supported:

```bash
./amend.sh <plan-slug> [--stage] [--backlog] [--message "<text>"]
./close.sh <plan-slug> [--stage] [--message "<text>"]
```

Use the CLI helpers for the normal npm/day-two path and the shell scripts as the compatibility floor.

## Manual fallback

If you can't run bash or the CLI for any reason, the manual flow still works: create `<plan-slug>-amendment-<n>.md` by hand in the appropriate stage subfolder using the schema above, then add a one-line entry to `MISSION.md`'s `## Changelog` section containing the amendment's basename. `verify.sh` Checks 3 and 4 enforce sequential numbering and changelog coverage either way.

Amendments are for legitimate scope evolution, not silent drift. They exist so that "I learned something new" propagates cleanly into the plan artifacts instead of living only in someone's head.

## Plan status

Plan status is determined first by which stage subfolder the plan lives in — **the folder IS the status**. Current plan files also carry a `## Status` section for human readability; keep it aligned with the folder when moving uncommitted or in-flight plans. Use `osc plan move <plan-slug> --to active|backlog|blocked` for non-done movement. Use `osc close <plan-slug>` or `./close.sh <plan-slug>` to move a verified plan to `done/` when all acceptance criteria are met. See `.osc/plans/WORKFLOW.md` for movement rules between stages.

## The specs/ directory

The `.osc/specs/` directory holds specification artifacts produced during the Clarify phase (e.g., deep-interview outputs, research notes, domain models). Specs are reference material for plan authors — they inform plans but are not plans themselves. Keep specs lightweight; if a spec grows into actionable work, promote it to a plan file.
