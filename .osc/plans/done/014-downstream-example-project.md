# Plan: downstream-example-project

## Status

done

## Context

The independent review found Open Scaffold's self-dogfood convincing but recursive. Adoption needs one real, tiny, non-scaffold project that demonstrates the method on ordinary work.

## Goal

Ship a public-safe downstream example that demonstrates mission → plan → run packet → evidence → close on a project that is not Open Scaffold itself.

## Constraints / Out of scope

- Keep the project intentionally tiny; the example proves process, not product ambition.
- Do not require private credentials, Daniel Command Center, Hermes, OMC, OMX, or Codex connector.
- Do not let the example dominate the core repository.

## Files to touch

- `docs/examples/` or `examples/` — add the downstream example walkthrough and/or fixture project.
- `README.md` — link the example from Quickstart/adoption path.
- `.osc/releases/` — record evidence when the example lands.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Select the smallest useful example domain | None | A |
| T2 | Create the example mission, plan, run/evidence walkthrough | T1 | B |
| T3 | Add docs links and verification instructions | T2 | C |
| T4 | Run the walkthrough from a clean clone or temp directory | T3 | D |

### Parallel groups

- This slice is mostly serial because the example domain shapes every artifact.

### Dependencies

- T2 depends on T1; T4 depends on the final docs being executable by a fresh reader.

### Delegation notes

- Candidate domains: tiny CLI, static recipe app, toy Discord-less status bot, or GitHub-only docs fix.

## Acceptance criteria

- [ ] The example is understandable without private context.
- [ ] The example demonstrates the full identity chain at least once.
- [ ] The example includes concrete files, commands, and expected outputs.
- [ ] A fresh reader can tell when Open Scaffold is useful and when it is overkill.

## Verification steps

1. Follow the example from a clean temp directory; expected no missing private dependencies.
2. Run `./verify.sh --strict`; expected pass.
3. Run `git diff --check`; expected clean.

## Open questions

- Should the example live as fixture files in-repo, a separate public repo, or a docs-only walkthrough first?
