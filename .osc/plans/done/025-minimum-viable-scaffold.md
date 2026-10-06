# Plan: 025-minimum-viable-scaffold

## Status

done

## Context

The 2026-05-14 external review identified "Minimum viable scaffold definition" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Define which Open Scaffold files/concepts are core for first use and which are optional/deep-cut.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `docs/MINIMUM_VIABLE_SCAFFOLD.md` — new core vs optional guide.
- `README.md` — optional link to the guide.
- `docs/WORKFLOW.md` — optional alignment if owner approves.

## Acceptance criteria

- [ ] A core/optional table lists every root-level scaffold artifact and every `.osc/` required directory.
- [ ] The guide identifies a smallest viable adoption path with no more than five required steps.
- [ ] Optional protocols are explicitly labeled optional, advanced, or adapter-specific.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- Should the minimum viable path optimize for solo devs, small teams, or orchestrator-led teams?
