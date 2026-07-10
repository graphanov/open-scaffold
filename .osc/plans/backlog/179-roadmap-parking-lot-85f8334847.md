# Plan: .osc portfolio gap roadmap-parking-lot-85f8334847

<!-- john-lomein-osc-gap: roadmap-parking-lot-85f8334847 -->

## Status

backlog

## Context

john-lomein's `.osc` portfolio steward detected a `roadmap_parking_lot_unplanned` gap.

A ROADMAP parking-lot item has no obvious active/backlog plan representation.

Source evidence:

- ROADMAP.md parking lot item:
- Visual dashboard beyond Discord posts.

GitHub intake: #262

## Goal

Resolve the detected roadmap/backlog/active-plan gap with a small, source-grounded follow-up that keeps the public roadmap and `.osc` work record coherent.

## Constraints / Out of scope

- Do not merge, publish, release, dispatch workflows, change repository settings, or touch secrets from this plan alone.
- Keep public wording owner-neutral and avoid local/private machine context.
- Do not overclaim proof, compliance, or runtime authority.
- If the gap is a false positive, close this plan with evidence rather than forcing implementation.

## Files to touch

- `ROADMAP.md` or relevant docs only if the gap requires wording/priority clarification.
- `.osc/plans/active/*` or `.osc/plans/backlog/*` only through normal plan/amendment flow.
- Source/test files only if a later accepted issue narrows implementation scope.

## Acceptance criteria

- [ ] The gap is confirmed against current `ROADMAP.md` and `.osc/plans` source truth.
- [ ] The chosen outcome is one of: create/update a real follow-up plan, mark the older backlog entry superseded/done with evidence, amend the active plan, or reject the steward finding as a false positive.
- [ ] Any public issue/PR comments use compact Status / Evidence / Next wording.
- [ ] Verification commands appropriate to touched files pass before closeout.

## Verification steps

1. Re-run the portfolio steward dry-run and confirm this gap no longer appears, or document why it remains intentionally open.
2. Run the repository's configured verification for any touched code/docs.
3. Run `git diff --check`.

## Open questions

- Should this gap become implementation work, roadmap clarification, backlog cleanup, or a rejected false-positive record?
- If implementation is needed, which existing active/backlog plan should own it?
