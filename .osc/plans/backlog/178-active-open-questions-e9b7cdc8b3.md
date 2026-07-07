# Plan: .osc portfolio gap active-open-questions-e9b7cdc8b3

<!-- osc-portfolio-gap: active-open-questions-e9b7cdc8b3 -->

## Status

backlog

## Context

The `.osc` portfolio steward detected an `active_open_questions` gap against the parent active plan text.

Current source truth is narrower than the parent plan's original open-question list: amendment 1 already adds the minimal-checklist control arm, chooses the Claude-first execution lane, and defers the judge-model choice to preregistration review. This follow-up should reconcile that parent-plan/amendment drift or reject the steward finding as a stale-text false positive, not reopen all original questions as unresolved work.

Source evidence:

- Parent active plan: `.osc/plans/active/163-proof-harness-v2.md`
- Amendment source truth: `.osc/plans/active/163-proof-harness-v2-amendment-1.md`
- Resolved by amendment: minimal-checklist control arm is in; execution lane is Claude-first.
- Deferred by amendment: Codex/OMX lane is not the first proof arm; judge-model choice is a preregistration-review decision before any scored run.
- Narrowed gap: reconcile the parent plan's stale `## Open questions` text with amendment 1, or record that the steward gap is a false positive against current source truth.

GitHub intake: #252

## Goal

Resolve the narrowed parent-plan/amendment drift with a small, source-grounded follow-up that keeps the public roadmap and `.osc` work record coherent.

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
