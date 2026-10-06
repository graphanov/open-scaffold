# Plan: 028-project-wiki-skeleton

## Status

done

## Context

The project needs a public-safe body-of-work wiki surface for durable project knowledge that is distinct from product docs, plans, release evidence, and private owner context.

## Goal

Create a minimal `docs/wiki/` skeleton that defines Open Scaffold's compiled project knowledge boundary without turning the repo into a task tracker or private knowledge dump.

## Constraints / Out of scope

- Do not copy private Command Center state, raw agent logs, or personal owner context into the public repo.
- Do not rewrite README, ROADMAP, or product docs in this slice.
- Do not commit, push, open a PR, or merge without explicit owner approval.

## Files to touch

- `docs/wiki/SCHEMA.md` — public-safe project wiki rules.
- `docs/wiki/index.md` — initial project wiki catalog.
- `docs/wiki/log.md` — append-only project wiki action log.
- `docs/wiki/_meta/owner-context.md` — owner-neutral bridge note for private/general wiki boundaries.
- `docs/wiki/concepts/body-of-work-wiki.md` — minimal concept page for why this wiki exists.
- `.osc/plans/active/028-project-wiki-skeleton.md` — trace this docs slice to a plan.

## Acceptance criteria

- [ ] `docs/wiki/` has schema, index, log, `_meta/`, `concepts/`, `entities/`, `comparisons/`, and `queries/` directories.
- [ ] Public wiki text uses owner-neutral wording and does not use the owner's personal name.
- [ ] The schema clearly routes live project state to `.osc`/GitHub/evidence rather than `docs/wiki/`.
- [ ] `./verify.sh --strict` passes.

## Verification steps

1. `grep -R "[D]aniel" docs/wiki .osc/plans/active/028-project-wiki-skeleton.md` returns no matches.
2. `test -f docs/wiki/SCHEMA.md && test -f docs/wiki/index.md && test -f docs/wiki/log.md` exits 0.
3. `./verify.sh --strict` exits 0.

## Open questions

- Should `docs/wiki/` remain a public repo surface or eventually move to a separate private project wiki if the knowledge becomes strategy-heavy?
