# Plan: 079-readme-resume-screencast

## Status

done

## Context

External adoption feedback says the README still explains Open Scaffold like a research note instead of showing the recovery loop. The existing text demo and downstream walkthrough prove the idea, but first-time readers need one visual: an agent loses context, a fresh session reads repo truth, and work resumes from `.osc/` files.

## Goal

Replace the README's text-only demo entry with an embedded, public-safe short GIF that makes the session-resume value obvious before deeper docs.

## Constraints / Out of scope

- Do not change product strategy, runtime boundaries, package version, npm publishing, or GitHub Release state.
- Do not use private Hermes, Discord, Command Center, employer, credential, or local-user screenshots.
- Do not claim measured conversion uplift in public docs unless separately sourced.
- Stop for owner taste approval before finalizing the GIF style, README embed, PR body, or Codex loop.
- Keep the README concise; this replaces the text-only demo, not the product ontology.

## Files to touch

- `README.md` — show-first demo section after taste approval.
- `.github/assets/readme-resume-screencast.gif` — approved optimized README media, stored outside npm package `files` payload.
- `.github/assets/readme-resume-screencast.mp4` — source-quality render for review/archival, also outside npm package `files` payload.
- `.osc/releases/2026-05-20-079-readme-resume-screencast.md` — evidence note after approval/integration.
- `.osc/plans/active/079-readme-resume-screencast.md` — active plan; move to `done/` only after final verification.
- `tmp/readme-resume-screencast/` — ignored HyperFrames drafts for taste-gate media.

## Execution strategy

### Parallel groups

- Media generation and taste-gate exploration ran in ignored HyperFrames workspaces before committing the approved artifact.
- Final README integration, evidence, and plan closure stay in one docs/assets PR.

### Dependencies

- Owner taste approval is required before final media integration.
- No runtime, package-release, npm-publish, or GitHub Release dependency is introduced by this slice.

1. Storyboard the public-safe session-loss -> repo-read -> resume narrative from existing docs.
2. Produce a first CRT/pixel HyperFrames MP4/GIF draft in ignored workspace.
3. Stop for owner taste gate before committing final media/README copy.
4. After approval, integrate media, evidence, closure, verification, PR, and review loop.

## Implementation Architecture Coverage

- Strengthens: adoption trust, recovery/ownership, README first-touch clarity.
- Audit envelope: plan 079, Kanban card, media verification outputs, evidence note, eventual PR.
- Evaluation envelope: media must show session loss and repo-truth resume without private context.
- Feedback routing: taste rejection creates a new media draft, not a strategy rewrite.
- Boundary: no runtime spawning, package release, telemetry claims, certification, or private operator surface.

## Acceptance criteria

- [x] A first MP4/GIF draft exists and is shared with the owner for a taste gate before final README integration.
- [x] The approved final README media shows context/session loss, fresh session, `.osc/plans/active/` or equivalent repo-truth inspection, and resumable next action.
- [x] The README embeds or links the approved media and replaces the text-only demo with concise show-first copy.
- [x] The committed media is public-safe, readable at README scale, and stays outside the npm package payload unless a package-files decision is explicitly made.
- [x] Release/evidence records media generation, verification, owner taste decision, and follow-up boundaries.
- [x] `npm run build`, `npm test`, `./verify.sh --strict`, `git diff --check`, and media duration/size checks pass before PR.

## Verification steps

1. Run HyperFrames lint/validate/inspect; pass on zero blocking layout/contrast issues.
2. Run `ffprobe` against the final MP4 and check optimized GIF size; pass if duration is short enough for README scanning and media is reviewable in GitHub.
3. Extract preview frames at intro, context-loss, repo-read, resume, and final thesis; pass if text is readable and the story is clear.
4. Run `npm pack --dry-run --json`; pass if committed media/package payload behavior is intentional.
5. Run `npm run build`, `npm test`, `./verify.sh --strict`, and `git diff --check`; pass clean before opening PR.

## Open questions

- Taste gate resolved: owner approved the boxes-only premium GIF rather than the earlier CRT/pixel or fuller premium copy variants.
- README format resolved: direct GIF embed in README, with the MP4 committed as a review/archive render in `.github/assets/`.
