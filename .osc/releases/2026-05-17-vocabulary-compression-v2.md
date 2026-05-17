# Release / Evidence Note: vocabulary compression v2

## Summary

Open Scaffold first-touch and runtime docs now lead with plain-language explanations before protocol vocabulary. The slice keeps precise runtime terms where they are useful, but aliases them near first mention so new readers can follow the README, minimum path, workflow docs, and examples without learning the full ontology first.

## Traceability

- Plan: `.osc/plans/done/040-vocabulary-compression-v2.md`
- Branch: `docs/vocabulary-compression-v2`
- Kanban: `t_323cabd0`
- Primary docs: `README.md`, `docs/MINIMUM_VIABLE_SCAFFOLD.md`, `docs/WHY_OPEN_SCAFFOLD.md`, `docs/WORKFLOW.md`, `docs/RUNTIME_SELECTION.md`, `docs/RUNTIME_PROFILES.md`, `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/SPAWNING_BOUNDARY.md`, `docs/examples/`
- Audit artifacts: `/tmp/osc040_jargon_before.txt`, `/tmp/osc040_jargon_after.txt`, `/tmp/osc040_jargon_after_fix.txt`

## Vocabulary audit

First-touch scope: `README.md`, `docs/MINIMUM_VIABLE_SCAFFOLD.md`, `docs/WHY_OPEN_SCAFFOLD.md`, `docs/FAQ.md`, `docs/WORKFLOW.md`, and `docs/examples/**/*.md`.

| Term | Before (`origin/main`) | After | Delta | Rationale for remaining occurrences |
| --- | ---: | ---: | ---: | --- |
| `glass cockpit` | 2 | 1 | -1 | Remaining occurrence is an advanced/table label immediately translated as status/control-room events. |
| `operator surface` | 9 | 7 | -2 | Remaining occurrences are parenthetical aliases after `status/approval channel`, `chat/status channel`, or equivalent plain wording. |
| `runtime binding` | 3 | 3 | 0 | Remaining occurrences are in runtime-adapter contract contexts and are paired with `runtime adapter contract` or `external launch glue`. |
| `dispatch receipt` | 1 | 0 | -1 | Removed from first-touch docs; advanced docs use adapter/handoff proof wording where needed. |
| `harness skill` | 3 | 3 | 0 | Remaining occurrences are paired with `runtime command/mode`. |
| `slice close` | 1 | 0 | -1 | Removed from first-touch phrasing in favor of completion/closed-work wording. |
| `task bridge` | 1 | 1 | 0 | Remaining occurrence is a diagram alias after `task trackers/coordinators`. |
| `evaluation envelope` | 0 | 0 | 0 | No first-touch occurrence. |
| `audit envelope` | 0 | 0 | 0 | No first-touch occurrence. |
| `run packet` | 32 | 16 | -16 | Remaining occurrences are immediate aliases for ``run.json` work package` or schema/history context. |

README size: `10448` bytes on `origin/main` → `10360` bytes after this slice. The slice is comprehension-first, so README reduction is evidence, not a hard byte gate.

## Outcome

- README explains the optional runtime handoff as a `run.json` work package before using protocol language.
- Minimum viable scaffold docs keep beginner setup focused on mission, plan, verification, evidence, and optional run packages.
- Runtime docs preserve the boundary: Open Scaffold selects/packages/records evidence expectations; adapters/runtimes launch and execute outside core; humans approve merge/publish gates.
- Source-checkout fallback commands remain in README and minimum docs because first-run tests assert them.
- No schema fields, historical plans, runtime behavior, or compliance claims were changed.

## Verification

- Jargon before/after audit for first-touch docs → pass; recorded above.
- `wc -c README.md` → `10360 README.md`.
- Manual README → Quickstart read-through anchors → pass; npx path, source fallback, optional runtime package, and non-spawning boundary remain visible.
- `npm run build` → pass.
- `npm test` → 14 files / 124 tests passed.
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn before plan close.
- `npm run osc -- verify` → pass.
- `git diff --check` → pass.

## Follow-up

No immediate follow-up is required for this slice. Future docs simplification should be separate from runtime behavior, schema migrations, or launch/spawn implementation work.
