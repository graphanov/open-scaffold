# Plan: 102-codex-runtime-adapter-package-hardening

## Status

done


## Context

`packages/runtime-omx/` is the first optional runtime package proof for Open Scaffold. It targets OMX / oh-my-codex `$ralplan`, writes no-spawn dispatch receipts/evidence by default, and has an explicit `--allow-spawn` launch path behind safety checks. The post-v1 strategy now prioritizes Codex-first runtime adoption rather than a Claude Code adapter.

## Goal

Harden the Codex-first runtime adapter path and decide whether the public adapter surface should graduate `@open-scaffold/runtime-omx`, introduce `@open-scaffold/runtime-codex`, or support both with a shared dispatch receipt contract.

## Constraints / Out of scope

- Do not add provider-specific spawning to Open Scaffold core.
- Do not publish an npm package without explicit owner approval and a package safety gate.
- Do not claim full Codex/OMX workflow support beyond the tested adapter lane.
- Do not add auto-install behavior or a remote marketplace.
- Do not broaden into Claude Code adapter work in this slice.

## Files to touch

- `packages/runtime-omx/` — safety, packaging, docs, tests, and launch/no-spawn behavior as needed.
- Potential `packages/runtime-codex/` — only if direct Codex support is chosen after source inspection.
- `tests/runtime-binding-conformance*` — adapter conformance coverage if needed.
- `docs/RUNTIME_ADOPTION_WORKFLOW.md`, `docs/RUNTIME_BINDING_CONTRACT.md`, or `docs/RUNTIME_SELECTION.md` — adapter naming and usage docs.
- `package.json` / workspace packaging files — only if package publication or package inclusion is explicitly scoped.
- `.osc/releases/` — evidence note if the hardening ships in a PR.

## Implementation Architecture Coverage

- Strengthens: adapter proof, runtime boundary, dispatch receipt portability, and Codex-first adoption.
- Audit envelope: adapter tests, no-spawn smoke, optional launch safety checks, package dry-run output if publication is prepared.
- Evaluation envelope: conformance tests and local smoke must prove receipts/evidence are written under the selected `.osc/runs/RUN_ID/` directory.
- Feedback routing: direct Codex-vs-OMX naming/shape decision should be recorded in docs or a decision note before code expands.
- Boundary: runtime package may launch only by explicit operator flag; core remains non-spawning.

## Acceptance criteria

- [ ] The adapter naming decision is documented: `runtime-omx`, `runtime-codex`, or both.
- [ ] No-spawn adapter receipt/evidence behavior is covered by tests and a local smoke.
- [ ] If explicit launch remains supported, safety checks cover branch, worktree, version, path, command redaction, and sandbox posture.
- [ ] Adapter docs state current support limits and do not imply core runtime ownership.
- [ ] Package publication remains owner-gated unless explicitly approved.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, runtime adapter tests, and `git diff --check` pass.

## Verification steps

1. Run `npm run build:runtime-omx`.
2. Run `npm run test:runtime-omx`.
3. Run a no-spawn adapter smoke from a scratch run packet.
4. If package changes are included, run `npm pack --dry-run --json` or the relevant package dry-run.
5. Run `./verify.sh --strict`.
6. Run `npm test`.
7. Run `npm run build`.
8. Run `git diff --check`.

## Open questions

- Should broad users see `--runtime codex` as a direct adapter or `--runtime omx` as the Codex harness profile? Resolve through source inspection and a small UX decision before implementation.
