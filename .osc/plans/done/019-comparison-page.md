# Plan: 019-comparison-page

## Status

done

## Context

The 2026-05-14 external review identified "Comparison page for spec-kit / BMAD / Agent OS" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Add an honest comparison page that helps readers choose Open Scaffold or an alternative without overclaiming.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `docs/COMPARISON.md` — new comparison page.
- `README.md` — link to comparison page only if owner approves README touch in the execution slice.

## Acceptance criteria

- [ ] `docs/COMPARISON.md` contains sections for spec-kit, BMAD, Agent OS, and Open Scaffold.
- [ ] Each compared project has at least one "use this when" and one "do not use this when" bullet.
- [ ] The page states at least one Open Scaffold differentiator as `[OWNER DECISION REQUIRED]` if not yet decided.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- What exact differentiator should be treated as owner-approved?
