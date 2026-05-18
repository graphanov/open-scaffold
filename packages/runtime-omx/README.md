# `@open-scaffold/runtime-omx`

`@open-scaffold/runtime-omx` is the first optional in-repo **agentic runtime package scaffold** for OMX / oh-my-codex.

It consumes Open Scaffold `open-scaffold.run.v1` packets created for the OMX `$ralplan` lane, validates the no-spawn handoff shape, and writes deterministic dispatch receipt/evidence artifacts.

It does **not** install, authenticate, launch, spawn, supervise, or certify OMX, Codex, tmux, or any provider runtime.

## What it proves

This package proves the structural boundary between Open Scaffold core and an agentic runtime package:

```text
Open Scaffold core creates run.json.
runtime-omx validates OMX $ralplan handoff shape.
runtime-omx writes receipt/evidence.
No runtime process is launched.
```

The package currently accepts only the first OMX proof lane:

- `runtimeSelection.runtime = "omx"`
- `runtimeSelection.workflow = "plan"`
- `executor.lane = "omx-codex"`
- `executor.harnessSkill = "$ralplan"`
- `executor.spawning = false`

Official OMX continuity note: upstream `oh-my-codex` exposes `$ralplan` as an in-Codex skill / `$plan --consensus` planning surface. This package records a preview of the future handoff shape; it does not call `omx`, `codex`, or any shell command.

## Usage

From a repository with an Open Scaffold run packet:

```bash
open-scaffold-runtime-omx .osc/runs/<run_id>/run.json
```

Optional receipt path, still restricted to the same run directory:

```bash
open-scaffold-runtime-omx .osc/runs/<run_id>/run.json \
  --out .osc/runs/<run_id>/dispatch-receipt.json
```

Outputs:

- `.osc/runs/<run_id>/dispatch-receipt.json`
- `.osc/runs/<run_id>/runtime-omx-evidence.md`

## Boundaries

This is a no-spawn scaffold only. It does not:

- launch OMX, Codex, tmux, shell automation, or external processes;
- read credentials or home-directory runtime configuration;
- require network access;
- mutate source files outside the designated run evidence artifacts;
- commit, push, merge, publish, or approve work;
- claim production/full/certified OMX support;
- support `$deep-interview`, `$ralph`, `$ultrawork`, `$ultragoal`, `$team`, or other OMX workflows.

Task correctness remains a separate postflight/evaluation question. A receipt only proves the package validated a handoff shape and wrote deterministic evidence.

## Verification

From the repository root:

```bash
npm run build:runtime-omx
npm run test:runtime-omx
```

Full Open Scaffold verification for slices that touch this package:

```bash
npm run build
npm test
./verify.sh --strict
npm run osc -- verify
git diff --check
```
