# Release / Evidence Note: executable Open Scaffold architecture

## Summary

Open Scaffold now has an accepted executable architecture direction: keep core as the source-of-truth/evidence/audit layer, and make execution real through explicit in-repo agentic runtime packages. The first target package is `packages/runtime-omx/`, aimed at OMX / oh-my-codex, with `$ralplan` as the first workflow to prove.

## Traceability

- Plan: `.osc/plans/done/046-executable-open-scaffold-architecture.md`
- Branch: `runtime/execute-046-omx-architecture`
- PR: this PR
- Kanban: `t_bfeec607`
- Primary docs: `docs/AGENTIC_RUNTIME_LAYER.md`, `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/SPAWNING_BOUNDARY.md`, `docs/RUNTIME_SELECTION.md`, `docs/RUNTIME_PROFILES.md`
- Wiki concepts: `docs/wiki/concepts/agent-runtime-selection.md`, `docs/wiki/concepts/agentic-orchestration.md`
- Backlog amendments: `.osc/plans/backlog/042-reference-adapter-package-no-spawn-amendment-1.md`, `.osc/plans/backlog/043-one-real-runtime-adapter-spike-amendment-1.md`

## Outcome

- Defined the agentic runtime layer as the executable boundary between Open Scaffold core and real runtime work.
- Set `packages/runtime-omx/` as the first runtime package naming pattern for future `packages/runtime-*` packages.
- Set OMX / oh-my-codex as the first runtime target and `$ralplan` as the first workflow to prove.
- Kept `osc run` package-first and core non-spawning by default.
- Preserved strict authority defaults: no secrets, hidden network dependence, destructive filesystem authority, commit, push, merge, release, package publish, or full runtime-support claim by default.
- Amended follow-up plans so 042 becomes the no-spawn `packages/runtime-omx/` package scaffold and 043 becomes the OMX-first / `$ralplan`-first real runtime spike.

## Verification

- `npm run build` → pass.
- `npm test` → 14 files / 129 tests passed.
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn.
- `npm run osc -- verify` → pass.
- `git diff --check` → pass.
- Boundary scan for unsupported runtime-certification wording or positive core-spawn claims → pass.

## Follow-up

- Execute `042-reference-adapter-package-no-spawn` as `packages/runtime-omx/` no-spawn validation/preview/receipt/evidence proof.
- Execute `043-one-real-runtime-adapter-spike` as the OMX-first, `$ralplan`-first real runtime spike after 042 proves the package boundary.
- Keep `044-cli-friction-reduction` after the execution proof unless CLI ceremony blocks the runtime-package path.
