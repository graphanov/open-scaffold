# Plan: 190-remove-john-readme-announcement

## Status

active

## Context

The owner directly requested removal of the John Lomein banner and explanation from the GitHub front page. This supersedes the earlier README announcement request. Other repository maintenance is preserved.

## Goal

Restore the pre-announcement README and remove its unused John banner asset on the GitHub default branch.

## Constraints / Out of scope

- Remove the six-line announcement added by PR 285 and its SVG asset only. Preserve all other README content and functional maintenance.
- Do not revert the full PR 285 commit, parser characterization, plans or historical evidence.
- Preserve existing owner drafts and historical branches. No release, credential, access, protection or destructive history action.

## Files to touch

- `README.md` — restore exact pre-announcement bytes.
- `docs/assets/john-lomein-on-duty.svg` — delete the unused banner.

## Acceptance criteria

- [ ] README bytes equal the parent of announcement merge ffc229a2b06f9d5ca36fcd1bbd135901c4315fb6, and the banner asset is absent.
- [ ] Only the two scoped presentation paths change after admission; other maintenance remains intact.
- [ ] Independent diff review, unchanged committed-head strict/build/tests, current GitHub CI and default-branch readback precede completion.

## Verification steps

1. Compare README with the pre-announcement Git blob and inspect the exact two-file diff.
2. Run ./verify.sh --strict, npm run build, npm test on unchanged committed HEAD.
3. Independently inspect the complete PR scope, respect protection, merge the owner-authorized reversal and read back default-branch content.

## Open questions

- None. The owner explicitly requested reversal, with no replacement announcement.
