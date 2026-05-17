# Plan: 037-audit-envelope-digest-manifest

## Status

active

## Context

PR #39 established audit/evaluation envelopes as Open Scaffold core standards, and PR #40 shipped the first structure-only `osc eval` mechanics for evaluation envelopes. The next smallest implementation slice is to make audit envelopes reconstructable through deterministic artifact manifests and local digests, while preserving the boundary that Open Scaffold is not a compliance certifier, domain evaluator, runtime spawner, or external anchor provider.

## Goal

Add the smallest useful structure-only audit-envelope digest manifest surface so a user can record and check which local plan/run/evaluation/evidence artifacts existed for a slice and whether their content digests still match.

## Constraints / Out of scope

- Do not add automated domain correctness judgment, legal/compliance certification, or production audit sufficiency claims.
- Do not add model benchmarking, model/task-fit scoring, LLM-as-judge orchestration, or runtime spawning.
- Do not add Hedera/hashgraph, Sigstore, timestamping, notarization, external anchor adapters, or provider SDK integration in this slice.
- Do not make raw private/runtime logs public product truth; manifests should point to curated local/public evidence paths only.
- Keep the UX lightweight for solo developers and small teams: local generation/checking first, no server, no daemon, no credentials.
- Preserve runtime/adapters/human approval boundaries: the manifest proves artifact presence/digest consistency, not that the work was correct or approved.

## Files to touch

- `src/cli.ts` — expose audit-manifest generation/checking through the existing CLI if the implementation confirms the right command shape.
- `src/audit.ts` or a focused equivalent module — generate and validate `open-scaffold.audit-envelope.v1` / digest-manifest data.
- `src/evaluation.ts` — reuse evaluation envelope identity/path handling only if needed; avoid coupling audit checks to evaluation judgment.
- `tests/*audit*.test.ts` and/or CLI tests — cover manifest generation, digest checks, missing files, changed files, duplicate artifact IDs, unsupported paths, and boundary wording.
- `docs/SLICE_CLOSE_PROTOCOL.md` — clarify local audit manifest semantics if the CLI surface changes the protocol wording.
- `docs/wiki/concepts/implementation-architecture-lens.md` — update only if needed to reflect the structure-only manifest mechanic.
- `.osc/releases/<date>-audit-envelope-digest-manifest.md` — release/evidence note for the implementation slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Inspect current `osc eval`, run packet, and protocol code paths to choose the smallest audit-manifest command shape. | None | A |
| T2 | Add failing tests for manifest generation/checking and boundary cases. | T1 | B |
| T3 | Implement audit manifest generation/checking with deterministic local file digests. | T2 | C |
| T4 | Update only the minimal docs/release evidence needed to make the mechanic understandable. | T3 | D |
| T5 | Run verification, close the plan via `close.sh`, and prepare PR evidence without merging. | T3, T4 | E |

### Parallel groups

- **Group A**: T1 — discovery before implementation.
- **Group B**: T2 — tests define the structure-only behavior.
- **Group C**: T3 — implementation follows tests.
- **Group D**: T4 — docs/release wording follows the final command shape.
- **Group E**: T5 — verification and close after code/docs stabilize.

### Dependencies

- T2 depends on T1 so tests encode the chosen command shape instead of guessing.
- T3 depends on T2 to keep the slice test-driven.
- T4 depends on T3 so public wording matches actual behavior.
- T5 depends on T3/T4 so evidence reflects the final artifact set.

### Delegation notes

- This is small enough for one implementation worker. If delegated, keep a single branch/workspace and require local verification evidence before any PR.
- Do not split docs and code into separate PRs unless implementation expands beyond this plan's boundaries.

## Implementation Architecture Coverage

- Strengthens: audit trails, recovery/ownership, evaluation.
- Audit envelope: plan path, branch, generated manifest path, cited artifact paths, local digests, verification commands, PR/release evidence, and any evaluation-envelope path used for close/postflight.
- Evaluation envelope: acceptance criteria are checked by tests, CLI validation output, `verify.sh`, build/test commands, and manual boundary wording review; the manifest itself does not evaluate correctness.
- Feedback routing: failed digest checks route to re-run evidence generation, fix cited artifact paths, add missing curated evidence, or create a follow-up plan if external anchoring/audit mechanics are desired.
- Boundary: runtime enforcement, credentials, system-of-record permissions, compliance certification, legal audit sufficiency, model benchmarking, production rollback, external ledger/notary anchoring, and raw private/runtime log storage remain outside this slice.

## Acceptance criteria

- [ ] A documented CLI surface, likely `osc audit init` / `osc audit check` or equivalent, can generate and validate a local audit-envelope digest manifest for a plan/run/evaluation/evidence artifact set.
- [ ] The manifest records schema/version, subject identity, artifact IDs, artifact roles, relative paths, digest algorithm, digests, generated timestamp, and boundary/non-claim metadata.
- [ ] Validation detects missing files, changed digests, duplicate artifact IDs, malformed artifact entries, unsafe/out-of-repo paths where applicable, and missing required subject identity.
- [ ] Validation distinguishes artifact/digest integrity from acceptance correctness, compliance certification, approval, runtime execution, and external anchoring.
- [ ] Tests cover pass, missing artifact, changed artifact, duplicate ID, malformed manifest, unsafe path, and no-regression behavior for existing `osc eval` commands.
- [ ] Docs/CLI help use owner-neutral, public-safe wording and avoid unsupported compliance, audit-certification, model-benchmarking, runtime-spawning, or ledger-provider claims.
- [ ] Release evidence records verification, scope, non-goals, and follow-up work such as external anchor adapters only as future possibilities.

## Verification steps

1. Run `npm test`; expected exit 0.
2. Run `npm run build`; expected exit 0.
3. Run the new audit manifest init/check smoke commands; expected manifest generation and clean validation for curated local evidence.
4. Run `npm run --silent osc -- eval init .osc/plans/active/037-audit-envelope-digest-manifest.md`; expected existing eval flow still works.
5. Run `npm run osc -- verify`; expected exit 0 with no unexpected warnings.
6. Run `./verify.sh --standard`; expected exit 0.
7. Run `git diff --check`; expected no whitespace errors.
8. Manually inspect CLI/docs/release wording for unsupported claims about compliance, legal audit sufficiency, model benchmarking, runtime spawning, or external-ledger anchoring.

## Open questions

- Should the public command be `osc audit`, `osc evidence manifest`, or another name that avoids implying legal audit sufficiency?
- Should the first manifest be JSON-only, or should it also support Markdown release/evidence note summaries?
- Should manifest files live under `.osc/runs/<run_id>/audit-manifest.json`, `.osc/evidence/`, or a caller-provided path by default?
- Should JSON schema export be included here or kept as a later refinement after adopter evidence?
