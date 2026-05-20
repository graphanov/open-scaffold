# Amendment 1: 057-automated-evidence-collection

## Parent

057-automated-evidence-collection

## Date

2026-05-20

## Learning

The backlog plan still describes evidence notes as living in `.osc/evidence/`, but the shipped `osc evidence new <slug>` command creates release/evidence notes under `.osc/releases/YYYY-MM-DD-<slug>.md`. The collector should extend the current public CLI contract instead of introducing a second evidence-note directory.

## New direction

`osc evidence collect <slug>` appends timestamped collected blocks to the existing `.osc/releases/YYYY-MM-DD-<slug>.md` note created by `osc evidence new <slug>`, or reports that the skeleton is missing and tells the user to run `osc evidence new <slug>` first. It still gathers local verification and git context by default, and only checks PR/CI through `gh` when explicitly requested with `--ci`.

## Impact on acceptance criteria

Acceptance and verification references to `.osc/evidence/<slug>.md` are interpreted as the current `.osc/releases/<date>-<slug>.md` release/evidence-note path. No new `.osc/evidence/` directory is added in this slice.
