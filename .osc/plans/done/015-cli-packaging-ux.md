# Plan: cli-packaging-ux

## Status

done

## Context

The independent review found the core CLI useful but the adoption path too shell-script-heavy. A productized Open Scaffold needs `osc` commands and packaging that make the first ten minutes obvious.

## Goal

Move the day-one workflow toward `npx open-scaffold init` and first-class `osc` subcommands for init, plan creation, amendments, close, evidence, and verification.

## Constraints / Out of scope

- Do not remove working shell scripts until CLI replacements are proven and wrappers exist.
- Do not publish to npm without Daniel/maintainer approval.
- Do not add runtime spawning to core.

## Files to touch

- `src/cli.ts` — add new command surfaces.
- `src/` helpers — implement shared logic for init/plan/amend/close/evidence if needed.
- `tests/` — TDD coverage for new CLI behavior.
- `README.md`, `LLM_QUICKSTART.md`, `docs/WORKFLOW.md` — update first-run guidance.
- `package.json` / release docs — packaging readiness.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Define the minimal CLI command matrix and backwards-compat wrapper policy | None | A |
| T2 | Implement one command at a time with failing tests first | T1 | B |
| T3 | Update docs after commands exist | T2 | C |
| T4 | Validate install/build/test/package flow | T2, T3 | D |

### Parallel groups

- Commands should be implemented serially using TDD to avoid a large unreviewable CLI rewrite.

### Dependencies

- Docs must not advertise commands until tests prove they work.

### Delegation notes

- This is an implementation-heavy slice; prefer a dedicated branch and PR.

## Acceptance criteria

- [ ] The CLI covers the highest-friction day-one workflow without breaking existing scripts.
- [ ] New behavior has tests that failed before implementation.
- [ ] Docs clearly distinguish current shipped commands from future roadmap items.
- [ ] Package/install story is documented, even if publishing is a later approval gate.

## Verification steps

1. Run targeted tests for each new CLI command; expected pass after red/green cycle.
2. Run `npm test`; expected pass.
3. Run `npm run build`; expected pass.
4. Run `./verify.sh --strict`; expected pass.
5. Run `npm pack --dry-run` if packaging metadata changes.
6. Run `git diff --check`; expected clean.

## Open questions

- Which command should ship first: `osc init`, `osc plan new`, `osc amend`, or `osc evidence`?
