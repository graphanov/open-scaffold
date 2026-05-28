# Runtime control loop, not native runtime

Date: 2026-05-28
Status: accepted direction; implementation deferred to `.osc/plans/backlog/119-osc-work-execute-controller.md`

## Verdict

Yes to an Open Scaffold automation layer. No to a native autonomous runtime in core now.

Open Scaffold should own a safe `osc work` run-lifecycle control loop: plan/package/run records, gates, receipts, evidence, verification wiring, and postflight decisions. Adapters should own worker execution, provider authentication, process spawning, sandbox translation, and runtime-local sessions.

Bluntly: core should own the control loop, not the brain.

## Adoption problem

The current protocol is credible but too manual for normal adoption. A user should not have to understand when to call `osc plan`, `osc run`, `osc dispatch`, `osc evidence`, `osc verify`, and `osc close` before they feel value.

The product needs this flow:

```text
Describe work once.
Open Scaffold drafts or locates scope.
Open Scaffold creates the run packet.
Open Scaffold dispatches through an explicit adapter.
Open Scaffold captures receipt and evidence.
Open Scaffold runs verification.
Open Scaffold stops at human gates.
```

Without that loop, runtime neutrality can read as "this does not execute anything." With the wrong loop, Open Scaffold becomes an unsafe hidden agent runner. Both outcomes are bad.

## Product shape

Keep the product noun as `osc work`. Do not add a second flagship noun such as `osc automate` yet.

Future gated form:

```bash
osc work "Add a /health endpoint with tests" --runtime codex --execute --allow-spawn
```

The command should mean "execute this approved work record through an explicit adapter," not "Open Scaffold core is now Codex/Claude/OpenHands."

Core responsibilities:

- plan discovery or plan drafting with confirmation;
- run packet creation;
- run-bound lifecycle state;
- adapter selection and authority summary;
- receipt/evidence ingestion;
- verification command execution;
- postflight summary;
- human gates.

Adapter responsibilities:

- runtime-specific worker execution;
- provider auth and credential policy;
- process spawning and cancellation mechanics;
- sandbox and permission translation;
- runtime session state;
- structured adapter output manifest.

## Architecture options

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Keep no automation | Smallest security surface; preserves pure protocol | Adoption remains homework; users chain commands manually | Reject as long-term posture |
| Thin `osc automate` command | Clear automation verb | More vocabulary; implies a separate product | Do not lead with it |
| `osc work` run-lifecycle controller | One user-facing command; preserves repo-native state and gates | Requires careful security contract and adapter discipline | Choose |
| Local supervisor daemon | Better live status, cancellation, and resume | Process lifecycle, update, watchdog, and credential burden | Defer; not MVP |
| Official adapter packages | Runtime-specific code stays outside core; conformance can be tested | Requires package governance and security review | Use as execution boundary |
| Hosted coordinator | Smoothest team UX | Privacy, billing, auth, and lock-in risks | Defer strongly |
| Full native runtime in core | Maximum control | Huge scope; violates runtime-neutral thesis; high security burden | Reject now |

## MVP run-lifecycle controller

The smallest credible MVP is an execution controller for an existing executable plan or confirmed `osc work` package.

1. Validate plan quality and acceptance criteria.
2. Create `.osc/runs/<run_id>/run.json`.
3. Record explicit adapter, authority, and human gate decisions.
4. Invoke a reviewed local adapter only after security gates pass.
5. Capture bounded logs, dispatch receipt, structured adapter output manifest, and evidence paths.
6. Run declared verification commands.
7. Write postflight summary and stop state.
8. Stop before commit, push, PR creation, merge, publish, release, or deploy unless a human explicitly approves that separate gate.

Non-goals for MVP:

- no vague autonomous planning after dispatch;
- no daemon;
- no scheduled execution;
- no hidden provider SDK;
- no adapter auto-install;
- no default network or secrets;
- no automatic retry loop;
- no automatic external-production side effects.

## Trigger model

Allowed automatic triggers:

- `osc work --dry-run` preview;
- explicit local operator command;
- plan validation;
- run packet creation;
- receipt/evidence collection;
- verification commands declared by the plan or confirmed package.

Human approval remains required for:

- converting vague intent into a real executable plan;
- real runtime spawn;
- write access beyond the declared worktree/path scope;
- network access;
- credential access;
- retries after failure;
- amendments;
- close decisions;
- commit, push, PR creation, merge, publish, release, deploy, or any external-production side effect.

