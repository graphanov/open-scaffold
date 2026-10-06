# Plan: 024-roadmap-scope-discipline

## Status

done

## Context

The 2026-05-14 external review identified "Roadmap scope discipline draft" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Prepare owner-reviewed roadmap changes that defer compliance-grade OS/hashgraph exploration from the public near-term roadmap.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `ROADMAP.md` — target of a future owner-approved patch, not modified by this draft.
- `.osc/research/2026-05-14-roadmap-amendment-draft.md` — proposed diff text.
- `docs/FUTURE_IDEAS.md` or `.osc-dev/research/` — optional parking lot if owner wants preservation.

## Acceptance criteria

- [ ] Roadmap draft marks compliance-grade agentic OS/hashgraph exploration as deferred, not silently deleted.
- [ ] Roadmap draft includes a concise rationale referencing external-review-ingest.
- [ ] Roadmap draft caps publicly visible planned milestones to no more than five ahead.
- [ ] `./verify.sh --standard` exits 0 before any future roadmap edit is proposed for merge.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- Hard-delete the exploration from public roadmap, or preserve as private `.osc-dev` research / future ideas?
