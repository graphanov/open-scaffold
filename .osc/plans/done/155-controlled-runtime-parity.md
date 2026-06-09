# Plan: 155-controlled-runtime-parity

## Status

done

## PR association

- Current PR slot: #194 candidate.
- Branch: `feat/controlled-runtime-parity`.
- Title: `feat: add controlled runtime parity`.
- Base: fresh `main` with the harness foundation on trunk and plan 154 closed.

## Context

PR #192 gives Open Scaffold a serious harness command surface, but `$work` is not yet as close to the John Lomein source prototype as it needs to be. The next slice must wire the real controlled runtime path: work package, adapter launch, strict runtime markers, human gate pause/resume, receipts, bounded logs, and safe artifact reads/writes.

This is the slice that turns the harness from "can package work" into "can run bounded AI work under Open Scaffold control."

## Goal

Make `$work` execute one bounded slice through a provider-neutral runtime adapter, with Codex as the first real adapter path, while preserving Open Scaffold authority boundaries and evidence files.

## Constraints / Out of scope

- Do not import `jon`, `soy-sauce`, `vegetables`, persona wording, or `.lomein/` paths.
- Do not let Open Scaffold core depend on Codex UI internals or a provider SDK.
- Do not grant commit, push, PR, merge, publish, release, or deploy authority to the runtime.
- Do not treat a runtime receipt as proof that the work is correct.
- Do not commit raw runtime transcripts, secrets, local machine paths, or unbounded logs.
- Do not run full live reproduction in this PR; this PR creates the runtime that PR #195 will test.

## Files to touch

- `src/harness.ts` — route `$work` to executable run state when `--allow-spawn` / equivalent backend authority is explicit.
- `src/cli.ts` — expose backend flags for safe runtime execution, gate answers, status reads, and dry-run mode.
- `src/runtimes.ts` — define provider-neutral runtime adapter contract and Codex adapter metadata.
- `src/dispatch.ts` — reuse or extend dispatch boundary for adapter launch receipts and failure states.
- `src/path-safety.ts` — verify safe reads as well as writes for run state, gate files, receipts, and logs.
- `src/schema-registry.ts` — register runtime receipt, gate, and adapter schemas.
- `tests/*runtime*.test.ts`, `tests/*harness*.test.ts`, `tests/*dispatch*.test.ts` — cover runtime/gate/receipt behavior.
- `docs/HARNESS_ARCHITECTURE.md`, `docs/HARNESS_COMMANDS.md`, `docs/RUNTIME_HARNESS_DISPATCH.md`, `docs/JOHN_LOMEIN_MIGRATION_ROADMAP.md` — document the implemented boundary.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
| --- | --- | --- | --- |
| T1 | Read PR #192 harness code and current `runtimes.ts` / `dispatch.ts` contracts. | None | A |
| T2 | Write failing tests for executable `$work` dry run vs spawn authority. | T1 | B |
| T3 | Write failing tests for adapter receipt shape and portable failure codes. | T1 | B |
| T4 | Write failing tests for `LOMEIN_COMPLETE`, `LOMEIN_NEEDS_HUMAN`, `LOMEIN_BLOCKED`, missing marker, duplicate marker, timeout, and non-zero exit parsing. | T1 | B |
| T5 | Write failing tests for gate answer persistence and resume on the same run ID. | T1 | B |
| T6 | Write failing tests for bounded logs, no absolute path leaks, symlink-safe reads, and symlink-safe writes. | T1 | B |
| T7 | Implement adapter contract and marker parser. | T2-T6 | C |
| T8 | Implement `$work` runtime path behind explicit authority flags. | T7 | C |
| T9 | Implement human gate answer/resume backend command. | T7 | C |
| T10 | Implement receipt/status/postflight updates for completed, blocked, needs-human, failed, and timed-out runs. | T7-T9 | C |
| T11 | Update docs with plain explanation and command examples. | T8-T10 | D |
| T12 | Run verification, live temp smoke, review, and PR workflow. | T11 | E |

### Parallel groups

- **Group A** (discovery): T1 reads the current contracts.
- **Group B** (TDD red): T2-T6 define runtime, marker, gate, and safety behavior before implementation.
- **Group C** (implementation): T7-T10 wire the adapter contract, runtime path, gates, receipts, and status.
- **Group D** (docs): T11 explains only implemented behavior.
- **Group E** (verification): T12 runs gates and review after code/docs converge.

### Dependencies

- Marker parsing must exist before runtime status can be trusted.
- Gate resume must use the same run ID; retries that create new run IDs belong in the feedback/handoff improvement parity follow-up.
- The live temp smoke must use a disposable fixture repo and must not commit generated `.osc/runs/...` residue.

### Delegation notes

- A separate review lane should inspect marker parsing and path safety.
- A separate docs review should check that receipts are not described as correctness proof.

## Acceptance criteria

- [ ] `$work` refuses to spawn unless explicit backend authority is passed.
- [ ] Runtime launch writes a repo-relative receipt with adapter name, command summary, timeout, exit state, marker state, evidence paths, and portable failure code when blocked.
- [ ] `LOMEIN_COMPLETE` becomes completed only when it is the final standalone marker and appears exactly once.
- [ ] `LOMEIN_NEEDS_HUMAN` becomes a pending resumable human gate, preserving the question/context before the marker.
- [ ] `LOMEIN_BLOCKED` becomes a blocked receipt, not success.
- [ ] Missing, duplicated, non-final, timed-out, signaled, or non-zero runtime output fails closed.
- [ ] Human answer satisfies the gate and resumes the same run as task input, not approval.
- [ ] Bounded logs are written without secrets, raw full transcripts, or absolute local paths.
- [ ] Run-state reads and writes reject traversal and symlink descendants.
- [ ] Docs state that runtime adapters execute while Open Scaffold records evidence and humans keep owner authority.

## Verification steps

1. Run targeted runtime tests, for example `npm test -- --run tests/*runtime*.test.ts tests/*harness*.test.ts tests/*dispatch*.test.ts`.
2. Run `npm run build`.
3. Run `npm test`.
4. Run `./verify.sh --strict`.
5. Run a temp-repo CLI smoke:
   - `$work` without spawn authority returns packaged/dry-run state.
   - `$work` with a fake adapter returning `LOMEIN_NEEDS_HUMAN` creates a pending gate.
   - answering the gate resumes the same run.
   - a fake adapter returning `LOMEIN_COMPLETE` writes a completed receipt.
6. Run `git diff --check` and `git diff --cached --check`.
7. Run `node dist/cli.js doctor --check secret-scan`.
8. Run independent review focused on runtime markers, authority, path safety, receipts, and overclaims.

## Open questions

- Should the first live Codex adapter be enabled through the existing dispatch boundary or a new `harness runtime` backend command?
- What timeout should be the default for live Codex smoke so the PR can verify behavior without expensive full reproduction?
- Should raw runtime logs be summarized immediately, or stored only as bounded redacted snippets?
