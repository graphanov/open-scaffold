# Plan: 088-runtime-omx-evolution-ledger-bridge

## Status

done

## Context

`open-scaffold@0.4.9` shipped `osc evolve init|record|check` and the `.osc/evolution/<loop_id>/` contract. `packages/runtime-omx/` already writes OMX dispatch receipts, adapter evidence, and optional logs under `.osc/runs/<run_id>/`, but those adapter outputs are not yet first-class inputs to the evolution attempt ledger. This slice bridges that gap without making Open Scaffold core spawn runtimes or making the runtime package own approval/model-ranking authority.

## Goal

Make a `runtime-omx` attempt easy to record into an existing `.osc/evolution/<loop_id>/` ledger with durable receipt/evidence refs, run-id consistency checks, and no hidden spawning.

## Constraints / Out of scope

- Do not make `osc run` launch OMX, Codex, tmux, or any provider runtime.
- Do not make `packages/runtime-omx/` approve work, rank models, certify compliance, publish releases, or decide frontier promotion automatically.
- Do not store raw runtime transcripts, secrets, home-directory config, `.osc/research/`, `.osc-dev/`, `.hermes/`, `node_modules/`, or private paths in evolution artifacts.
- Do not broaden runtime support beyond the existing OMX `$ralplan` lane.
- Do not require `@open-scaffold/runtime-omx` to import Open Scaffold core source from outside its package `rootDir`; the bridge should use stable CLI/API contracts.
- Keep default behavior no-spawn/no-ledger-mutation unless the operator explicitly provides evolution-recording inputs.

## Files to touch

- `src/evolution.ts` — accept adapter receipt / extra evidence refs when recording attempts; validate dispatch receipt schema, run-id match, refs, and private-path boundaries before append.
- `src/cli.ts` — extend `osc evolve record` with repeatable adapter-output flags such as `--receipt <dispatch-receipt.json>` and `--evidence <path>`.
- `tests/evolution.test.ts` — cover receipt/evidence refs, mismatched receipt run id, private adapter refs, and no partial writes.
- `tests/cli-evolution.test.ts` — cover CLI parsing for receipt/evidence flags and subdirectory path behavior.
- `packages/runtime-omx/src/types.ts` — add a small evolution-recording hint/manifest type if needed for generated command metadata.
- `packages/runtime-omx/src/receipt.ts` — include receipt/evidence/log refs in a deterministic "record this attempt" block or manifest.
- `packages/runtime-omx/src/cli.ts` — add an explicit `--evolution-loop <dir>` hint flag that prints the exact `osc evolve record` command after writing artifacts; it must not mutate the ledger by default.
- `packages/runtime-omx/README.md` — document the no-spawn bridge from run packet -> runtime-omx outputs -> `osc evolve record`.
- `docs/EVOLUTION_LOOP.md` and `docs/RUNTIME_BINDING_CONTRACT.md` — document adapter-output recording as the runtime bridge, not core execution.
- `.osc/releases/<date>-088-runtime-omx-evolution-ledger-bridge.md` — record traceability and verification when the slice closes.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Add failing core tests for `osc evolve record --receipt/--evidence` and run-id mismatch refusal | None | A |
| T2 | Add failing runtime-omx tests for a printed evolution-record command / manifest that references receipt, evidence, optional log, and run packet | None | A |
| T3 | Implement core receipt/evidence ingestion in `src/evolution.ts` and CLI parsing in `src/cli.ts` | T1 | B |
| T4 | Implement runtime-omx evolution-record hint output without default ledger mutation | T2 | B |
| T5 | Update docs/README/evidence note and close the plan in the same PR | T3, T4 | C |

### Parallel groups

- **Group A**: Core and runtime tests can be drafted independently because they describe the contract boundary from each side.
- **Group B**: Core implementation and runtime hint implementation can proceed after their respective tests are red.
- **Group C**: Docs and release evidence depend on the exact command surface and test counts.

### Dependencies

