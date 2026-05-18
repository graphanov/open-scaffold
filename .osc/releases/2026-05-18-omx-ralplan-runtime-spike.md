# Release / Evidence Note: OMX $ralplan explicit runtime launch gate

## Summary

Extends `packages/runtime-omx/` from a no-spawn receipt/evidence scaffold into the first explicit OMX `$ralplan` launch gate for Open Scaffold run packets.

Default package behavior still writes receipt/evidence without spawning. Real OMX launch now requires `--allow-spawn`, a safe non-main branch, a present worktree path, actual branch matching the packet branch, `oh-my-codex >= 0.17.3`, and Codex `--sandbox read-only`.

This does not make Open Scaffold core spawn runtimes and does not claim full OMX support beyond the `$ralplan` path.

## Traceability

- Plan: `.osc/plans/done/043-one-real-runtime-adapter-spike.md`
- Amendment: `.osc/plans/done/043-one-real-runtime-adapter-spike-amendment-1.md`
- Branch: `runtime/omx-ralplan-adapter-spike`
- PR: `#51` — https://github.com/graphanov/open-scaffold/pull/51
- Kanban: `t_15d93ad5`
- Package: `packages/runtime-omx/`
- Runtime target: OMX / oh-my-codex
- Workflow proven: `$ralplan`
- Run packet: `.osc/runs/20260518T112157Z-043-one-real-runtime-adapter-spike-run/run.json`
- Dispatch receipt: `.osc/runs/20260518T112157Z-043-one-real-runtime-adapter-spike-run/dispatch-receipt.json`
- Runtime evidence: `.osc/runs/20260518T112157Z-043-one-real-runtime-adapter-spike-run/runtime-omx-evidence.md`
- Runtime log: `.osc/runs/20260518T112157Z-043-one-real-runtime-adapter-spike-run/runtime-omx.log`

## Outcome

- Added `runOmxRalplan()` as the explicit launch-aware package entrypoint while keeping `runNoSpawnOmx()` as the default no-spawn path.
- Added CLI flags:
  - `--allow-spawn` for explicit launch;
  - `--omx-command <path>` for testable/runtime-specific command selection;
  - `--out <dispatch-receipt.json>` for same-run-directory receipt output.
- Launch path checks:
  - packet remains `runtimeSelection.runtime=omx`, `runtimeSelection.workflow=plan`, `executor.lane=omx-codex`, `executor.harnessSkill=$ralplan`, `executor.spawning=false`;
  - branch cannot be `main`/`master`/`trunk`/production-like;
  - worktree path must exist;
  - actual git branch must match `runtime.branch`;
  - `omx --version` must parse as `oh-my-codex >= 0.17.3`;
  - command uses Codex `--sandbox read-only`.
- Receipts now record `dry_run`, `completed`, `refused`, or `failed` status, runtime version, redacted command, exit status/signal, failure code/message, log path, and no commit/push/merge/publish authority.
- Updated runtime docs/wiki pages to describe the explicit package gate without promoting core spawning.

## Verification

- `omx update` upgraded local `oh-my-codex` to `v0.17.3`.
- `omx --version` → `oh-my-codex v0.17.3`.
- `codex --version` → `codex-cli 0.130.0`.
- `npm run build:runtime-omx` → pass.
- `npm run test:runtime-omx` → 5 files / 41 tests passed.
- `npm run build` → pass.
- `npm test` → 19 files / 170 tests passed.
- Run packet generated through `npm run osc -- run .osc/plans/active/043-one-real-runtime-adapter-spike.md --runtime omx --workflow plan --repo . --worktree . --branch runtime/omx-ralplan-adapter-spike --operator-surface cli --task-id t_15d93ad5 --commit-policy 'no commit/push/merge/publish; human approval required'`.
- Default package invocation wrote no-spawn receipt/evidence.
- Explicit package invocation `node packages/runtime-omx/dist/cli.js <run.json> --allow-spawn` completed with `status=completed`, `spawned=true`, `oh-my-codex v0.17.3`, log path recorded, and no receipt failure.
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn after PR URL patch.
- `npm run osc -- verify` → pass after PR URL patch.
- `git diff --check` → pass.

## Follow-up

- Later OMX workflows such as `$deep-interview`, `$ralph`, `$ultrawork`, `$ultragoal`, and team modes remain out of scope until separate plans prove them.
- Runtime package publication remains separate from this private in-repo package slice.