GitHub comments, scheduled jobs, dashboards, or chat commands may begin as read-only suggestion triggers. They must not become write-capable execution triggers without separate authority and audit design.

## Run-bound state model

Primary state stays under the run directory:

```text
.osc/runs/<run_id>/run.json
.osc/runs/<run_id>/automation.json
.osc/runs/<run_id>/automation-events.jsonl
.osc/runs/<run_id>/dispatch-receipt.json
.osc/runs/<run_id>/adapter-output-manifest.json
.osc/runs/<run_id>/dispatch/*.log
.osc/runs/<run_id>/evidence/*
```

`automation.json` records lifecycle facts, not runtime memory:

- lifecycle status;
- selected adapter;
- granted authority;
- human gates and approval IDs;
- receipt/log/evidence paths;
- verification result;
- blocker or failure code;
- question IDs.

It must not store secrets, credentials, raw runtime transcripts, provider-local state, hidden session memory, or unbounded logs.

Retries create new `run_id`s until a later ADR proves safer sub-attempt semantics. Operator surfaces mirror run state; they do not become canonical state.

## Adapter model

Adapters are replaceable. Codex/OMX can be the first proof, but the contract must also fit Claude Code, OpenHands, shell, human/manual, and future workers.

Minimum adapter contract:

- consume `open-scaffold.run.v1`;
- validate package quality and supported lane/workflow;
- translate Open Scaffold authority vocabulary into runtime-specific permissions;
- use only allowlisted environment variables;
- enforce adapter timeout and kill behavior;
- write bounded logs under the run directory;
- write `open-scaffold.dispatch-receipt.v1`;
- write a structured `adapter-output-manifest.json`;
- keep artifacts, logs, receipts, and evidence path-contained under allowed run/worktree roots;
- declare whether it spawned;
- return portable failure codes;
- never claim task correctness by receipt alone.

## Safety and governance floor

The execution controller is not acceptable until these gates are designed and tested:

- deny-by-default adapter environment allowlist;
- no secrets by default;
- adapter timeout and kill policy;
- bounded/truncated logs;
- structured adapter output manifest instead of stdout scraping;
- path containment for receipts, evidence, logs, and artifacts;
- no symlink escape;
- isolated worktree/branch for write-capable runs;
- explicit network and credential gates;
- human gate before commit, push, PR creation, merge, publish, release, deploy, or external-production action;
- stop states such as `blocked`, `waiting_on_operator`, `failed`, and `cancelled`.

Receipt means handoff proof. Verification and human approval decide correctness and promotion.

## UX story

First 60 seconds:

```bash
osc work "Add a /health endpoint with tests" --runtime codex --dry-run
```

The user sees candidate scope, acceptance criteria, likely files, verification commands, run packet preview, adapter dispatch preview, and authority summary. Nothing executes.

First real gated run:

```bash
osc work "Add a /health endpoint with tests" --runtime codex --execute --allow-spawn
```

Open Scaffold validates or creates the plan, creates the run, invokes the explicit adapter, captures receipt/evidence, verifies, then asks what to do next. It does not silently commit, push, open a PR, merge, publish, release, or deploy.

The CLI should hide vocabulary from first-time users. The repo records should preserve vocabulary for future agents and reviewers.

## Repo-native thesis preservation

This direction preserves the thesis because automation writes more durable truth, not less. The repo still owns mission, roadmap, plan, amendment, task ID, run ID, question ID, approvals, receipt, evidence, verification, postflight, and release notes.

Runtime sessions remain replaceable and non-canonical. Chat dashboards remain mirrors. The adapter can disappear and the repository should still explain what was requested, what ran, what evidence was produced, what passed, what failed, and which human gates remain.

## Future implementation backlog

Implementation should follow `.osc/plans/backlog/119-osc-work-execute-controller.md` and start with tests/fixtures for:

- executable package validation;
- adapter config allowlist;
- environment allowlist;
- timeout and kill behavior;
- bounded log truncation;
- structured manifest validation;
- receipt/run consistency;
- path containment and symlink escape rejection;
- isolated worktree requirement for write-capable runs;
- human-gated commit/push/PR/merge/publish/release/deploy refusal.

Native runtime ownership can be reconsidered only after at least two credible adapter proofs or one production adapter, closed security P0s, real adoption evidence that adapters are insufficient, and a separate ADR accepting the process lifecycle and credential burden.
