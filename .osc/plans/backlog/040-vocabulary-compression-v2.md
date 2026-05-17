# Plan: 040-vocabulary-compression-v2

## Status

backlog

## Context

Plan `026-vocabulary-compression` shipped a first pass, but a later external fresh-read review still found a major vocabulary cliff. The issue is not that the project failed to notice vocabulary; the issue is that the previous pass undershot first-touch comprehension.

## Goal

Reduce first-touch Open Scaffold vocabulary to plain-language terms while preserving precise protocol terms where they are genuinely needed.

## Constraints / Out of scope

- Do not churn JSON schema fields, historical plan names, release notes, or established file names just to rename concepts.
- Do not remove `run packet` if it remains useful; instead alias it immediately as the `run.json` manifest/package.
- Do not create a larger ontology document as the answer to jargon criticism.
- Do not edit done plans for wording cleanup.
- Do not weaken runtime/core boundary accuracy.

## Files to touch

- `README.md` — plain-language first-touch wording.
- `docs/MINIMUM_VIABLE_SCAFFOLD.md` — keep beginner path light.
- `docs/WHY_OPEN_SCAFFOLD.md` and/or `docs/FAQ.md` — translate terms where they appear before context.
- `docs/WORKFLOW.md` — use plain aliases in workflow guidance.
- `docs/RUNTIME_SELECTION.md`, `docs/RUNTIME_PROFILES.md`, `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/SPAWNING_BOUNDARY.md` — alias advanced runtime terms without changing boundaries.
- Optional `docs/GLOSSARY.md` or a small existing-doc glossary section — only if it replaces repeated explanations.
- `AGENTS.md` and `CLAUDE.md` — only if paired entrypoint vocabulary needs the same first-touch clarification.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit first-touch docs for jargon terms and contexts | None | A |
| T2 | Define approved aliases and terms to keep | T1 | B |
| T3 | Patch README/minimum/why/FAQ first | T2 | C |
| T4 | Patch runtime docs for aliases without boundary drift | T2 | C |
| T5 | Run grep audit and adjust over/under-renames | T3, T4 | D |

### Parallel groups

- **Group A**: audit only.
- **Group B**: alias decision.
- **Group C**: first-touch and runtime docs can be patched in parallel once aliases are set.
- **Group D**: final consistency pass.

### Dependencies

- T3/T4 depend on T2 to avoid inconsistent rename choices.
- T5 depends on all edits.

### Delegation notes

- A docs worker can patch first-touch pages while a runtime-boundary reviewer checks advanced docs for accidental semantic changes.

## Implementation Architecture Coverage

- Strengthens: adoption trust, workflow design, recovery/ownership.
- Audit envelope: PR should include before/after grep counts for key jargon terms in first-touch docs.
- Evaluation envelope: reviewers should understand the README and minimum path without learning the whole ontology first.
- Feedback routing: if a term must stay for schema/history reasons, document the rationale instead of hiding it.
- Boundary: schema migrations, runtime behavior, and historical artifact rewrites remain outside this slice.

## Acceptance criteria

- [ ] README and minimum first-use docs use plain language before protocol language.
- [ ] `run packet` is kept only with an immediate alias such as `run.json manifest/package` in first-touch contexts.
- [ ] First-touch docs avoid or immediately translate: `glass cockpit`, `operator surface`, `runtime binding`, `dispatch receipt`, `harness skill`, `slice close`, `task bridge`, `evaluation envelope`, and `audit envelope`.
- [ ] Advanced docs may retain precise terms, but first mention provides a plain-language alias.
- [ ] A grep/audit summary records remaining high-friction terms and why they remain.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. Run `grep -RniE "glass cockpit|operator surface|runtime binding|dispatch receipt|harness skill|slice close|task bridge|evaluation envelope|audit envelope" README.md docs/*.md`; pass if first-touch occurrences are removed or aliased.
2. Run `wc -c README.md`; pass if size is intentionally reduced or any remaining size is justified by the slice evidence.
3. Run `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check`; pass on clean outputs.
4. Manually read README through Quickstart; pass if a new user can understand the value without knowing the full protocol vocabulary.

## Open questions

- Should `glass cockpit` remain as a branded advanced concept, or should first-touch docs consistently prefer `operator dashboard` / `control room`?
- Should README regain a hard byte target, or should the acceptance bar be comprehension and command truth rather than size alone?
