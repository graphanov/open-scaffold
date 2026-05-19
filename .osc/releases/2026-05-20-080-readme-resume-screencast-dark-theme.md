# Release / Evidence Note: 080-readme-resume-screencast-dark-theme

## Summary

This follow-up slice replaces the merged README resume-loop GIF with a dark-theme version. It keeps the approved boxes-only story from plan 079 while moving the visual treatment to premium graphite: dark cards, restrained proof green, muted warning red, internal labels only, and calm fades/lifts.

## Traceability

- Roadmap / issue / task: owner style correction after PR 68 merge.
- Prior PR: `https://github.com/graphanov/open-scaffold/pull/68`.
- Plan: `.osc/plans/done/080-readme-resume-screencast-dark-theme.md`.
- Branch / PR: branch `docs/readme-resume-screencast-dark`; PR pending owner review.
- README media: `.github/assets/readme-resume-screencast.gif`.
- Review render: `.github/assets/readme-resume-screencast.mp4`.

## Media generation

- HyperFrames workspace: `/tmp/open-scaffold-readme-dark-boxes-gif`.
- Final GIF: `/tmp/open-scaffold-readme-dark-boxes-gif/open-scaffold-readme-dark-boxes-v1.gif`.
- Final MP4: `/tmp/open-scaffold-readme-dark-boxes-gif/open-scaffold-readme-dark-boxes-v1.mp4`.
- Contact sheets:
  - `/tmp/open-scaffold-readme-dark-boxes-gif/dark-boxes-v1-contact-13frames.png`.
  - `/tmp/open-scaffold-readme-dark-boxes-gif/dark-boxes-v1-contact-large.png`.
- Style boundary: dark premium graphite only; no external headline, subheading, topbar, final copy card, arrows, private screenshots, runtime-spawning claims, telemetry claims, or conversion-rate claims.

## Verification

- `npx --yes hyperframes@0.4.45 lint --strict` — pass; 0 errors / 0 warnings.
- `npx --yes hyperframes@0.4.45 validate` — pass; no console errors, 41 text elements passed WCAG AA.
- `npx --yes hyperframes@0.4.45 inspect --samples 90` — pass; 0 layout issues across 90 samples.
- Dense contact-sheet visual QA — pass; dark premium graphite style, readable at README scale, no overlaps/collisions, no external copy, no neon/cyber drift.
- `ffprobe` final MP4 duration — pass; `14.000000` seconds.
- `ffprobe` final GIF duration — pass; `14.000000` seconds.
- `wc -c .github/assets/readme-resume-screencast.gif` — `943289` bytes.
- `wc -c .github/assets/readme-resume-screencast.mp4` — `706896` bytes.
- `shasum -a 256 .github/assets/readme-resume-screencast.gif` — `e0bae38e429d39553cfc8922dedcfc0c7899b7a2808691ba6275aabfa8cb9d09`.
- `shasum -a 256 .github/assets/readme-resume-screencast.mp4` — `568f4dc2a28915b235f254aa3a051cc8deb919611875820cd1bb40122ca8e390`.
- `npm run build` — pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `npm test -- --run` — pass; 25 files / 218 tests.
- `git diff --check` — pass.
- `npm pack --dry-run --json` — pass; produced `open-scaffold-0.4.6.tgz`, 95 files, unpacked size 603,485 bytes, with no `.github/` media files included.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.

## Outcome

The README media is now the dark-theme boxes-only variant while preserving the same public-safe repo-truth recovery narrative. README copy, CLI behavior, package version, runtime boundaries, npm publishing, and GitHub Release state are unchanged.

## Follow-up

- Owner review/merge gate for the PR.
- No npm publish or GitHub Release is required for this docs/assets-only slice.
