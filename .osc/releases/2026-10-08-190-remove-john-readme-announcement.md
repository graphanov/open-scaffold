# Release / Evidence Note: 190-remove-john-readme-announcement

## Summary

The owner requested reversal of the John front-page banner and explanation. This slice restores the previous README and removes the unused asset; implementation and publication are pending.

## Traceability

- Task: 190, direct owner reversal request.
- Plan: `.osc/plans/done/190-remove-john-readme-announcement.md`.
- Branch: `codex/revert-john-readme`. No PR exists yet; source verification and independent review precede publication.
- Prior announcement: PR 285, merge `ffc229a2b06f9d5ca36fcd1bbd135901c4315fb6`.

## Verification

- Supported resume and quick verification passed before preparation.
- Exact prior README comparison, committed-head checks and independent review are pending.

## Outcome

Prepared, not yet shipped. Other maintenance, historical records and owner drafts are preserved.

## Follow-up

- Verify the exact reversal, publish, merge under the explicit owner request and read back GitHub's default branch.

## Observed delivery

PR [#294](https://github.com/graphanov/open-scaffold/pull/294) merged at 2026-10-08T05:41:59Z as `fe885031c33c8ee9736dbeb52952e483152930f2`. Independent review approved candidate `0f52d9bdf85601ba9a89d2f283a2261dd6868ac6`; unchanged-head strict/build/all 800 tests and the four required GitHub checks passed before the owner-authorized merge. No repository protection was bypassed.

Default-branch Git and GitHub contents API readbacks confirm the README's exact 7,468 pre-announcement bytes (SHA-256 `68067971c2916621fd7df485563b82929ff8c3a0bded508a49268f0ad81a5314`), absence of the SVG and preservation of all other functional maintenance. The candidate tree and expected merge parent match. The effect was observed and the writer lease explicitly released; independent passive audit corroborated delivery.

The original presentation request was superseded by the owner's direct removal request. The saved continuation now prevents re-adding the banner or announcement without a new explicit owner request. No replacement is proposed. Supported closeout moves plan 190 to done; six-day maintenance continues with the restored front page.
