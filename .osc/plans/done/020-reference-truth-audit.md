# Plan: 020-reference-truth-audit

## Status

done

## Context

The 2026-05-14 external review identified "Truth-label public references to private/future tools" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Audit public docs for Hermes, Claw/OpenClaw, clawhip, OMC, OMX, and adapter references, then label each as linked, private, future, or removed.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `README.md` — likely first-touch reference cleanup.
- `docs/*.md` — public docs with tool references.
- `docs/decisions/README.md` — design rationale links if stale.

## Acceptance criteria

- [ ] A search for `Hermes|Claw|OpenClaw|clawhip|OMC|OMX` in public docs has no unqualified private/future references.
- [ ] Every remaining private or unavailable tool reference is labeled as private, future, conceptual, or linked to a public repository.
- [ ] No `.osc-dev/` private decision text is copied into public docs.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- Should private Hermes/Claw references be removed from first-touch docs or kept as dogfood examples with labels?
