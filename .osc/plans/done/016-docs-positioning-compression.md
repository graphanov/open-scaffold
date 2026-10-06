# Plan: docs-positioning-compression

## Status

done

## Context

The independent review found Open Scaffold's concept strong but the first-read path too heavy and overlapping. It also identified consulting/compliance as a strong under-surfaced use case.

## Goal

Reduce first-read cognitive load while making the roadmap, examples, adapter boundary, and consulting/compliance value obvious to public users.

## Constraints / Out of scope

- Do not delete protocol detail without preserving canonical references or redirects.
- Do not overclaim working adapters or bots that do not exist yet.
- Do not leak private Command Center context into public diagrams or examples.

## Files to touch

- `README.md` — shorten or restructure first-read path.
- `ROADMAP.md` — keep review-driven priorities visible.
- `docs/OPEN_SCAFFOLD_SYSTEM.md`, `docs/TASK_RUN_MODEL.md`, `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/RUNTIME_HARNESS_DISPATCH.md`, `docs/SLICE_CLOSE_PROTOCOL.md` — reduce overlap and improve navigation.
- `docs/` — add one clear architecture/identity-chain diagram if needed.
- `docs/FAQ.md` — clarify usefulness/overkill and consulting/compliance positioning.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Map repeated concepts and private-context leaks across docs | None | A |
| T2 | Design the new first-read path and diagram | T1 | B |
| T3 | Patch README/docs with minimal wording changes | T2 | C |
| T4 | Verify links, claims, and roadmap consistency | T3 | D |

### Parallel groups

- T1 can be a read-only audit; T3 should be one coherent editing pass.

### Dependencies

- Do not patch docs until T1 identifies exact overlap and risk points.

### Delegation notes

- Treat this as product writing and information architecture, not just cleanup.

## Acceptance criteria

- [ ] A fresh reader can understand what Open Scaffold is in under ten minutes.
- [ ] Public docs clearly say core is scaffold/protocol, not runtime/bot/spawner.
- [ ] Review-driven roadmap priorities are visible from README or ROADMAP.
- [ ] Consulting/compliance/audit use cases are named without overclaiming.
- [ ] Private/Daniel-specific references are removed or explicitly framed as dogfood evidence.

## Verification steps

1. Run link/search checks for private-context terms; expected no unframed leaks.
2. Run `./verify.sh --strict`; expected pass.
3. Run `git diff --check`; expected clean.

## Open questions

- Should the first-read path become a new `docs/START_HERE.md`, or should README carry the whole adoption path?
