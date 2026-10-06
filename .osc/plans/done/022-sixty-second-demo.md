# Plan: 022-sixty-second-demo

## Status

done

## Context

The 2026-05-14 external review identified "Add 60-second demo artifact" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Add a short demo path that shows what a user gets without reading the full methodology.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `README.md` — link/embed the demo.
- `docs/QUICKSTART.md` or `docs/EXAMPLES.md` — demo script or screenshot strip.
- `assets/` or docs image path — optional screenshot/asciinema asset.

## Acceptance criteria

- [ ] A demo artifact exists and is linked from README.
- [ ] A fresh reader can see mission file, plan file, verification command, and resulting status/evidence within the demo.
- [ ] The demo path can be completed in under 60 seconds when followed as a viewer, measured by script length or recording duration.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- Should the first demo be asciinema, screenshots, or a text-only scripted transcript?
