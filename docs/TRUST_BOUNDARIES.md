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

`osc dispatch` invokes only an explicitly selected project-local adapter config at `.osc/adapters/<id>.json`.

Adapter configs are **untrusted by default**. Review the file, then record a local digest:

```bash
osc adapter check <id>
osc adapter trust <id>
osc adapter list --trusted
```

Dispatch refuses an untrusted adapter or a trusted adapter whose config digest changed. Trust records live under `.osc/state/trusted-adapters.json` and are gitignored by default.

By default dispatch:

- passes a restricted environment only;
- allows parent environment variables only through `envAllowlist`;
- allows explicit adapter-provided `env` values from the reviewed config;
- reports environment key names, never values;
- bounds adapter timeout and stdout/stderr log bytes;
- redacts common token/webhook/path patterns from retained logs;
- keeps receipt/evidence discovery path-contained under the run directory;
- stops before commit, push, PR creation, merge, publish, release, deploy, or credential changes.

`--allow-full-env` is an unsafe local override. It is for exceptional local debugging only, is refused in CI unless separately acknowledged, and should not be used in reusable workflows.

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
