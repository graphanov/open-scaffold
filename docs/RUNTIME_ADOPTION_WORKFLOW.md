# Runtime Adoption Workflow Target

Open Scaffold's post-v1 target is a workflow that feels executable without turning core into an autonomous agent runtime.

The north-star command is intentionally simple:

```bash
osc work "Add a /health endpoint with tests" --runtime codex
```

The current implemented composition layer is explicitly dry-run only:

```bash
osc work "Add a /health endpoint with tests" --runtime codex --dry-run
```

The north-star command does **not** mean Open Scaffold core becomes Codex, Claude Code, OpenHands, a daemon, or a hosted agent. It means Open Scaffold should own the durable control loop around work: plan, package, dispatch, evidence, verification, and approval gates.

## 2026-05-28 controller verdict

The strategic verdict is blunt: **yes to an automation layer, no to a native core runtime now**. Open Scaffold should eventually own a safe `osc work` run-lifecycle controller, not a provider-specific agent brain.

The adoption problem is command choreography. Users should describe work once and see Open Scaffold drive the boring record-keeping loop: plan/package/run/receipt/evidence/verification/human gates. Adapters still own the risky parts: worker execution, provider authentication, process spawning, sandbox translation, runtime sessions, and provider-local logs.

Future non-dry-run `osc work` therefore means:

```text
core controller: plan -> run packet -> adapter gate -> receipt/evidence -> verification -> postflight
adapter:        translate authority -> execute worker -> return structured manifest
human:          approve real spawn, secrets/network, retries, close, commit, push, PR, merge, publish, release, deploy
```

Do not describe this as Open Scaffold becoming Codex, Claude Code, OpenHands, OMX, a daemon, or a hosted coordinator. The durable product phrase is **Executable Work Record**: executable enough to reduce adoption friction, still repo-native enough that the run can be reconstructed without private chat or runtime memory.

## Future MVP: `osc work` run-lifecycle controller

The next execution step is backlog plan `119-osc-work-execute-controller`: a controller for an executable plan or confirmed work package. It should:

1. Validate the plan/package and stop on unresolved scope or missing verification.
2. Create `.osc/runs/<run_id>/run.json`.
3. Record selected adapter, authority, and human-gate decisions.
4. Invoke only a reviewed explicit adapter after security gates pass.
5. Capture bounded logs, `dispatch-receipt.json`, `adapter-output-manifest.json`, and evidence under the run directory.
6. Run declared verification commands.
7. Write a postflight summary.
8. Stop before commit, push, PR creation, merge, publish, release, deploy, or external-production action unless a human approves that separate gate.

### Trigger model

Allowed automatic triggers are local and run-bound: dry-run preview, explicit operator command, plan validation, run packet creation, receipt/evidence collection, and declared verification commands.

Human approval remains required for vague-intent-to-plan conversion, real runtime spawn, write access beyond declared scope, network access, credential access, retries after failure, amendments, close decisions, commits, pushes, PRs, merges, publishes, releases, deployments, and any external-production action. GitHub comments, schedules, dashboards, or chat events may begin as read-only suggestion triggers, not write-capable execution triggers.

### Run-bound state

Future controller state belongs under `.osc/runs/<run_id>/`:

```text
run.json
automation.json
automation-events.jsonl
dispatch-receipt.json
adapter-output-manifest.json
dispatch/*.log
evidence/*
```

`automation.json` records lifecycle status, selected adapter, granted authority, gate decisions, receipt/log/evidence paths, verification result, blocker/failure code, and question/approval IDs. It must not store secrets, credentials, raw runtime transcripts, provider-local state, hidden session memory, or unbounded logs. Retries create new `run_id`s until a separate decision proves safer sub-attempt semantics.

### Adapter security floor

A future executable adapter path must document and test: deny-by-default environment allowlist, no secrets by default, adapter timeout/kill behavior, bounded log capture, structured adapter output manifest, path containment, no symlink escape, isolated worktree/branch for write-capable runs, explicit network/credential gates, portable failure codes, and human gates for commit/push/PR/merge/publish/release/deploy.

Dispatch receipts remain handoff proof, not correctness proof. Verification and human approval decide whether work is acceptable.

## Target flow

A good future `osc work` flow should:

