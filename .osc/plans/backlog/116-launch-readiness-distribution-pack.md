# Plan: 116-launch-readiness-distribution-pack

## Status

backlog

## Context

The strategy review warned that broad promotion before the magic moment exists would waste the project's first public launch opportunity. After positioning, attempt-diff demo, evidence-chain verification, and downstream proof are ready, the project needs a launch checklist that binds star tactics to real adoption surfaces.

## Goal

Prepare a public launch-readiness pack with the checklist, post templates, awesome-list targets, and proof links required before any broad HN/Reddit/social launch.

## Constraints / Out of scope

- Planning and documentation only; do not post to HN, Reddit, X, LinkedIn, or awesome lists in this slice.
- Do not include private outreach lists or private conversations in the repo.
- Do not inflate traction numbers or promise adoption targets as facts.
- Do not launch before README demo, npm/latest, downstream proof, and public docs are aligned.

## Files to touch

- `docs/LAUNCH_CHECKLIST.md` — launch prerequisites, timing, proof links, and rollback criteria.
- `docs/LAUNCH_POSTS.md` — public-safe draft copy for Show HN, Reddit, and short social posts.
- `docs/ADOPTION.md` — optional install/use path tying launch attention to a first successful command.
- `README.md` — one restrained link to adoption/launch proof if appropriate.

## Implementation Architecture Coverage

- Strengthens: adoption readiness, public accuracy, and release discipline.
- Audit envelope: launch gates, required proof links, package version checks, and no-go criteria.
- Evaluation envelope: checklist must be verifiable from public repo/npm/GitHub surfaces.
- Feedback routing: missing prerequisites block launch rather than being hand-waved in posts.
- Boundary: no live posting, no marketing automation, no fake testimonials.

## Acceptance criteria

- [ ] Launch checklist has explicit gates for README hero/demo, fresh `npx open-scaffold@latest`, GitHub Latest Release, downstream proof, and at least one sharp comparison paragraph.
- [ ] Draft posts use the work-record/attempt-diff framing and avoid "agent OS" or compliance-grade claims.
- [ ] Awesome-list target section names relevant lists and the concrete artifact each submission will point to.
- [ ] Checklist includes no-go conditions such as stale npm, broken demo, unresolved PR, or missing downstream proof.
- [ ] All public copy is owner-neutral and does not mention private internal tooling.
- [ ] The docs make clear that actual posting/submission is a separate owner gate.

## Verification steps

1. Run `npx --yes open-scaffold@latest --help` and record whether public package truth is launch-ready.
2. Verify every proof link named in the checklist resolves.
3. Grep changed launch docs for prohibited overclaim terms.
4. Run `./verify.sh --strict`.

## Open questions

- Which launch venue should be first after prerequisites pass: Show HN, GitHub/awesome-list submissions, Reddit, or a founder-authored essay?
- Should launch drafts live in the repo or in a separate public website/content repository?
