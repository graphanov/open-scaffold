# Plan: 080-readme-resume-screencast-dark-theme

## Status

done

## Context

The README resume-loop GIF from plan 079 shipped and was squash-merged. After seeing it in place, the owner asked to replace the light boxes-only version with a dark-theme version while preserving the same low-copy box-only style.

## Goal

Replace the README resume-loop media with a dark premium graphite variant of the approved boxes-only GIF.

## Constraints / Out of scope

- Preserve the same story, timing, and boxes-only structure from plan 079.
- Do not add external headline, topbar, arrows, final thesis card, telemetry claims, runtime-spawning claims, or conversion-rate claims.
- Do not change README copy unless required for the asset replacement.
- Do not change CLI behavior, package version, npm publishing, GitHub Release state, runtime boundaries, or product strategy.
- Keep the media under `.github/assets/` so the README renders on GitHub while npm package payload stays clean.

## Files to touch

- `.github/assets/readme-resume-screencast.gif` — replace with dark theme GIF.
- `.github/assets/readme-resume-screencast.mp4` — replace with dark theme review render.
- `.osc/releases/2026-05-20-080-readme-resume-screencast-dark-theme.md` — evidence note.
- `.osc/plans/active/080-readme-resume-screencast-dark-theme.md` — this plan; move to `done/` after verification.

## Execution strategy

### Parallel groups

- Media generation remains in ignored `/tmp` HyperFrames workspace.
- Repo integration is limited to asset replacement plus plan/evidence traceability.

### Dependencies

- Depends on plan 079 / PR 68 being merged to `main`.
- No package, release, or runtime dependency is introduced.

1. Verify PR 68 is merged and local `main` is synchronized.
2. Generate the dark-theme variant in `/tmp/open-scaffold-readme-dark-boxes-gif`.
3. Run HyperFrames and visual QA checks.
4. Replace the committed README media files with the dark variant.
5. Record evidence, close the plan, verify, and open a follow-up PR.

## Implementation Architecture Coverage

- Strengthens: README first-touch polish, visual fit for Graphanov/Open Scaffold premium graphite style.
- Audit envelope: plan 080, media checks, evidence note, eventual PR.
- Evaluation envelope: dark media must remain readable at README scale and preserve the same repo-truth recovery story.
- Feedback routing: direct owner style correction after plan 079 merge.
- Boundary: asset swap only; no runtime, package, release, telemetry, or strategy changes.

## Acceptance criteria

- [x] PR 68 is verified merged and local `main` is fast-forwarded.
- [x] Dark-theme GIF/MP4 exist and preserve the boxes-only story.
- [x] HyperFrames lint/validate/inspect pass with no blocking issues.
- [x] Dense visual QA confirms readability, no overlaps, no neon/cyber drift, and no external copy.
- [x] README media files are replaced without changing README copy or npm package payload intent.
- [x] Evidence records media generation, sizes, checksums, package payload behavior, and verification.
- [x] `npm run build`, `npm test -- --run`, `npm pack --dry-run --json`, `./verify.sh --strict`, and `git diff --check` pass before PR.

## Verification steps

1. Run HyperFrames lint/validate/inspect in the dark media workspace.
2. Check final GIF/MP4 duration, size, and SHA-256.
3. Confirm visual QA from contact sheets: boxes-only, readable, no collisions, premium dark graphite not neon/cyber.
4. Run `npm pack --dry-run --json`; pass if `.github/` media remains excluded from npm package payload.
5. Run `npm run build`, `npm test -- --run`, `./verify.sh --strict`, and `git diff --check`; pass clean before opening PR.

## Open questions

- None. Owner requested dark-theme replacement directly.
