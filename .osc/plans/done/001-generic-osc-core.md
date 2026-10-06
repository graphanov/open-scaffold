# Plan: generic-osc-core

## Status

done

## Context

open-scaffold started with an OMC-shaped `.omc/` namespace, but the project is now the runtime-neutral core for Open Scaffold. OMC and OMX will become separate adapter repos, with OMC using `.omc/` and OMX using `.omx/`.

## Goal

Rewrite open-scaffold into a generic `.osc`-based scaffold with an `osc` CLI that parses scaffold state and generates prompts/artifacts without spawning agents.

## Constraints / Out of scope

- Do not implement autonomous agent spawning in the generic repo.
- Do not copy roach-pi code; only use clean-room conceptual inspiration.
- Keep generated artifacts human-readable and runtime-neutral.
- Preserve public MIT distribution and template usability.
- OMC/OMX adapters are follow-up repos, not implemented in this plan.

## Files to touch

- `.osc/` — generic scaffold namespace replacing legacy runtime-specific scaffold state.
- `package.json` — npm package and `osc` binary metadata.
- `src/` — TypeScript CLI, parser, artifact generation, prompt generation.
- `tests/` — parser and CLI behavior tests.
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `LLM_QUICKSTART.md`, `docs/WORKFLOW.md`, `docs/FAQ.md`, `docs/decisions/README.md`, `docs/examples/amend-helper.md` — update generic/adapters story.
- `bootstrap.sh`, `verify.sh`, `delegate.sh`, `amend.sh`, `close.sh` — point shell fallback scripts at `.osc/`.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Rename generic namespace references from legacy runtime-specific paths to `.osc` | None | A |
| T2 | Add TypeScript package, parser tests, and CLI tests | T1 | B |
| T3 | Implement `osc` CLI prompt/artifact behavior | T2 | C |
| T4 | Update docs for adapter model and roach-pi inspiration boundaries | T1 | B |
| T5 | Run tests, shell script verification, and git diff review | T3, T4 | D |

### Parallel groups

- **Group A** (foundation): T1 — establish generic namespace first.
- **Group B** (parallel after foundation): T2, T4 — tests/code scaffolding and docs can proceed together.
- **Group C** (implementation): T3 — implement behavior against failing tests.
- **Group D** (verification): T5 — final checks after implementation and docs.

### Dependencies

- T2 depends on T1 because tests should assert `.osc` paths, not legacy runtime-specific paths.
- T3 depends on T2 because production CLI code should follow failing tests.
- T5 depends on T3 and T4 because verification must cover code and docs.

### Delegation notes

- Generic repo produces prompts/artifacts only; autonomous spawning belongs in adapter repos.
- Adapter repos should shell out to `osc` for parsing and artifact generation.

## Acceptance criteria

- [ ] Generic scaffold files use `.osc/` as the default namespace.
- [ ] `osc status` reports mission state, plan counts by stage, and active plan names.
- [ ] `osc plan <path>` parses a scaffold plan and outputs JSON.
- [ ] `osc delegate <plan>` generates prompt artifacts under `.osc/runs/<run-id>/`.
- [ ] `osc run <plan>` creates a runtime-neutral run manifest and prompt bundle but does not spawn agents.
- [ ] Shell fallback scripts operate against `.osc/`.
- [ ] Documentation explains that OMC uses `.omc/` and OMX uses `.omx/` in separate adapter repos.
- [ ] Tests pass via `npm test`.

## Verification steps

1. Run `npm test`.
2. Run `npm run build`.
3. Run `node dist/cli.js status` or `npm run osc -- status`.
4. Run `./verify.sh --quick --quiet` and confirm it still correctly blocks template repos with unset missions.
5. Review `git diff --stat` and key docs for accidental legacy namespace references.

## Open questions

- Whether shell scripts stay permanently or become compatibility wrappers around `osc` later.
- Whether roach-pi-style workspace memory becomes `.osc/knowledge/` in a later generic phase or remains adapter-only.