- T3 must preserve PR #79 invariants: resolve CLI paths from caller CWD, validate dependent state before append, and reject cross-artifact identity mismatches before writing.
- T4 must preserve runtime-omx safety invariants: no-spawn default, explicit `--allow-spawn`, worktree containment, version checks, and no commit/push/merge authority.

### Delegation notes

- A code worker can implement T1/T3 and a second worker can implement T2/T4, but Hermes should integrate docs/evidence and run final verification locally.
- Do not launch a real OMX process for this slice unless the owner gives a separate live-spawn approval; no-spawn fixtures and command-runner fakes are enough.

## Implementation Architecture Coverage

- Strengthens: runtime binding, evidence routing, audit trails, recovery/ownership, and closed-loop evolution.
- Audit envelope: the closed PR must cite plan `088`, the generated run packet, runtime-omx dispatch receipt, adapter evidence/log refs, evolution attempt/frontier refs, tests, CI, and Codex review status.
- Evaluation envelope: acceptance is checked by targeted evolution/runtime-omx tests, full test/build/strict verification, and manual boundary scans for unsupported runtime/model/compliance claims.
- Feedback routing: failed receipt/run identity checks remain CLI errors; weak or failed runtime attempts become `retry` or `block` decisions in `attempts.jsonl`, not automatic source changes.
- Boundary: core records attempts/frontier/evidence; external adapters/coordinators perform execution. Model benchmarking, hidden spawning, compliance certification, publishing, and human approval remain outside this slice.

## Acceptance criteria

- [x] `osc evolve record` can include a runtime dispatch receipt and one or more adapter evidence refs in the recorded attempt and promoted frontier evidence refs.
- [x] Recording rejects a dispatch receipt whose `run_id` does not match the supplied run packet before mutating `attempts.jsonl` or `frontier.json`.
- [x] Recording rejects or warns consistently for adapter refs that are missing, outside repo root, or under private/internal paths; no private refs are persisted.
- [x] `packages/runtime-omx` no-spawn mode can print or emit an exact `osc evolve record` command for a supplied loop dir, run packet, receipt, adapter evidence, optional log, decision, score, and rationale.
- [x] Runtime-omx default behavior still writes only run-directory receipt/evidence artifacts and does not mutate `.osc/evolution/` unless a future explicit recording mode is separately approved.
- [x] Docs show the flow: `osc evolve init` -> `osc run --runtime omx` -> `open-scaffold-runtime-omx` -> `osc evolve record --receipt ... --evidence ...` -> `osc evolve check`.
- [x] Tests prove subdirectory relative paths still work for the new receipt/evidence inputs.
- [x] Public wording does not claim hidden spawning, model ranking, compliance certification, automatic approval, or full OMX workflow support.

## Verification steps

1. `npm test -- tests/evolution.test.ts tests/cli-evolution.test.ts packages/runtime-omx/tests/cli.test.ts packages/runtime-omx/tests/validation.test.ts` — targeted bridge tests pass.
2. `npm run build:runtime-omx` and `npm run test:runtime-omx` — runtime package build/tests pass.
3. `npm test` — full suite passes.
4. `npm run build` — core and runtime package builds pass.
5. `./verify.sh --strict` — scaffold checks pass with no warnings.
6. `npm run osc -- verify` — CLI verifier passes.
7. `git diff --check` — no whitespace errors.
8. Boundary scan: changed docs/code must not add hidden spawn/model-ranking/compliance/approval claims or private-path refs.

## Open questions

- Should `--receipt` be specialized for `open-scaffold.dispatch-receipt.v1`, while `--evidence` stays generic for markdown/log refs? Initial recommendation: yes.
- Should runtime-omx ever directly call the core `osc evolve record` command when `--evolution-loop` is present? Initial recommendation: no for this slice; print/emit the exact command so core remains the recorder and the operator controls ledger mutation.
- Should `osc evolve record` accept `--decision retry` as the default for runtime-omx no-spawn previews? Initial recommendation: require an explicit decision/rationale so preview artifacts do not become fake attempts.
