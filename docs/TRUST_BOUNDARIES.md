# Trust boundaries

Open Scaffold is a repo-native work-record system. It records intent, handoffs, evidence, verification commands, and approval state; it is not a sandbox, secret manager, compliance program, hosted runtime, or semantic code reviewer.

## Core rule

```text
Local structure can be checked mechanically.
Correctness, compliance, safety, merge, publish, release, deployment, and credential use remain human/owner gates.
```

A passing Open Scaffold structural check means the files and links look coherent. It does **not** mean the implementation is good, secure, compliant, production-ready, or approved.

## Repository files vs local state

Tracked repository files are the durable work record:

- `MISSION.md`
- `ROADMAP.md`
- `.osc/plans/{active,backlog,blocked,done}/`
- `.osc/runs/<run_id>/run.json` when promoted or shared intentionally
- `.osc/releases/` evidence notes
- docs, tests, and PR templates

Local operator state is intentionally gitignored and must not become public truth:

- `.osc/state/` — local trust records and future local state
- `.osc/cockpit.json` — webhook/operator-surface config
- `.osc/runs/` raw runtime logs unless deliberately promoted
- `.osc/research/` review packages, scratch clones, and private synthesis

## Dispatch and adapters

Root `osc adapter` trust commands and root `osc dispatch` execution were retired in plan 168. Current Open Scaffold core writes run packets, handoff/review/gate records, and schema metadata; external coordinators or runtime-specific packages consume those packets outside the core CLI.

Adapter configs and launchers are still **untrusted by default**. Review them outside Open Scaffold core before use, and keep any local trust record gitignored. A future command that reintroduces adapter trust must restore digest checks, restricted environment handling, bounded logs, path-contained receipt/evidence output, and explicit owner approval before spawn-capable behavior.

Runtime-specific packages such as `@open-scaffold/runtime-omx` must:

- pass a restricted environment only;
- report environment key names, never values;
- bound timeouts and stdout/stderr log bytes;
- redact common token/webhook/path patterns from retained logs;
- keep receipt/evidence discovery path-contained under the run directory;
- stop before commit, push, PR creation, merge, publish, release, deploy, or credential changes.

Unsafe local overrides such as full environment passthrough belong in package-specific debugging flows only. They should be refused in CI unless separately acknowledged and should not be used in reusable workflows.

## Runtime spawning boundary

Open Scaffold core does not silently spawn provider agents. It can create run packets, render handoff prompts, and invoke reviewed explicit adapters. Runtime harnesses such as Codex/OMX/Claude/OpenHands own their own authentication, process model, sandboxing, and provider logs.

A write-capable runtime lane must use an isolated non-main branch/worktree and must stop before commit/push/PR/merge/publish unless the owner grants that separate authority.

## Webhooks and operator surfaces

Discord/Slack/Telegram/GitHub comments and dashboards are glass/control surfaces, not truth. They may mirror status, blockers, questions, evidence paths, or PR links, but the canonical record remains in git and GitHub.

Webhook URLs and chat tokens are secrets. Keep real webhook config in `.osc/cockpit.json`, not in tracked docs, plans, evidence, or logs.

## Evidence and logs

Evidence notes should summarize what happened, cite plan/run/PR paths, include verification commands and results, record outcome/follow-up, and state the boundary of the claim.

Do not commit raw transcripts, unbounded logs, secrets, private local paths, or provider session state. Prefer compact evidence, hashes, selected excerpts, and local ignored forensic storage for raw data.

## PR checks and online verification

`osc pr-summary`, `osc pr check`, `osc trace`, and `osc verify --evidence-chain` are structural tools. They can help reviewers see whether a PR has a plan, evidence, run references, and close-decision fields. They do not judge the implementation.

Offline checks are the default. Optional GitHub online modes must label references as verified, unavailable, skipped, or unverified instead of silently upgrading trust.

## Optional native dependencies

Optional native dependencies, such as local SQLite task storage, are not required for the core work-record protocol. Environments that avoid native installs can omit optional dependencies and use GitHub Issues or another external task bridge.

## Safe defaults for reusable automation

Reusable workflows should:

- use `pull_request`, not `pull_request_target`, when running PR code;
- keep the PR-code job at `contents: read`;
- put comment-writing in a separate guarded job;
- skip comment mutation for forks and Dependabot;
- avoid secrets for local structural checks;
- never auto-trust arbitrary adapter configs from a PR;
- never publish, release, merge, deploy, or run spawn-capable lanes without explicit owner approval.

## Auditability boundary

Open Scaffold is an evidence substrate: a structured place for goals, plans, handoffs, receipts, verification notes, amendments, approvals, and lessons.

It does not prove the work is correct, replace human approval, or create a compliance program; it organizes project materials so reviewers can inspect them.

It can help a reviewer answer:

- What goal or mission was the work supposed to serve?
- Which plan defined scope, constraints, files, acceptance criteria, and verification?
- Which handoff package was given to an agent, runtime, teammate, or future session?
- Which evidence note records checks, outputs, approvals, and remaining gates?
- Which amendments explain scope changes?

Useful chain:

```text
mission -> plan -> handoff/run packet -> receipt -> evidence -> human approval -> release note
```

The chain supports audit, client review, postmortem, and handoff by reducing reconstruction work. It does not replace those processes. The full compliance/security/correctness boundary lives in [`STABILITY.md#honest-limits`](STABILITY.md#honest-limits).
