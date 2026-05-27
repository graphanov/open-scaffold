# Plan: 110-attempt-diff-demo-readme

## Status

backlog

## Context

Open Scaffold needs a visible magic moment before serious promotion. The strategy review converged on a short demo showing multiple AI attempts becoming a durable comparison artifact in the repo. The demo should make the product useful before the viewer learns the full methodology vocabulary.

## Goal

Publish a short README-linked demo asset that shows the attempt-diff workflow from local attempt folders to a PR-ready work-record table.

## Constraints / Out of scope

- Depends on a usable attempt-diff path, either `osc compare` from plan 109 or a documented equivalent from `osc evolve compare`.
- Do not launch HN, Reddit, or broad promotion in this slice.
- Do not create a hosted dashboard or live demo service.
- Keep the asset public-safe, low-copy, and focused on the artifact rather than the maintainer.
- Avoid private chat, orchestration, or workspace references.

## Files to touch

- `README.md` — embed or link the demo asset above the fold.
- `docs/assets/` or `docs/media/` — committed GIF/MP4/cast asset and source notes if small enough.
- `docs/DEMO.md` — reproducible script for regenerating the demo.
- `examples/attempt-compare/` — demo fixture if not already added by plan 109.

## Implementation Architecture Coverage

- Strengthens: adoption, public comprehension, and credibility transfer.
- Audit envelope: committed demo script, media source path, generated asset checksum or size, and README link.
- Evaluation envelope: cold-reader checklist plus local link/media existence checks.
- Feedback routing: taste or visual-quality disagreement becomes an owner gate before final README placement.
- Boundary: no product behavior beyond the demo fixture unless plan 109 is in scope.

## Acceptance criteria

- [ ] README first screen contains a visible demo link or embedded asset showing the work-record payoff.
- [ ] The demo is 30-90 seconds and has a five-beat structure: problem, two or three attempts, compare command, rendered table, PR/evidence use.
- [ ] The demo does not imply automatic model scoring, hidden spawning, or compliance certification.
- [ ] `docs/DEMO.md` documents the exact commands and fixture files needed to regenerate the asset.
- [ ] All README media links resolve locally in the repository.
- [ ] The demo uses current CLI commands and package naming.

## Verification steps

1. Run the documented demo commands from `docs/DEMO.md` in a clean temp directory.
2. Verify the README media paths exist and are tracked.
3. Run a link/path check for changed docs if available, otherwise inspect all changed markdown links manually.
4. Run `npm test -- --run` if the demo fixture touches test-covered examples.
5. Run `./verify.sh --strict`.

## Open questions

- Should the demo be a terminal-only asciinema/GIF, an HTML-rendered clip, or a short narrated video?
- Should the first public demo compare Claude Code/Codex outputs, or use generic attempt folders to avoid runtime endorsement before the second-adapter proof?
