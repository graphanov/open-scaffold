# Plan: 042-reference-adapter-package-no-spawn

## Status

done

## Context

Once the adapter conformance contract is clear, Open Scaffold needs a safe sister/reference package that proves the package boundary without launching real agents. This responds to the run-packet IOU critique while preserving the core no-spawn stance.

## Goal

Create an optional no-spawn reference adapter package that reads an Open Scaffold `run.json` and writes an adapter receipt plus evidence artifact.

## Constraints / Out of scope

- Do not add real Claude Code, Codex, OMC, OMX, OpenCode, or shell spawning.
- Do not add credential handling, daemon behavior, process supervision, tmux, network registries, or remote execution.
- Do not make the package a marketplace or certified runtime integration.
- Do not move Open Scaffold core into a monorepo unless explicitly approved during execution.
- Do not grant commit, push, merge, or publish authority to the adapter.

## Files to touch

- Separate package/repo path TBD — reference adapter package source, tests, README, and package metadata.
- `docs/examples/runtime-binding-conformance/` — source fixture to extract or mirror from.
- `docs/RUNTIME_BINDING_CONTRACT.md` — link to package only after it exists.
- `docs/RUNTIME_SELECTION.md` and/or `docs/RUNTIME_PROFILES.md` — explain optional adapter package boundary.
- `.osc/releases/` — release/evidence note if this lands as an Open Scaffold public slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Decide package location: sibling repo, npm scope, or docs-only extraction | None | A |
| T2 | Create minimal package that reads `run.json` and validates required fields | T1 | B |
| T3 | Write adapter receipt and deterministic evidence artifact | T2 | C |
| T4 | Add tests against sample run packets and failure cases | T2, T3 | C |
| T5 | Document package as reference/conformance adapter, not runtime support | T3 | C |
| T6 | Link from core docs only after package proof exists | T4, T5 | D |

### Parallel groups

- **Group A**: owner/package-location decision.
- **Group B**: package skeleton.
- **Group C**: output behavior, tests, and docs can proceed together after skeleton.
- **Group D**: core docs integration after proof.

### Dependencies

- T1 gates all implementation because repo/package location affects commands and verification.
- T6 waits for proof to avoid linking an aspirational package.

### Delegation notes

- A package worker can build the no-spawn adapter while Hermes owns boundary wording and final Open Scaffold integration.

## Implementation Architecture Coverage

- Strengthens: runtime boundaries, audit trails, recovery/ownership, adoption trust.
- Audit envelope: package repository/commit or package path, sample run packet, receipt, evidence artifact, and test output.
- Evaluation envelope: package proves structural adapter roundtrip only; it does not evaluate task correctness.
- Feedback routing: real runtime demand routes to `043-one-real-runtime-adapter-spike` after this proof.
- Boundary: core remains no-spawn; real runtime launch, credentials, and provider support remain outside this package.

## Acceptance criteria

- [ ] A reference adapter package exists outside Open Scaffold core or in an explicitly approved package boundary.
- [ ] It accepts a path to `.osc/runs/<run_id>/run.json` and validates the minimum run-packet fields.
- [ ] It writes an adapter receipt and deterministic evidence artifact back under the run directory or an explicitly documented output path.
- [ ] It never launches a runtime, opens a network connection, reads credentials, or mutates source files outside its output artifacts.
- [ ] Tests cover valid run packets, missing required fields, unsafe output paths, and no-spawn behavior.
- [ ] Docs label it as a reference/conformance adapter, not production runtime support.

## Verification steps

1. Run the package's test suite; pass if all valid/error/no-spawn cases are green.
2. Run the adapter against a sample run packet; pass if receipt and evidence are created with deterministic content.
3. Run a source scan for spawning/network APIs in the package; pass if none exist except explicitly mocked test fixtures.
4. If core docs are touched, run Open Scaffold `npm test`, `npm run build`, `./verify.sh --strict`, and `git diff --check`.

## Open questions

- Should the reference adapter live under a Graphanov-owned sibling repo, an npm scoped package, or a packages directory introduced later?
- What package name should be used without overclaiming: `open-scaffold-adapter-reference`, `@open-scaffold/adapter-reference`, or another neutral name?
