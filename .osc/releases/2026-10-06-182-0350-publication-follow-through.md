# Release / Evidence Note: 182-0350-publication-follow-through

## Summary

Published the owner-approved 0.35.0 candidate through trusted GitHub publishing and created the matching GitHub Release. The merged/published source tree exactly matches the reviewed PR head. The live registry package passed fresh-cache installation, session handoff, competing-task isolation, offline generated-command execution, and evidence-backed closure.

## Traceability

- Roadmap / issue / task: owner approval on 2026-10-06 for PR #283 and 0.35.0 publication; original release-preparation issue #246.
- Plan: `.osc/plans/done/182-0350-publication-follow-through.md` after observed publication and live verification.
- Run ID / run packet: GitHub trusted-publish run https://github.com/graphanov/open-scaffold/actions/runs/37537279815.
- Branch / PR: maintenance https://github.com/graphanov/open-scaffold/pull/283; publication-proof branch `codex/0350-publication-proof`.
- Approved candidate: `ee9ba2674fbad1ea8a7f5e09e77e913897399aef`; merged/publishing source: `678d6cf36b6876889b43adbbc50af34fe142fa7a`.

## Verification

- `gh pr view 283` — PASS: merged 2026-10-06T21:54:37Z after all four required checks passed.
- Git tree comparison — PASS: approved and merged commits both have tree `bdfdf753126b27959612c1ceacb74f06dfedf9de`.
- Source package version — PASS: 0.35.0; pre-publication npm latest and GitHub Release remain 0.34.0.
- `gh workflow run publish-npm.yml --ref main -f expected-version=0.35.0 -f npm-tag=latest` — dispatched under the owner's explicit approval.
- Publish run head — PASS: exact merged commit `678d6cf36b6876889b43adbbc50af34fe142fa7a`, not a later documentation commit.
- Trusted publish workflow — PASS: run #37537279815 completed successfully, both builds and all 710 tests passed, and strict verification reported 9 pass / 0 fail / 18 historical-content warnings on the merged source history. npm published `open-scaffold@0.35.0` with signed provenance at 2026-10-06T21:57:23Z. Early registry queries returned 404 during propagation; no duplicate publication was attempted.
- Fresh-cache `npm view` — PASS: exact version 0.35.0 exists and `latest` points to 0.35.0; tarball https://registry.npmjs.org/open-scaffold/-/open-scaffold-0.35.0.tgz.
- Registry artifact — SHA-1 `a863f68a60276baf2f84768ed22392ccbf8809b0`; SHA-512 `sha512-H5md569porkcBL5fhNP3VvICiPgm2fIzAtOUTwUqfp4GHQnoc5MuZ526W4xTCP/+rMO6we7Y+p2Es7amjY7HgA==`; 420,973 bytes. Downloaded tarball and installed npm lock integrity agree.
- Source identity — PASS: registry `gitHead` is `678d6cf36b6876889b43adbbc50af34fe142fa7a`; all 157 published tracked source files byte-match that commit. The 71 generated payload files are functionally exercised rather than claimed byte-identical to tracked source.
- SLSA provenance — advertised at https://registry.npmjs.org/-/npm/v1/attestations/open-scaffold@0.35.0; publishing logs link the signed transparency receipt https://search.sigstore.dev/?logIndex=3117440187. This note records publication/provenance presence, not a separate cryptographic verification claim.
- Live npm newcomer smoke — PASS on Node 26.6.0, fresh isolated npm cache, real registry installation and later offline commands. First-run, preserved progress, a competing active task, actual exact-version npx validation command, trace, close-to-done Status, strict validation/evidence chain, and repeated closed-plan setup all pass without global osc, source CLI, personal configs, or credentials.
- Live wrong-task reproduction — PASS: newer task B may be blocked, waiting on a human gate, or completed; selected task A retains its own run, state, and next instructions, and B retains its own applicable gate/repair state.
- GitHub Release — PASS: https://github.com/graphanov/open-scaffold/releases/tag/v0.35.0, published 2026-10-06T22:02:06Z and marked Latest. Its tag points to the exact publishing commit `678d6cf36b6876889b43adbbc50af34fe142fa7a`.
- Current documentation and release-record closeout — prepared as the normal approved publication follow-through; code, package manifests, and release tag remain unchanged.

## Outcome

Maintenance is merged, all linked issues are closed, npm latest is 0.35.0, and GitHub Release v0.35.0 points to the approved publishing source. Owner approval covers this publication and its normal release/evidence follow-through. No John service or live model execution was started by this publication slice.

- approval.status: approved
- approval.rationale: The owner explicitly approved merging PR #283 and then publishing the tested 0.35.0 candidate; the approved candidate's file tree is preserved in the publishing commit.

## Follow-up

- Land the documentation/evidence closeout while keeping code/manifests/tag fixed; the package and release are already live and verified.
- Plan 181 remains the next orchestrator-report experiment; this release does not start that pilot or claim hundred-agent scalability.
