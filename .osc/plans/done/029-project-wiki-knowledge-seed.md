# Plan: 029-project-wiki-knowledge-seed

## Status

done

## Context

PR #27 shipped the tiered scaffold initialization slice, and plan 028 created the public `docs/wiki/` skeleton. The next useful milestone is to turn that empty wiki container into a small, curated Open Scaffold body-of-work knowledge graph.

## Goal

Seed `docs/wiki/` with public-safe, interlinked Open Scaffold project knowledge that explains the product's durable concepts without duplicating live task state, release evidence, or private owner context.

## Constraints / Out of scope

- Do not copy private Command Center text, raw agent transcripts, personal owner context, or unpublished strategy into the public repo.
- Do not turn `docs/wiki/` into a task board, release log, roadmap replacement, or product manual.
- Do not use the owner's personal name in public wiki pages.
- Do not rewrite the README or public product positioning beyond minimal links/index updates needed to expose the wiki seed.
- Do not commit, push, open a PR, or merge without explicit owner approval.

## Files to touch

- `docs/wiki/index.md` — expand the project wiki catalog and page count.
- `docs/wiki/log.md` — append the knowledge-seed action.
- `docs/wiki/concepts/*.md` — add durable concept pages for the Open Scaffold ontology.
- `docs/wiki/comparisons/*.md` — add comparison pages that clarify boundaries versus adjacent methods/tools.
- `docs/wiki/queries/*.md` — add reusable answer pages for common adoption and agent-orientation questions.
- `ROADMAP.md` — mark this as the next milestone and keep the public roadmap aligned.
- `.osc/plans/active/029-project-wiki-knowledge-seed.md` — trace this milestone scope.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Select the exact 8-12 public-safe wiki pages and source docs. | None | A |
| T2 | Draft concept pages for source-of-truth-first development, repo-native agent operating system, agent resumability, evidence-first development, human-in-the-loop governance, glass cockpit, run packets, and scaffold tiers. | T1 | B |
| T3 | Draft comparison pages for Open Scaffold versus agent memory, README-driven development, and traditional SDLC. | T1 | B |
| T4 | Draft query pages answering what Open Scaffold is for, what agents should read first, and why the project matters. | T1 | B |
| T5 | Update index/log and verify links, public wording, and build/test gates. | T2, T3, T4 | C |

### Parallel groups

- **Group A**: page selection and source review must happen first to keep the seed curated.
- **Group B**: concepts, comparisons, and query answers can be drafted independently once the page set is fixed.
- **Group C**: index/log/link/public-safety verification must happen after the pages exist.

### Dependencies

- T2, T3, and T4 depend on T1 so the wiki does not sprawl beyond a curated seed pack.
- T5 depends on all page drafting because index/log and link verification are integration checks.

### Delegation notes

- This slice is suitable for parallel docs agents only if each agent receives the public-wording rule, page list, source docs, and no-private-context constraint.
- Final integration should be done by one owner/Hermes pass to keep voice, links, and boundaries coherent.

## Acceptance criteria

- [ ] `docs/wiki/` gains a curated seed pack of 8-12 new pages across concepts, comparisons, and queries.
- [ ] Every new page has frontmatter matching `docs/wiki/SCHEMA.md`.
- [ ] Every new page is public-safe, owner-neutral, and avoids personal-name references.
- [ ] Every new page links to at least two related wiki pages where possible.
- [ ] `docs/wiki/index.md` lists every new page in the correct section and reports the updated page count.
- [ ] `docs/wiki/log.md` records the knowledge-seed action.
- [ ] The wiki explains conceptual project knowledge rather than live PR/task/release state.
- [ ] `ROADMAP.md` names this as the next milestone and points to this plan.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. `grep -R "[D]aniel" docs/wiki .osc/plans/active/029-project-wiki-knowledge-seed.md` returns no matches.
2. Run a wikilink/index consistency check for `docs/wiki/**/*.md` so every listed page exists and every new page is indexed.
3. `./verify.sh --strict` exits 0.
4. `npm test` exits 0.
5. `npm run build` exits 0.
6. `git diff --check` exits 0.

## Open questions

- Should the first seed link from README immediately, or should the README link wait until after the wiki content passes the PR review gate?
- Should comparison pages include named external tools/frameworks now, or stay method-level until the project has a stronger comparison doctrine?
