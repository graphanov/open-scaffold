# Plan: scaffold-init

## Status

done

## Context

Initial scaffold setup for the demo project before active feature work begins.

## Goal

Bootstrap the project with MISSION.md, the .osc folder structure, and a minimal README so the repo is ready for a first feature plan.

## Constraints / Out of scope

- No feature code yet — structure only.
- No external dependencies.

## Files to touch

- `MISSION.md` — project mission.
- `.osc/plans/` — plan stage folders.
- `.osc/releases/` — releases folder.

## Acceptance criteria

- [x] MISSION.md exists and has a defined mission (no unset marker).
- [x] `.osc/plans/{active,backlog,blocked,done}/` stage folders exist.
- [x] `.osc/releases/` exists and is ready for evidence notes.

## Verification steps

1. `ls MISSION.md .osc/plans/ .osc/releases/` → exits 0.
2. Mission check: `grep -v "mission:unset" MISSION.md` → exits 0.

## Open questions

- None.
