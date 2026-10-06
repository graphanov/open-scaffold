# Plan: 021-identity-rename-audit

## Status

done

## Context

The 2026-05-14 external review identified "Resolve public identity drift" as a high-impact improvement. This draft is a review-ingest artifact only; move to `active/` only after the owner accepts the slice.

## Goal

Eliminate stale `jeanclaudevibedan` public references or mark intentional redirects so the canonical owner path is clear.

## Constraints / Out of scope

- Do not edit `MISSION.md` in this slice.
- Do not edit committed plans in `.osc/plans/done/`.
- Do not change the product strategy beyond the owner-approved scope for this slice.
- Keep private Daniel Command Center context out of public product docs.

## Files to touch

- `README.md` — badges/links if stale.
- `docs/FAQ.md` — stale owner links if present.
- `docs/ROACH_PI_INSPIRATION.md` — stale owner links if present.
- `docs/decisions/README.md` — current stale adapter links.

## Acceptance criteria

- [ ] `grep -R "jeanclaudevibedan" README.md docs AGENTS.md CLAUDE.md package.json .github` returns no stale public owner URLs, or only explicit redirect notes.
- [ ] Canonical Open Scaffold repository references use `graphanov/open-scaffold`.
- [ ] OMC/OMX adapter references either use canonical URLs or are labeled as historical/unmigrated.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Re-run the command(s) named in the acceptance criteria; expected each mechanical threshold is met.
4. Confirm `git status --short` contains no edits to `MISSION.md`, `.osc/plans/active/`, or `.osc/plans/done/` unless separately owner-approved.

## Open questions

- Are adapter repos being renamed under `graphanov`, or should docs retain old URLs as historical until the migration happens?
