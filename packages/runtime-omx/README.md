# `@open-scaffold/runtime-omx`

`@open-scaffold/runtime-omx` is the first optional in-repo **agentic runtime package** for OMX / oh-my-codex.

It consumes Open Scaffold `open-scaffold.run.v1` packets created for the OMX `$ralplan` lane, validates the handoff shape, writes deterministic dispatch receipt/evidence artifacts, and can launch OMX only when explicitly allowed.

Default behavior does **not** install, authenticate, launch, spawn, supervise, or certify OMX, Codex, tmux, or any provider runtime.

## What it proves

This package proves the structural boundary between Open Scaffold core and an agentic runtime package:

```text
Open Scaffold core creates run.json.
runtime-omx validates OMX $ralplan handoff shape.
runtime-omx writes receipt/evidence by default without launching.
runtime-omx may launch OMX only with --allow-spawn after safety checks.
Receipts/evidence return to the repo-local run directory.
```

The package currently accepts only the first OMX proof lane:

- `runtimeSelection.runtime = "omx"`
- `runtimeSelection.workflow = "plan"`
- `executor.lane = "omx-codex"`
- `executor.harnessSkill = "$ralplan"`
- `executor.spawning = false`

Official OMX continuity note: upstream `oh-my-codex` exposes `$ralplan` as an in-Codex skill / `$plan --consensus` planning surface. This package targets `oh-my-codex >= 0.17.3`.

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

Evolution-ledger hint for a no-spawn attempt:

```bash
open-scaffold-runtime-omx .osc/runs/<run_id>/run.json \
  --evolution-loop .osc/evolution/<loop_id> \
  --decision retry \
  --score 0.42 \
  --rationale "No-spawn runtime-omx preview captured adapter output."
```

This prints a copy/paste-ready `cd <repo-root> && osc evolve record ... --receipt ... --evidence ...` command that records the dispatch receipt, adapter evidence, and optional log into the loop from one consistent path base. It does not mutate `.osc/evolution/` itself; the operator must run the printed command explicitly.

Explicit OMX launch:

```bash
open-scaffold-runtime-omx .osc/runs/<run_id>/run.json --allow-spawn
```

Launch safety checks:

- `--allow-spawn` must be present;
- `--omx-command` is a trusted-operator override for local/manual use only; do not populate it from untrusted files, remote input, or generated run-packet content;
- `omx --version` must report `oh-my-codex >= 0.17.3`;
- `runtime.branch` must be a non-main disposable branch such as `runtime/<slug>`;
- `runtime.worktreePath` must exist and resolve inside `runtime.repoPath`;
- the generated command requests Codex `--sandbox read-only`;
- receipts/logs/evidence stay under `.osc/runs/<run_id>/`;
- commit, push, merge, publish, credential-management, destructive filesystem authority, tmux management, and runtime certification stay out of scope.

Outputs:

- `.osc/runs/<run_id>/dispatch-receipt.json`
- `.osc/runs/<run_id>/runtime-omx-evidence.md`
- `.osc/runs/<run_id>/runtime-omx.log` when a launch is attempted

## Boundaries

This package does not:

- launch OMX unless `--allow-spawn` is provided;
- run through Open Scaffold core or make `osc run` spawn anything;
- mutate `.osc/evolution/` by default; `--evolution-loop` only prints an explicit `osc evolve record` command;
- read credentials or home-directory runtime configuration itself;
- require network access in the adapter code;
- mutate source files outside the designated run evidence artifacts;
- commit, push, merge, publish, or approve work;
- claim runtime support beyond the explicit `$ralplan` path;
- support `$deep-interview`, `$ralph`, `$ultrawork`, `$ultragoal`, `$team`, or other OMX workflows.

Task correctness remains a separate postflight/evaluation question. A receipt proves only package validation, optional launch attempt status, and evidence/log writing.

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
