# Plan: 009-runtime-harness-adapter-refresh

## Status

done

## Context

Open Scaffold v1 established the runtime-neutral protocol baseline. This backlog slice is part of the v2 roadmap and should be moved to `active/` only when it becomes the current product slice.

## Goal

Refresh OMC/OMX adapter or binding repos so they consume the core runtime binding contract instead of inventing independent truth.

## Constraints / Out of scope

- Do not add autonomous spawning to Open Scaffold core.
- Do not require Daniel-specific Command Center, Hermes Kanban, Discord, OMC, or OMX setup.
- Keep runtime-specific behavior in bindings/adapters unless explicitly promoted as a core contract.

## Files to touch

- `ROADMAP.md` — keep milestone status in sync.
- `README.md` and relevant `docs/` pages — explain the product capability.
- `src/`, `tests/`, or adapter repos as appropriate for this slice.

## Acceptance criteria

- [ ] Audit `open-scaffold-omc` against current core.
- [ ] Audit `open-scaffold-omx` against current core.
- [ ] Document adapter-owned launch mechanics outside Open Scaffold core.
- [ ] Ensure adapter evidence returns to `.osc` run/release conventions.

## Verification steps

1. Run `./verify.sh --standard`.
2. Run `npm run osc -- verify`.
3. Run `npm test` and `npm run build` if code changed.
4. Confirm no private Command Center machinery leaks into public core.

## Open questions

- Which part should remain markdown-first and which part deserves CLI/schema support?
