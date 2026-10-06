# Plan: 010-product-packaging-release

## Status

done

## Context

Open Scaffold v1 established the runtime-neutral protocol baseline. This backlog slice is part of the v2 roadmap and should be moved to `active/` only when it becomes the current product slice.

## Goal

Improve Open Scaffold public packaging with a sharper landing narrative, diagrams, version tags, and release notes.

## Constraints / Out of scope

- Do not add autonomous spawning to Open Scaffold core.
- Do not require Daniel-specific Command Center, Hermes Kanban, Discord, OMC, or OMX setup.
- Keep runtime-specific behavior in bindings/adapters unless explicitly promoted as a core contract.

## Files to touch

- `ROADMAP.md` — keep milestone status in sync.
- `README.md` and relevant `docs/` pages — explain the product capability.
- `src/`, `tests/`, or adapter repos as appropriate for this slice.

## Acceptance criteria

- [ ] Publish `v0.3.0` baseline release.
- [ ] Add “why this exists” diagram.
- [ ] Sharpen README landing story.
- [ ] Evaluate npm/template packaging readiness.

## Verification steps

1. Run `./verify.sh --standard`.
2. Run `npm run osc -- verify`.
3. Run `npm test` and `npm run build` if code changed.
4. Confirm no private Command Center machinery leaks into public core.

## Open questions

- Which part should remain markdown-first and which part deserves CLI/schema support?