1. Draft or locate a plan for the requested work.
2. Ask the operator to confirm scope, acceptance criteria, and risk before execution.
3. Create an `open-scaffold.run.v1` run packet.
4. Dispatch the run packet to an explicitly selected adapter.
5. Capture a dispatch receipt, logs, and adapter evidence under `.osc/runs/RUN_ID/`.
6. Run the scaffold and project verification commands.
7. Ask before commit, push, PR creation, merge, publish, or any other live side effect.
8. Promote durable results into evidence notes, PR bodies, release notes, amendments, or next plans.

The intended user experience is:

```text
User: osc work "Add a /health endpoint with tests" --runtime codex
Open Scaffold: I drafted plan 101. These are the acceptance criteria. Proceed?
User: yes
Open Scaffold: run packet created; dispatching through the selected Codex adapter.
Open Scaffold: receipt and evidence captured; verification passed.
Open Scaffold: open a PR? commit first? amend scope? stop here?
```

## Product boundary

Open Scaffold core should stay the durable record and policy layer:

```text
Open Scaffold core   = mission + plan + run packet + evidence expectations + verification + gates
Runtime adapter      = translate/dispatch to a selected runtime and return receipt/evidence
Runtime harness      = Codex/OMX/Claude/OpenHands/etc. execution while alive
Human/operator       = approve, reject, redirect, commit, push, PR, merge, publish
```

Core must not silently spawn or supervise provider-specific agents. Runtime execution is always either:

- a paste-ready handoff the operator runs in their chosen agent;
- a separately installed adapter package invoked explicitly; or
- a future gated execution mode approved through a dedicated architecture/security decision.

## Codex-first adapter direction

The post-v1 implementation chain is Codex-first.

That means the next runtime-adoption work should prioritize Codex and OMX / oh-my-codex paths before a Claude Code-specific adapter.

Current truth:

- `osc run` can create `run.json` packets with `--runtime codex` or `--runtime omx`, `--workflow plan`, `--executor omx-codex`, and `--harness-skill '$ralplan'`.
- `--runtime codex` is the broad user-facing Codex preset; `--runtime omx` remains the explicit harness-name preset. Both currently target the same `runtime-omx` adapter path.
- `packages/runtime-omx/` exists as the first optional runtime package proof.
- `@open-scaffold/runtime-omx` validates Codex/OMX `$ralplan` run packets and writes dispatch receipts/evidence by default without spawning.
- `@open-scaffold/runtime-omx --allow-spawn` has an explicit opt-in launch path guarded by branch, worktree, version, path, and read-only Codex sandbox checks.
- The package is still experimental/private and does not make Open Scaffold core a runtime.

The next adapter work should therefore harden the Codex path rather than starting a Claude Code adapter by default. The naming decision for the current package-hardening slice is:

- Use `--runtime codex` for broad-user docs and future `osc work ... --runtime codex` examples.
- Keep `--runtime omx` for operators who intentionally target the OMX harness by name.
- Keep `@open-scaffold/runtime-omx` as the current adapter package because OMX / oh-my-codex is the tested Codex harness path.
- Defer a separate `@open-scaffold/runtime-codex` package until direct Codex adapter evidence shows a cleaner path that can share the same dispatch receipt contract.

In either case, core stays runtime-neutral and adapter-owned launch stays explicit.

## Staged implementation chain

Do this in stages. Do not jump straight to a native runtime.

### Stage 0 — Safety and clarity

Fix immediate trust issues and make the target workflow public:

- patch the known `verify.sh --strict` filename quoting issue;
- document this target flow;
- make the README and roadmap say what is implemented today versus what is future;
- keep runner automation paused for product PRs until this direction is explicit.

### Stage 1 — `osc start` no-spawn agent entry

Current repo support begins with:

```bash
osc start .osc/plans/active/my-task.md --runtime codex
```

or:

```bash
osc start my-task --runtime codex
```

It prints a paste-ready agent prompt with:

- plan path;
- goal;
- acceptance criteria;
- verification commands;
- evidence expectations;
- authority boundaries;
- post-work instructions.

It does not create a process, mutate source files, commit, push, or create a PR. It also does not require Codex, OMX, network access, or runtime credentials to be installed because it only renders text.

### Stage 2 — Codex adapter package hardening

Make the Codex adapter path credible:

- validate the existing `runtime-omx` launch and no-spawn behavior against fresh fixtures;
- keep `runtime-omx` as the current adapter package while adding `codex` as the broad user-facing preset;
- defer a direct `runtime-codex` package until separate source-grounded evidence justifies it;
- keep receipts/evidence compatible with `open-scaffold.dispatch-receipt.v1`;
- document safety boundaries;
- publish only after safety review and owner approval.

