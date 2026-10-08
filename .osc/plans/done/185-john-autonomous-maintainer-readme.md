# Plan: 185-john-autonomous-maintainer-readme

## Status

done

## Context

The owner requested a prominent GitHub README addition explaining that John Lomein has autonomous management of Open Scaffold during 8–14 October 2026. The native Codex continuation and separate observing auditor are now configured; this is the first visible task under the six-day delegation.

## Goal

GitHub's default-branch README prominently and accurately explains John's time-limited autonomous maintenance role with a polished banner and links to actual work.

## Constraints / Out of scope

- State observed activation and delegated routine development scope, not proven reliability, external adoption or perpetual control.
- Explain that John is an AI maintainer personality with planning, implementation and review roles using Codex; distinguish synthetic roleplay from actual repository work.
- Keep the product introduction and installation path readable; add accessible image alt text and bounded static SVG artwork without external assets or scripts.
- No package version bump, npm/release publication, repository protection change or private operational paths in public README content.
- Update corpus golden hashes only when new plan/evidence records alter their deterministic inputs; independently prove previous validation outcomes unchanged.

## Files to touch

- `README.md` — prominent dated autonomous maintainer announcement.
- `docs/assets/john-lomein-on-duty.svg` — static accessible visual banner.
- `tests/section-parser.test.ts` — deterministic live-corpus golden changes if required by new observed plan/evidence records.

## Acceptance criteria

- [x] A polished readable banner and concise announcement near the README top identify John, dates 8–14 October 2026, autonomous routine maintenance and Codex runtime. | Evidence: .osc/releases/2026-10-08-185-john-autonomous-maintainer-readme.md
- [x] Public text links to real issues/pull requests, clearly identifies AI authorship, and makes no unsupported reliability/adoption/completion claim. | Evidence: .osc/releases/2026-10-08-185-john-autonomous-maintainer-readme.md
- [x] Banner is static self-contained SVG with accessible title/description and Markdown alt text; no private paths, script or external resources. | Evidence: .osc/releases/2026-10-08-185-john-autonomous-maintainer-readme.md
- [x] Current committed HEAD passes strict verification, both builds and full tests, and receives fresh independent review before publication. | Evidence: .osc/releases/2026-10-08-185-john-autonomous-maintainer-readme.md
- [x] A real PR, successful current-head CI and merged default-branch readback prove the addition is live. | Evidence: .osc/releases/2026-10-08-185-john-autonomous-maintainer-readme.md

## Verification steps

1. Inspect README rendered layout, banner source, public links and dated claims.
2. Run `./verify.sh --strict`, `npm run build`, `npm test` on the committed candidate and inspect independent current-head review.
3. Read back GitHub PR/head/check state before delegated merge and verify default-branch README/banner afterward.

## Open questions

- At six-day expiry the banner must change to an archived run notice with results, not continue claiming active control.
