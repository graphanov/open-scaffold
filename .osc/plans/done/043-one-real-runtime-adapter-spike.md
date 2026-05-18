# Plan: 043-one-real-runtime-adapter-spike

## Status

done

## Context

After a no-spawn reference adapter proves the package boundary, Open Scaffold can test whether one real runtime adapter meaningfully reduces the run-packet adoption deadlock. The external review and owner direction both warn against turning core into a runtime or bundling several runtimes at once.

## Goal

Spike one real runtime adapter that consumes an Open Scaffold run packet, launches only with explicit permission, and returns factual receipt/evidence without commit authority.

## Constraints / Out of scope

- Do not implement more than one real runtime in this slice.
- Do not add spawning to Open Scaffold core.
- Do not add default launch behavior; dry-run must be the default unless explicit `--allow-spawn` or equivalent is provided.
- Do not grant commit, push, merge, release, credential-management, or destructive filesystem authority.
- Do not claim certified runtime support beyond the one tested path.
- Do not support complex team modes, marketplace discovery, or model/task ranking.

## Files to touch

- Separate adapter package/repo path TBD — one-runtime adapter source, tests, docs.
- `docs/SPAWNING_BOUNDARY.md` — only if core docs need a link to proven external adapter evidence.
- `docs/RUNTIME_SELECTION.md` and/or `docs/RUNTIME_PROFILES.md` — clarify tested adapter vs candidate profile after proof exists.
- `.osc/releases/` — release/evidence note if core docs change.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Choose the one runtime target and justify why it is first | None | A |
| T2 | Define safety model: dry-run default, explicit spawn flag, worktree/branch policy, redaction | T1 | B |
| T3 | Implement dry-run command rendering and receipt preview | T2 | C |
| T4 | Implement explicit allowed launch path for the selected runtime | T3 | D |
| T5 | Capture receipt, exit status, logs path, and evidence artifact | T4 | D |
| T6 | Test success, failure, cancellation/timeout, and no-commit-authority cases | T4, T5 | E |
| T7 | Patch core docs only after adapter proof exists | T6 | F |

### Parallel groups

- **Group A/B**: decision and safety design.
- **Group C**: dry-run proof before real launch.
- **Group D**: real launch and evidence capture.
- **Group E**: tests after behavior exists.
- **Group F**: core docs integration only after proof.

### Dependencies

- T1 gates the whole slice because multi-runtime scope is explicitly out.
- T4 depends on dry-run proof to avoid accidental launch-first design.
- T7 depends on tested proof to avoid aspirational docs.

### Delegation notes

- Use a security/boundary reviewer before enabling any real launch path.
- Hermes should verify no core spawning or commit/publish authority was introduced.

## Implementation Architecture Coverage

- Strengthens: runtime boundaries, authority, audit trails, recovery/ownership.
- Audit envelope: selected runtime, adapter command, dry-run receipt, launch receipt, exit status, logs/evidence paths, and safety checks.
- Evaluation envelope: adapter evaluates only dispatch/evidence capture; task correctness remains a separate verification/evaluation step.
- Feedback routing: support-matrix gaps route to future one-runtime plans, not into a mega-adapter.
- Boundary: Open Scaffold core, model benchmarking, runtime marketplace, and autonomous commit/publish authority remain outside this slice.

## Acceptance criteria

- [ ] Exactly one runtime target is selected and documented.
- [ ] Adapter dry-run is default and produces the command/receipt preview without launching.
- [ ] Real launch requires an explicit opt-in flag and refuses unsafe/missing workspace conditions.
- [ ] Adapter writes factual receipt/evidence including command redaction, runtime identity, exit status, output/log path, and no-commit-authority statement.
- [ ] Tests cover dry-run, allowed launch, refusal without opt-in, failure exit, unsafe path, and no commit/push/merge behavior.
- [ ] Open Scaffold core remains free of runtime launch code.

## Verification steps

1. Run adapter test suite; pass if all safety and receipt cases are green.
2. Run dry-run against a sample run packet; pass if no process launches and receipt preview is produced.
3. Run explicit allowed launch in a disposable fixture; pass if receipt/evidence are produced and source files are not committed/pushed/merged.
4. Scan Open Scaffold core for new spawn/process APIs if core docs are touched; pass if none are introduced.
5. Run Open Scaffold `npm test`, `npm run build`, `./verify.sh --strict`, and `git diff --check` if core changes land.

## Open questions

- Which runtime should be first: Claude Code, Codex, OMC, OMX, or OpenCode?
- Is this spike intended for public package publication, private proof, or docs-only evidence first?
