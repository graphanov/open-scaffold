# Plans — Amendment Protocol

Fill generated TODOs before committing. Plans in this directory and its stage subfolders (`active/`, `backlog/`, `done/`, `blocked/`) preserve **immutable committed intent**. Changed goals, constraints, or acceptance-criterion wording require `osc amend <plan-slug> --message "<what changed>"` (or `npx open-scaffold amend <plan-slug> --message "<what changed>"`). Factual checkbox completion and the reserved ` | Evidence: <reference-only-list>` suffix on criteria may record results without changing the requirement. Valid `## Status` stage values may track lifecycle movement; other plan content stays immutable.

Prefer CLI helpers for record structure. Use supported shell helpers when the CLI is unavailable. Manual fallback is permitted only when neither is available; preserve the documented schemas and changelog linkage, then validate. To move non-done work between stages, run `osc plan move <plan-slug> --to active|backlog|blocked`. To close completed work, run `osc close <plan-slug> --message "<what shipped>"` (or `npx open-scaffold close <plan-slug> --message "<what shipped>"`); it moves the plan and amendments to `done/` and stamps MISSION.md's changelog. Shell fallbacks are `./amend.sh` and `./close.sh` when present. The minimum tier omits the shell amendment helper; the CLI amendment command works in every tier. See `.osc/plans/WORKFLOW.md` for stage rules.

`npx` does not install a global `osc` binary. Keep using `npx open-scaffold`, or run `npm install -g open-scaffold` before using bare `osc`.

For completion annotations, append the literal separator outside inline code: `- [x] Requirement unchanged. | Evidence: .osc/releases/proof.md, tests/example.test.ts`. The whole suffix must contain references only, separated by commas; put explanatory prose in the evidence note. An ordinary `Evidence:` phrase remains part of the immutable requirement.

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

Only when neither CLI nor a supported shell helper is available, follow the manual protocol explicitly:

1. For a new plan, copy `.osc/plans/handoff-template.md` into the appropriate stage folder and fill every required section before committing.
2. For an amendment, create `<plan-slug>-amendment-<n>.md` beside the parent using sequential numbering and the schema above, then append a dated `MISSION.md` changelog entry containing its basename. Do not rewrite parent intent.
3. For evidence, use the schema in `.osc/releases/README.md` and real results. Close only after verification: move the parent and amendments together to `done/` and append a dated mission changelog entry.
4. Validate with `npx open-scaffold plan validate <plan-slug> --strict` and `./verify.sh --strict` when execution is available. Without execution, review the same schema, numbering, and linkage directly and record that mechanical verification remains pending.

`verify.sh` Checks 3 and 4 enforce sequential numbering and changelog coverage either way.

Amendments are for legitimate scope evolution, not silent drift. They exist so that "I learned something new" propagates cleanly into the plan artifacts instead of living only in someone's head.

## Plan status

Plan status is determined first by which stage subfolder the plan lives in — **the folder IS the status**. Current plan files also carry a `## Status` section for human readability; keep it aligned with the folder when moving uncommitted or in-flight plans. Use `osc plan move <plan-slug> --to active|backlog|blocked` for non-done movement. Use `osc close <plan-slug>` or `./close.sh <plan-slug>` to move a verified plan to `done/` when all acceptance criteria are met. See `.osc/plans/WORKFLOW.md` for movement rules between stages.

## The specs/ directory

The `.osc/specs/` directory holds specification artifacts produced during the Clarify phase (e.g., deep-interview outputs, research notes, domain models). Specs are reference material for plan authors — they inform plans but are not plans themselves. Keep specs lightweight; if a spec grows into actionable work, promote it to a plan file.
