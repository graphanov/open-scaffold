# Plan: 046-executable-open-scaffold-architecture

## Status

active

## Context

The owner explicitly wants Open Scaffold to become executable while preserving its source-of-truth, evidence, and audit strengths. The preferred first runtime target is OMX / oh-my-codex because the owner has used it and likes the workflow kit, including `$deep-interview`, `$ralplan`, `$ralph`, and `$ultrawork`. The execution layer should start in-repo under a properly documented, separate agentic runtime package boundary, using `packages/runtime-omx/` as the naming convention for the first runtime target and future runtimes.

## Goal

Define the first executable Open Scaffold architecture: an in-repo, separated, opt-in agentic runtime layer under `packages/runtime-omx/` that targets OMX first while preserving core run packets, receipts, evidence, human gates, and no silent commit/push/merge/publish authority.

## Constraints / Out of scope

- Do not implement runtime launching in this architecture slice.
- Do not turn `osc run` into a hidden default spawner.
- Do not claim full OMX or oh-my-codex support until a real adapter proves it.
- Do not add credential handling, daemon behavior, process supervision, network registries, marketplace behavior, or model benchmarking.
- Do not grant commit, push, merge, release, package-publish, or destructive filesystem authority by default.
- Do not edit `MISSION.md` or `ROADMAP.md` as product truth until this architecture decision is accepted.

## Files to touch

- `docs/RUNTIME_BINDING_CONTRACT.md` — define the executable-layer ownership model in plain language.
- `docs/SPAWNING_BOUNDARY.md` — clarify opt-in execution without weakening the source-of-truth/audit boundary.
- `docs/RUNTIME_SELECTION.md` — show how OMX becomes the first target lane without making runtime choice an init-time product promise.
- `docs/RUNTIME_PROFILES.md` — document how profile data maps to an adapter/executor package boundary.
- `docs/wiki/concepts/agent-runtime-selection.md` and/or `docs/wiki/concepts/agentic-orchestration.md` — update the contested hypothesis with the accepted owner direction.
- `.osc/plans/backlog/042-reference-adapter-package-no-spawn.md` — do not edit in place; prepare an amendment or successor plan only if the accepted architecture changes its scope.
- `.osc/plans/backlog/043-one-real-runtime-adapter-spike.md` — do not edit in place; prepare an amendment or successor plan only if OMX-first details need to be fixed before implementation.
- `.osc/releases/` — add evidence note if this lands as a public architecture PR.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Inspect current runtime docs, 041 contract output, and backlog 030/031/042/043/044 | None | A |
| T2 | Define the layer model: core package, `packages/runtime-omx/` agentic runtime package, evidence return, human gate | T1 | B |
| T3 | Define command semantics: `osc run` packages by default; execution is explicit, dry-run first, `$ralplan` first, and OMX-targeted | T2 | C |
| T4 | Define authority defaults: no secrets, no push/merge/publish, disposable workspace/branch expectations, log/evidence redaction | T2 | C |
| T5 | Patch runtime docs/wiki with owner-approved OMX-first execution direction while preserving contested/future claims | T3, T4 | D |
| T6 | Decide backlog impact: whether 042 is amended, superseded, or executed as the in-repo `packages/runtime-omx/` no-spawn agentic runtime package; whether 043 becomes OMX-first with `$ralplan` as the first real workflow | T5 | D |
| T7 | Add architecture evidence note and run full verification | T5, T6 | E |

### Parallel groups

- **Group A**: T1 — read-only reconciliation of current truth.
- **Group B**: T2 — architecture decision drafting; wait for T1.
- **Group C**: T3, T4 — command semantics and authority model can be drafted together after T2.
- **Group D**: T5, T6 — docs/wiki and backlog-impact work can proceed together after T3/T4.
- **Group E**: T7 — final evidence and verification; wait for T5/T6.

### Dependencies

- T2 depends on T1 so the architecture is grounded in shipped repo truth, not fresh speculation.
- T5 depends on T3/T4 so public wording reflects actual command and authority decisions.
- T6 depends on T5 so backlog changes follow the accepted architecture, not the other way around.

### Delegation notes

- Use one architecture reviewer to challenge whether the layer model preserves evidence/audit value.
- Use one implementation reviewer to estimate the first in-repo `packages/runtime-omx/` agentic runtime package shape and whether OMX-first / `$ralplan`-first is feasible.
- Hermes owns final synthesis and owner-facing backlog recommendation.

## Implementation Architecture Coverage

- Strengthens: workflow design, authority, audit trails, evidence return, runtime boundaries, recovery/ownership, adoption trust.
- Audit envelope: architecture PR, decision evidence note, affected runtime docs/wiki pages, and explicit backlog-impact notes for 042/043/044.
- Evaluation envelope: acceptance criteria are checked by doc review, grep/boundary checks, `./verify.sh --strict`, `npm test`, `npm run build`, and owner review of the architecture decision.
- Feedback routing: if execution risk is too high, route to 042 no-spawn executor only; if OMX proof is accepted, route to 043 OMX-first runtime adapter spike; if CLI ceremony becomes blocker after proof, route to 044.
- Boundary: actual runtime launching, credential handling, native runtime ownership, model/task recommendations, marketplace behavior, and package publishing remain outside this slice.

## Acceptance criteria

- [ ] A public-safe architecture decision explains that Open Scaffold should become executable through an explicit in-repo agentic runtime layer, not hidden default spawning in core.
- [ ] OMX / oh-my-codex is named as the first intended runtime target, with `$deep-interview`, `$ralplan`, `$ralph`, `$ultrawork`, and related OMX kit framed as eventual support goals rather than current support claims.
- [ ] `packages/runtime-omx/` is named as the preferred first package boundary and naming convention for future runtime packages.
- [ ] `$ralplan` is named as the first workflow to prove before expanding to `$deep-interview`, `$ralph`, `$ultrawork`, and the rest of the OMX kit.
- [ ] Command semantics are clear: core packaging remains default; dry-run/preview is the first execution mode; real launch requires explicit opt-in.
- [ ] Authority defaults are explicit: no silent secrets, no commit/push/merge/publish, no destructive filesystem authority, evidence/logs returned to the run/evidence chain.
- [ ] Backlog impact is explicit: 042 becomes or feeds the in-repo `packages/runtime-omx/` no-spawn agentic runtime package, 043 becomes the OMX-first / `$ralplan`-first real runtime spike, 044 remains after execution proof unless friction blocks adoption.
- [ ] Public wording preserves Open Scaffold's source-of-truth/evidence/audit advantage and avoids unsupported claims of certified runtime support.
- [ ] `npm run build`, `npm test`, `./verify.sh --strict`, and `git diff --check` pass.

## Verification steps

1. Run `git diff --check`; pass if no whitespace errors are present.
2. Run a boundary scan on changed docs for unsupported runtime-certification wording or positive core-spawn claims; pass if no new unsupported claims are present.
3. Run `npm run build`; pass if TypeScript builds cleanly.
4. Run `npm test`; pass if the existing test suite remains green.
5. Run `./verify.sh --strict`; pass if the scaffold compliance gate exits cleanly with no failures or warnings.
6. Owner review: pass only if the owner agrees that the architecture is executable enough to move toward OMX while still preserving evidence/audit strength.

## Open questions

- Should the first implementation slice after this be a no-spawn `packages/runtime-omx/` package scaffold, or should it jump directly to an OMX `$ralplan` dry-run command renderer?
- What is the minimum acceptable first proof of “actually do work”: command preview, dry-run receipt, real OMX launch in a disposable workspace, file edits without commit, or verification-only execution?
