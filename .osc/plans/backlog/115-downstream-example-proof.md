# Plan: 115-downstream-example-proof

## Status

backlog

## Context

The project is heavily dogfooded, but a skeptical adopter may dismiss the proof as self-referential. The strategy review found that one external or downstream example with a real merged change would reduce the "only the maintainer uses it" objection more than more internal documentation.

## Goal

Create and document a small downstream example that uses Open Scaffold to plan, execute, verify, and close one real code change outside the Open Scaffold repository itself.

## Constraints / Out of scope

- Do not use private work, client code, or internal operating-workshop material.
- Keep the example small enough that a reader can inspect it in minutes.
- Do not fake adoption; label owner-created examples honestly.
- Do not require external credentials or paid services.
- Do not expand Open Scaffold product code unless the example reveals a blocker that must be fixed first.

## Files to touch

- `docs/examples/downstream-proof.md` — walkthrough and link to the example repository or fixture.
- `examples/downstream-proof/` — optional in-repo minimal fixture if a separate public repo is not used.
- `README.md` — one link from proof/adoption section.
- `.osc/plans/backlog/` — follow-up plan only if the example exposes product gaps.

## Implementation Architecture Coverage

- Strengthens: adoption trust, recovery, and user-facing examples.
- Audit envelope: example repo URL or fixture path, plan slug, evidence path, PR/commit link, verification output.
- Evaluation envelope: reader can clone/run/inspect the example without private context.
- Feedback routing: example friction becomes concrete backlog, not hidden maintainer knowledge.
- Boundary: no fake third-party endorsement, no private data, no broad marketing launch.

## Acceptance criteria

- [ ] A downstream example exists either as a small public repository or a tracked fixture with a clear provenance note.
- [ ] The example includes a mission, one plan, one evidence note, and a clear before/after code change.
- [ ] The walkthrough shows the exact commands used and the resulting Open Scaffold artifacts.
- [ ] README links the example as proof of use outside the core repository.
- [ ] The example states whether it is owner-created, collaborator-created, or third-party.
- [ ] Any friction found during the example is either fixed in-scope or recorded as follow-up backlog.

## Verification steps

1. Clone or copy the example into a temp directory and run its documented verification command.
2. Verify all walkthrough links resolve.
3. Run a private-marker scan on the example docs and files.
4. Run `./verify.sh --strict` in the Open Scaffold repo.

## Open questions

- Should the canonical example be a tiny TypeScript API, Python CLI, or documentation-only repo?
- Should the example live inside `graphanov/open-scaffold` as a fixture or as a separate public demo repository?
