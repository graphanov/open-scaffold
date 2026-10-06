# Plan: binding-example

## Status

done

## Context

The independent review found the runtime binding contract credible but under-proven: Open Scaffold documents how run packets should be consumed, yet ships no public minimal adapter example. This plan adds a tiny example while preserving core's non-spawning boundary.

## Goal

Provide one minimal, public, safe binding example that consumes `.osc/runs/<run_id>/run.json` and shows how an external coordinator or human can launch a runtime lane without making Open Scaffold core the spawner.

## Constraints / Out of scope

- Do not make `osc run` launch Claude, Codex, OMC, OMX, or any external runtime.
- Do not require private Daniel Command Center, Hermes Kanban, or Codex connector setup.
- Keep the example optional and clearly labeled as adapter/reference code.

## Files to touch

- `binding-examples/` or `docs/examples/` — add the minimal adapter example.
- `docs/RUNTIME_BINDING_CONTRACT.md` — link the example from the contract.
- `README.md` or `docs/WORKFLOW.md` — mention the example in the adoption path.
- `tests/` — validate any parser/helper code if code is added.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Choose the example shape: shell, Node, or both | None | A |
| T2 | Implement/readme the minimal `run.json` consumer | T1 | B |
| T3 | Add docs links and safety boundary wording | T1 | B |
| T4 | Verify generated run packet can be consumed by the example without network credentials | T2, T3 | C |

### Parallel groups

- **Group B** can split implementation and docs after T1 chooses the shape.

### Dependencies

- T4 depends on both example and docs because the safety boundary is part of the product contract.

### Delegation notes

- Use a simple example first. A fancy adapter belongs in a future dedicated adapter repo.

## Acceptance criteria

- [ ] A fresh user can generate a run packet and inspect how an external adapter would consume it.
- [ ] The example does not run by default, mutate global config, or require credentials.
- [ ] Docs explicitly state Open Scaffold core still does not spawn runtimes.
- [ ] Verification includes at least one command that exercises the example on a generated run packet.

## Verification steps

1. Run the documented example against a local generated `.osc/runs/<run_id>/run.json`.
2. Run `./verify.sh --strict`; expected pass.
3. Run `npm test`; expected pass if code changed.
4. Run `npm run build`; expected pass if TypeScript changed.
5. Run `git diff --check`; expected clean.

## Open questions

- Should the first example target plain Claude Code, plain Codex, or a runtime-neutral dry-run adapter?
