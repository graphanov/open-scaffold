# Amendment 1: 069-v1-launch

## Parent

069-v1-launch

## Date

2026-05-25

## Learning

The automated runner may prepare and verify a v1.0.0 release-candidate PR, but it must not perform the external owner-gated side effects that make v1.0.0 live: merging, `npm publish`, creating or moving the GitHub Release marked Latest, deployment, or launch-channel announcements. Those gates remain explicit owner actions.

## New direction

Prepare the repository-side v1.0.0 launch candidate: package metadata, stability documentation, curated changelog, landing page, README positioning, roadmap traceability, paired agent views, and release evidence. The PR must make the external gates obvious and must not claim that v1.0.0 is published until the owner completes npm publication and GitHub Release work.

## Impact on acceptance criteria

- Criteria 1, 2, 3, and 17 become owner-gated post-merge checks instead of automation-complete checks. The PR must include commands and evidence for dry-run/package readiness, but live registry and GitHub Release verification happen after owner-approved merge and publication.
- Criteria 4 through 16 remain in scope for this PR and must pass locally before the branch is reported ready.
- Verification step 2 changes from a live `npx open-scaffold@1.0.0` install to a local tarball smoke until the owner publishes the package.
