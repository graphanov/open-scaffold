# Plan: 039-session-2-aha-walkthrough

## Status

active

## Context

The same external review found that Open Scaffold's real value does not appear at install time; it appears when a later human or agent can resume from repo truth without prior chat context. Existing examples prove mechanics, but the first public adoption path still underplays the session-2 payoff.

## Goal

Ship a concise public walkthrough that demonstrates a fresh session resuming work from Open Scaffold files alone.

## Constraints / Out of scope

- Do not require Hermes, Discord, OMC, OMX, Claude Code, Codex, or any private owner setup.
- Do not add runtime adapter implementation.
- Do not add broad new ontology docs.
- Do not claim compliance certification; describe evidence/recovery in plain language.
- Do not duplicate the entire README or downstream example; make the walkthrough an entry point or focused extension.

## Files to touch

- `docs/examples/downstream-walkthrough.md` — add or reshape a session-2 resume path.
- `docs/examples/README.md` — point fresh users to the walkthrough.
- `docs/MINIMUM_VIABLE_SCAFFOLD.md` — connect minimum scaffold to session-2 payoff.
- `README.md` — add only a small pointer if needed.
- `docs/wiki/queries/what-is-open-scaffold-for.md` — optional compiled-knowledge alignment if the public wiki should reference the session-2 value.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit existing example flow for where session-2 resume is missing | None | A |
| T2 | Draft minimal day-1 -> day-2 walkthrough | T1 | B |
| T3 | Add persona-specific entry cues: solo dev, small team/GitHub-only, consultant/client evidence | T1 | B |
| T4 | Patch docs links without broad rewrites | T2, T3 | C |
| T5 | Verify owner-neutral wording and command truth | T4 | D |

### Parallel groups

- **Group A**: read-only audit.
- **Group B**: walkthrough and persona cues can be drafted independently.
- **Group C**: link integration after text stabilizes.
- **Group D**: final verification.

### Dependencies

- T2 and T3 depend on T1 so they reuse existing examples instead of creating a parallel doc maze.
- T4 depends on T2/T3 to avoid linking to unstable headings.

### Delegation notes

- A documentation worker can draft the walkthrough; Hermes should final-review for public-safe owner-neutral wording and product positioning.

## Implementation Architecture Coverage

- Strengthens: recovery/ownership, workflow design, adoption trust.
- Audit envelope: PR should cite this plan, the walkthrough path, and verification commands.
- Evaluation envelope: a reviewer should be able to answer goal, current state, accepted evidence, and next action from files alone.
- Feedback routing: if the walkthrough exposes missing CLI support, route that to `044-cli-friction-reduction` instead of expanding this slice.
- Boundary: runtime adapters, dashboards, and hosted state remain outside this slice.

## Acceptance criteria

- [ ] The walkthrough shows a day-1 setup/work slice and a day-2 fresh-session resume without relying on chat history.
- [ ] A reader can identify mission, active/backlog/done state, verification evidence, and next action from repo files alone.
- [ ] The default path requires no private tools, no unpublished package assumptions, and no runtime adapter.
- [ ] The walkthrough states when Open Scaffold is overkill for small one-shot work.
- [ ] Wording remains owner-neutral and public-safe.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. Follow the walkthrough commands in a temp directory; pass if the documented file state appears as described.
2. Start from the documented day-2 section with no prior chat context; pass if the next action is reconstructable from files alone.
3. Run `! git diff -U0 origin/main...HEAD -- README.md docs | grep '^+' | grep -E "/Users/|owner-local|private workspace"`; pass if no newly added private-context leaks are introduced.
4. Run `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check`; pass on clean outputs.

## Open questions

- Should the session-2 demo be purely docs, or should it include a tiny fixture project that verification can execute?
- Should persona cues live in this walkthrough or in a later adoption/persona page?
