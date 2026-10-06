# Plan: 018-readme-compression

## Status

done

## Context

The 2026-05-14 external review identified "README compression to ≤6 KB" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Compress the README first-touch path to no more than 6 KiB while preserving links to deeper protocol docs.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `README.md` — compress first-touch content and link to deeper docs.
- `docs/FAQ.md` or existing docs — receive displaced deep content if needed.

## Acceptance criteria

- [ ] `wc -c README.md` prints a value less than or equal to `6144`.
- [ ] README includes a one-sentence statement of what Open Scaffold is.
- [ ] README links to deeper docs for workflow/protocol details instead of deleting them silently.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- Which owner-approved differentiator sentence should the compressed README use?
