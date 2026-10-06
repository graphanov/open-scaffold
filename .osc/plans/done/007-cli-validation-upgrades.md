# Plan: 007-cli-validation-upgrades

## Status

done

## Context

Open Scaffold v1 established the runtime-neutral protocol baseline. This backlog slice is part of the v2 roadmap and should be moved to `active/` only when it becomes the current product slice.

## Goal

Add mechanical validation for stale active plans, release/evidence notes, run-summary consistency, and state drift so agents cannot silently lie about project truth.

## Constraints / Out of scope

- Do not add autonomous spawning to Open Scaffold core.
- Do not require Daniel-specific Command Center, Hermes Kanban, Discord, OMC, or OMX setup.
- Keep runtime-specific behavior in bindings/adapters unless explicitly promoted as a core contract.

## Files to touch

- `ROADMAP.md` — keep milestone status in sync.
- `README.md` and relevant `docs/` pages — explain the product capability.
- `src/`, `tests/`, or adapter repos as appropriate for this slice.

## Acceptance criteria

- [ ] Validate slice-close evidence and approval status.
- [ ] Validate `.osc/releases/` notes for issue/plan/run/PR/verification/outcome fields.
- [ ] Detect stale active plans and active plans with completed/merged evidence.
- [ ] Detect cited run IDs with no durable public evidence summary.

## Verification steps

1. Run `./verify.sh --standard`.
2. Run `npm run osc -- verify`.
3. Run `npm test` and `npm run build` if code changed.
4. Confirm no private Command Center machinery leaks into public core.

## Open questions

- Which part should remain markdown-first and which part deserves CLI/schema support?
