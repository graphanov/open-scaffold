# Plan: 023-worked-downstream-example

## Status

done

## Context

The 2026-05-14 external review identified "Worked non-framework example" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Create one small, public-safe worked example that demonstrates Open Scaffold on non-framework work.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `docs/EXAMPLES.md` — example index/walkthrough.
- `examples/` or external repo link — worked example artifacts.
- `.osc/plans/backlog/014-downstream-example-project.md` — reference existing roadmap context, not edit.

## Acceptance criteria

- [ ] The example is not Open Scaffold improving Open Scaffold.
- [ ] The example includes mission, plan, run/evidence or verification, and close/summary artifacts.
- [ ] The example can be followed from a clean checkout without private Daniel Command Center dependencies.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- Should this start as an in-repo fixture, docs-only walkthrough, or separate public repo?
