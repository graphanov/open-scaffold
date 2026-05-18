# Plan: 048-cli-lifecycle-parity

## Status

done

## Context

The 2026-05-18 open-question reconciliation found that Open Scaffold's next concrete implementation gap is CLI lifecycle parity. PR #52 shipped `osc plan new` and `osc evidence new`, but the main plan lifecycle still requires shell scripts for amendment and close operations.

That is acceptable as a compatibility floor, but it keeps day-two users switching between `npx open-scaffold ...` helpers and repo-local shell scripts. A small CLI parity slice should reduce lifecycle friction while preserving the existing shell scripts as explicit fallbacks.

## Goal

Add the next smallest CLI lifecycle helper(s) for amendment and/or close operations so users can continue the plan lifecycle from `npx open-scaffold ...` without losing the current script-backed safety rules.

## Constraints / Out of scope

- Do not remove or deprecate `amend.sh` or `close.sh`.
- Do not rewrite the plan immutability model.
- Do not add runtime launch behavior, task execution, PR automation, or merge/publish authority.
- Do not generate acceptance criteria or silently edit committed done plans.
- Keep helper output explicit about human-filled TODOs, verification, and owner gates.
- If only one helper can be done safely, prefer the smallest verified slice over broad parity.

## Files to touch

- `src/cli.ts` — expose lifecycle helper command(s).
- `src/scaffold.ts` or a focused helper module — implement safe path/status handling for amendment/close helpers.
- `tests/*` — TDD coverage for happy paths and unsafe/missing-root/duplicate/status edge cases.
- `README.md`, `docs/MINIMUM_VIABLE_SCAFFOLD.md`, `docs/WORKFLOW.md`, and `src/init.ts` templates — document CLI helpers while preserving shell fallbacks.
- `.osc/releases/<date>-048-cli-lifecycle-parity.md` — release/evidence note when executed.

## Acceptance criteria

- [ ] A failing test first captures the day-two lifecycle gap after `osc plan new` / `osc evidence new`.
- [ ] The selected helper command(s) preserve current stage-folder and immutability semantics.
- [ ] Commands reject unsafe paths, missing scaffold roots, missing parent plans, duplicate output files, and invalid stages with actionable errors.
- [ ] Generated amendment or close artifacts do not invent acceptance criteria, verification, approval, or evidence.
- [ ] Shell scripts remain documented as the compatibility floor.
- [ ] Downstream generated docs use `npx open-scaffold ...` where a persistent `osc` binary is not guaranteed.
- [ ] `npm run build`, `npm test`, `./verify.sh --strict`, `npm run osc -- verify`, and `git diff --check` pass.

## Verification steps

1. `npm test -- <new targeted lifecycle-helper tests>` — expected RED then GREEN.
2. `npm run build` — expected pass.
3. `npm test` — expected pass.
4. `./verify.sh --strict` — expected 0 warnings.
5. `npm run osc -- verify` — expected 0 warnings.
6. `git diff --check` — expected no whitespace errors.

## Open questions

- Should the first parity slice include both `osc amend` and `osc close`, or split them if close semantics prove too risky for one PR?
- Should `osc close` call the existing shell script, reimplement the move/changelog logic in TypeScript, or share a single source of truth with the shell script later?
- Should changelog stamping remain mandatory for CLI close, or should the CLI support a dry-run/preview mode first?