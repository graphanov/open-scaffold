# Release / Evidence Note: 079-readme-resume-screencast

## Summary

This slice replaces the README's text-only demo section with a short, public-safe visual artifact showing the Open Scaffold recovery loop: an old session approaches context loss, the repository keeps the work, a new session reads `.osc/plans/active/`, and work resumes from repo truth.

## Traceability

- Roadmap / issue / task: adoption-surface feedback; Kanban task `t_491144ce`.
- Plan: `.osc/plans/done/079-readme-resume-screencast.md`.
- Branch / PR: branch `docs/readme-resume-screencast`; PR pending owner review.
- README media: `.github/assets/readme-resume-screencast.gif`.
- Review render: `.github/assets/readme-resume-screencast.mp4`.

## Media generation and owner taste gate

- HyperFrames workspace: `/tmp/open-scaffold-readme-boxes-gif`.
- Approved artifact: boxes-only premium v1.
- Owner decision: approved in Discord after reviewing the 14-second GIF.
- Style boundary: no external headline, subheading, topbar, final copy card, arrows, private screenshots, runtime-spawning claims, telemetry claims, or conversion-rate claims.
- Asset packaging decision: committed under `.github/assets/` so the README can render the GIF on GitHub while keeping the binary media outside the npm package `files` payload.

## Verification

- `npx --yes hyperframes@0.4.45 lint --strict` — pass; 0 errors / 0 warnings.
- `npx --yes hyperframes@0.4.45 validate` — pass; no console errors, 41 text elements passed WCAG AA.
- `npx --yes hyperframes@0.4.45 inspect --samples 90` — pass; 0 layout issues across 90 samples.
- Dense contact-sheet visual QA — pass; no text overlap/collisions; boxes-only requirement met.
- `ffprobe` final MP4 duration — pass; `14.000000` seconds.
- `ffprobe` final GIF duration — pass; `14.000000` seconds.
- `wc -c .github/assets/readme-resume-screencast.gif` — `869459` bytes.
- `wc -c .github/assets/readme-resume-screencast.mp4` — `610158` bytes.
- `shasum -a 256 .github/assets/readme-resume-screencast.gif` — `80d88898e0a82a4f0545645d2d26b8247d2a18300b1e90c35872c7c7fc5b3cee`.
- `shasum -a 256 .github/assets/readme-resume-screencast.mp4` — `4940503a401dd2772ffd29251315628d8733aba62a0da264ba0360697e6b44fd`.
- `npm run build` — pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `npm test -- --run` — pass; 25 files / 218 tests.
- `git diff --check` — pass.
- `npm pack --dry-run --json` — pass; produced `open-scaffold-0.4.6.tgz`, 95 files, unpacked size 603,485 bytes, with no `.github/` media files included.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.

## Outcome

The README now leads with a show-first demo: the GIF appears before deeper docs and the supporting copy points readers to `docs/EXAMPLES.md` and the downstream walkthrough for the underlying file-level loop.

The media stays public-safe and scoped to the README adoption surface. This slice does not change CLI behavior, package version, runtime boundaries, npm publishing, or GitHub Release state.

## Follow-up

- Owner review/merge gate for the PR.
- No npm publish or GitHub Release is required for this docs/assets-only slice.
