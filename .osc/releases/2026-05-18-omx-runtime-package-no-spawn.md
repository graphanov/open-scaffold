# Release / Evidence Note: OMX runtime package no-spawn scaffold

## Summary

Adds `packages/runtime-omx/` as the first optional in-repo agentic runtime package boundary. It consumes Open Scaffold `run.json` packets for OMX `$ralplan`, validates no-spawn safety rules, and writes deterministic dispatch receipt/evidence artifacts.

This does not launch OMX/Codex and does not claim runtime support beyond the no-spawn `$ralplan` preview.

## Traceability

- Plan: `.osc/plans/done/042-reference-adapter-package-no-spawn.md`
- Amendment: `.osc/plans/done/042-reference-adapter-package-no-spawn-amendment-1.md`
- Branch: `runtime/omx-package-no-spawn`
- PR: `#50` — https://github.com/graphanov/open-scaffold/pull/50
- Kanban: `t_b8b143d3`
- Package: `packages/runtime-omx/`
- Runtime target: OMX / oh-my-codex
- Workflow proven: `$ralplan`
- Official continuity scout: `Yeachan-Heo/oh-my-codex` commit `ffef59333bccc0fc3175439f1c4892522412d29e`, package `oh-my-codex` `0.17.3`
- Sample package invocation: generated a local `run.json` package and ran `packages/runtime-omx/dist/cli.js` against it; forensic run artifacts remain gitignored under `.osc/runs/`.

## Outcome

- Created private package scaffold `@open-scaffold/runtime-omx` at `packages/runtime-omx/`.
- Added CLI surface `open-scaffold-runtime-omx <run.json> [--out <receipt>]`.
- Validates `open-scaffold.run.v1` run packets for:
  - `runtimeSelection.runtime=omx`
  - `runtimeSelection.workflow=plan`
  - `executor.lane=omx-codex`
  - `executor.harnessSkill=$ralplan`
  - `executor.spawning=false`
- Rejects missing fields, non-executable packages, blockers, blocking open questions, unsupported runtime/workflow/lane/skill, runtime process handles, unsafe output paths, and missing commit policy.
- Writes `open-scaffold.dispatch-receipt.v1` plus deterministic evidence under `.osc/runs/<run_id>/`.
- Records upstream continuity for official `oh-my-codex`, including `$ralplan` as the OMX/Codex planning proof and `$plan --consensus` canonical equivalent.
- Uses no runtime launch, shell spawning, network, credentials, commits, pushes, merges, publishes, or source mutation outside designated artifacts.
- Updates runtime docs/wiki to label the package as a no-spawn scaffold only.

## Verification

- `npm run build:runtime-omx` → pass.
- `npm run test:runtime-omx` → 4 files / 31 tests passed.
- `npm run build` → pass.
- `npm test` → 18 files / 160 tests passed.
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn.
- `npm run osc -- verify` → pass.
- `git diff --check` → pass.
- Sample package invocation against generated `run.json` → receipt/evidence created; `spawned=false`; `runtime_omx.adapter_spawned_runtime=false`; `network_required=false`; `credentials_required=false`; `tmux_used=false`; `source_mutation=false`.
- Root `npm pack --dry-run --json --ignore-scripts` → no `packages/` entries shipped by root package.
- Runtime package `npm pack --dry-run --json --ignore-scripts` → package contains `README.md`, `dist/*`, and `package.json` only.
- Source scan for spawn/network/credential APIs → pass via `packages/runtime-omx/tests/no-spawn-boundary.test.ts`.

## Follow-up

- 043 remains the OMX-first, `$ralplan`-first real-runtime spike with explicit opt-in launch only after this no-spawn boundary is proven.
- Later OMX workflows such as `$deep-interview`, `$ralph`, `$ultrawork`, `$ultragoal`, and team modes remain out of scope until adapter evidence exists.
