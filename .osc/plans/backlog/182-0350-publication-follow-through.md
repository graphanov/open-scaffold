# Plan: 182-0350-publication-follow-through

## Status

backlog

## Context

Release-prep PR #248 was merged on 2026-07-02 and source metadata is 0.35.0, but live npm and the latest GitHub Release remain 0.34.0. Plan 180 adds maintenance hardening to the prepared source. Closing historical release-prep plans must not imply that this candidate was published.

## Goal

After explicit owner approval, publish the reviewed 0.35.0 candidate and record clean-install and GitHub Release evidence from the exact approved commit.

## Constraints / Out of scope

- Do not publish, dispatch trusted publishing, create tags/releases, or move latest without the owner's explicit approval for the reviewed candidate.
- The maintenance PR and its checks are prerequisites; a source version number is not publication proof.
- Keep the Node support contract and document deferred major migrations.
- Do not introduce orchestrator execution or restart John services as part of package publication.

## Files to touch

- `docs/CHANGELOG.md`, `docs/STABILITY.md`, and public entry docs — update live-release references only after publication is observed.
- `.osc/releases/` — record approved source SHA, trusted-publish run, npm dist-tags, clean-install smoke, and GitHub Release.
- `MISSION.md` — helper-generated close entry after verified publication.

## Acceptance criteria

- [ ] Owner approval names the exact candidate commit and publication/release scope.
- [ ] All required checks are green for that candidate, including the newcomer package lifecycle smoke.
- [ ] npm serves 0.35.0 and latest points to it; a clean install can initialize and resume the first work record.
- [ ] A GitHub Release names the matching tag/commit and links the maintenance and preparation evidence.
- [ ] Documentation distinguishes actual published state from later source preparation.

## Verification steps

1. Review the exact candidate's CI and recorded owner approval before any dispatch.
2. Observe the trusted publishing result and query npm version/dist-tags; record outputs without exposing credentials.
3. Run a fresh npm-only first-run and handoff smoke using the live exact version.
4. Verify the GitHub Release tag, commit, and latest state; close only after both distribution surfaces agree.

## Open questions

- BLOCKING: Owner approval for package publication and GitHub Release after the finished maintenance PR is reviewed and merged.