### Stage 3 — `osc dispatch` adapter glue

Current repo support adds:

```bash
osc dispatch .osc/runs/RUN_ID/run.json --adapter omx
```

`--adapter` resolves a reviewed project-local adapter config at `.osc/adapters/<adapter-id>.json`, for example:

```json
{
  "schemaVersion": "open-scaffold.adapter.v1",
  "id": "omx",
  "command": ["open-scaffold-runtime-omx"],
  "envAllowlist": ["PATH"],
  "env": {
    "OPEN_SCAFFOLD_ADAPTER": "omx"
  },
  "timeoutMs": 600000,
  "maxStdoutBytes": 2000000,
  "maxStderrBytes": 2000000
}
```

The command:

- requires an existing `open-scaffold.run.v1` packet under `.osc/runs/`;
- invokes only the explicitly selected local adapter command;
- refuses missing, unknown, unsafe, URL-based, shell-wrapper, platform-shim, network-fetching, auto-installing, or wildcard-env adapter commands by default;
- passes a restricted adapter environment by default from adapter `envAllowlist` plus explicit adapter `env` values;
- validates adapter env key names and rejects adapter-provided env values with unsupported control characters before spawning;
- supports `--allow-full-env` only as an unsafe local override and reports a warning without printing environment values;
- refuses `--allow-full-env` in CI unless `OPEN_SCAFFOLD_ALLOW_FULL_ENV_IN_CI=1` is set;
- enforces adapter timeout with a hard kill plus bounded stdout/stderr logs under `.osc/runs/RUN_ID/dispatch/` with truncation markers;
- keeps adapter process buffering bounded by the combined policy cap while decoupling it from the smaller retained-log limits;
- caps adapter-configured timeouts at 30 minutes and stdout/stderr byte limits at 10 MB each;
- reads adapter-reported receipt/evidence paths only when they remain under the run directory and appear on complete retained output lines;
- prints environment key names, timeout/log-bound facts, and the next verification and human-approval step.

`osc dispatch` is adapter invocation glue, not a hidden provider runtime. Core does not import provider SDKs, auto-install adapters, own credentials, supervise tmux/processes, or grant commit/push/PR/merge/publish authority. Adapter packages own their launch policy and must return receipts/evidence that the operator can inspect. Dispatch hardening is structural safety posture; it does not prove runtime correctness or compliance.

### Stage 4 — `osc work --dry-run`

Current repo support adds the first no-spawn composition:

```bash
osc work "Add a /health endpoint with tests" --runtime codex --dry-run
```

It previews:

- a candidate plan path and draft scope;
- draft acceptance criteria and verification checks;
- an `open-scaffold.run.v1` run packet preview;
- the next `osc start`, `osc run`, and `osc dispatch` commands the operator can approve.

It stops before writing `.osc/plans` or `.osc/runs` artifacts, before runtime execution, before provider API calls, and before any commit/push/PR/merge/publish/deploy side effect. Non-dry-run `osc work` remains intentionally refused until a separate safety design exists.

### Stage 5 — Optional gated execution

Only after Stages 0-4 have real evidence, consider:

```bash
osc work "Add a /health endpoint with tests" --runtime codex --execute --allow-spawn
```

This requires a separate decision record and security design:

- typed authority budget;
- environment allowlist / secret scrubbing;
- per-run worktree isolation;
- explicit approval queue;
- resource/time limits;
- kill switch;
- receipt/evidence chain;
- clear commit/push/PR/merge/publish gates.

## What not to do

- Do not add a default-on `osc spawn` to core.
- Do not make Claude Code the next default adapter if the product direction is Codex-first.
- Do not claim Open Scaffold executes work today when it only packages handoffs.
- Do not auto-install runtime packages from a registry.
- Do not treat dispatch receipts as proof that task implementation is correct.
- Do not market compliance certification; Open Scaffold provides evidence substrate, not legal certification.

## Success criteria for the chain

The chain is succeeding when a new user can answer, without private context:

1. What does Open Scaffold record?
2. What does my agent/runtime do?
3. What command starts from a natural-language task?
4. Where do receipts and evidence land?
5. What needs human approval?
6. How do I resume or review the work later?

Until then, optimize for a clearer work loop before adding more experimental surfaces.
