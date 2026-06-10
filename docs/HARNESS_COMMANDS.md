# Harness command surface

Open Scaffold now has a small command grammar for human-facing chat, plugin, CLI, and future app surfaces.

The plain model is:

```text
clarify the task -> write the plan -> package work -> record evidence -> learn from feedback -> test the claim
```

The harness writes repo files and status events. It does not make the agent smarter, prove the work is correct, or move owner approval gates.

| Command | Use it for | What Open Scaffold records |
| --- | --- | --- |
| `$interview` | Clarify messy intent before work starts. | A bounded work-package draft, missing-context gates, and captured constraints. |
| `$plan` | Create or amend repo-native plans. | A plan artifact or amendment proposal with acceptance criteria and verification. |
| `$work` | Package one bounded slice for controlled worker execution. | `.osc/runs/<run-id>/run.json`, events, gates, postflight, feedback paths, and inherited accepted improvements. |
| `$team` | Package multiple coordinated worker lanes against one goal or plan. | Worker status records plus one shared evidence/postflight record. |

The product UX is the four `$commands`. The `osc` CLI is the backend surface for shell, CI, tests, and transport adapters.

## Entering or re-entering a session

Run `osc resume` before any harness command. It compiles a budgeted, read-only packet from repo truth — mission digest, active plan with acceptance criteria, latest run state, repair hypotheses, lessons, and the next bounded action — so a fresh session continues without chat history. See [`RESUME_WALKTHROUGH.md`](RESUME_WALKTHROUGH.md).

## CLI backend

Use the backend when a shell, CI job, Codex plugin, Hermes worker, or future desktop app needs a deterministic call. Help is available at `osc harness --help`, `osc feedback --help`, and `osc bench --help`:

```bash
osc harness '$interview "tighten the task"' --json
osc harness '$plan "add the harness docs" --slug harness-docs --acceptance "Docs explain gates"'
osc harness '$work "implement one bounded slice" --context "plan is ready"' --json
osc harness '$work "implement one bounded slice" --context "plan is ready" --adapter codex --allow-spawn --timeout-ms 600000' --json
osc harness '$work "retry failed slice" --context "repo truth" --retry-of <old-run-id> --handoff --handoff-max-chars 1200' --json
osc harness '$team "split implementation docs review" --plan .osc/plans/active/team-plan.md --worker implementation --worker docs --worker review'
osc harness '$team "two lane smoke" --worker implementation --worker review --worker-outcome implementation:complete --worker-outcome review:needs-human --worker-question review:"Pick README.md before review continues."' --json
osc harness '$team "shared repair" --worker implementation --worker review --worker-adapter review:plain --worker-outcome review:blocked --repair-hypothesis "Summarize blocker before retry."' --json
osc harness answer <team-run-id> --gate worker-review-needs-human --answer "Use README.md first. This is task input only." --json
```

`$work` is dry-run by default. Without `--allow-spawn`, it writes a work package and `runtime-receipt.json` with `status: "dry_run"` and `failure.code: "spawn_authority_missing"`; no adapter process is launched, and project-local adapter config is not read or trusted yet.

With `--allow-spawn`, the selected adapter may execute the bounded work package. The first built-in path is `--adapter codex`, which launches a Codex CLI command through the provider-neutral runtime adapter contract. Project-local fake or custom adapters can also live under `.osc/adapters/<id>.json` and must be locally trusted before execution.

The adapter receipt is repo-relative and bounded:

```text
.osc/runs/<run-id>/runtime-receipt.json
.osc/runs/<run-id>/runtime/stdout.log
.osc/runs/<run-id>/runtime/stderr.log
```

The receipt records adapter name, command summary, timeout, exit state, final marker state, bounded log paths, evidence paths, and portable failure code. It is evidence of what ran, not proof that the work is correct.

## Runtime marker contract

A spawned runtime must end stdout with exactly one final standalone marker line. These marker names are adapter wire strings kept for compatibility, not Open Scaffold product branding or human-facing commands:

| Marker | Meaning |
| --- | --- |
| `LOMEIN_COMPLETE` | The adapter says the bounded run finished. Open Scaffold records `completed`; verification and owner gates still remain. |
| `LOMEIN_NEEDS_HUMAN` | The adapter needs task input. Open Scaffold preserves the question/context before the marker and creates a pending human gate. |
| `LOMEIN_BLOCKED` | The adapter is blocked. Open Scaffold records a blocked receipt, not success. |

Missing markers, duplicate markers, non-final markers, timeouts, signals, and non-zero exits fail closed.

Failed and blocked runtime outcomes also create `.osc/runs/<run-id>/feedback.jsonl`. That feedback includes a repair hypothesis and evidence refs to the receipt/logs. A retry uses a new run id and can inherit the newest actionable hypothesis through `--retry-of <run-id>` so old evidence is preserved. If no feedback exists yet, retry still links the prior evidence and records a bounded fallback repair hypothesis instead of failing before the retry packet is written.

Human gates use the backend too:

```bash
osc harness status <run-id> --json
osc harness answer <run-id> --gate missing-required-context --answer "Use README and local tests only." --json
```

A gate answer is task input. It is not approval to commit, push, merge, publish, release, deploy, or rewrite history.

## Backend-only feedback and benchmark commands

Feedback and improvement commands exist for scripts and repro runs, not as a fifth primary UX command:

```bash
osc feedback record <run-id> \
  --source reviewer \
  --verdict retry \
  --scope run \
  --what-happened "The run overclaimed benchmark proof." \
  --why-it-matters "Open Scaffold claims must be evidence-backed." \
  --repair-hypothesis "Downgrade the wording and cite aggregate paths." \
  --evidence-path .osc/runs/<run-id>/run.json \
  --next-action retry

osc feedback analyze <run-id> --json
osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke
osc bench handoff-lab --out .osc/bench/handoff-lab-15
```

The backend commands write repo-local receipts. They do not spawn Codex from core, rank models, certify correctness, or grant owner approval. In the current maturity model, simulated benchmark and feedback commands are useful backend tools; live runtime runs with `--allow-spawn` remain experimental and require an explicit operator decision.

Accepted improvements live under `.osc/improvements/applied/`. `$work` and `$team` only load them when `--inherit-improvements` is passed, and the loader filters by the current intent instead of injecting every old lesson.

## Transport boundary

The router takes command text and returns event/status/artifact shapes. It is transport-agnostic:

- CLI can call it through `osc harness`.
- A Codex plugin can call it and render the same status/events.
- Hermes can call it and preserve the same run record.
- A future desktop/control-room app can call it without changing the core protocol.

`$team` uses the same boundary. Worker lanes may name adapters with `--worker-adapter <worker>:<adapter>`, but the metadata is a capability and authority contract, not permission to merge or publish. Worker outcomes can be recorded with `--worker-outcome <worker>:complete|needs-human|blocked|failed|benchmark-failed|reviewer-failed`; human-gate outcomes appear in the shared status and are answered through the same backend `osc harness answer` command.

Runtime execution remains adapter-owned. Open Scaffold core packages controlled work, preserves receipts, and exposes gates; it does not become an autonomous authority.

## Feedback, retry, and accepted lessons

A failed or blocked `$work` runtime attempt writes:

```text
.osc/runs/<run-id>/feedback.jsonl
```

Each `osc.feedback.v1` record captures source, verdict, scope, what happened, why it matters, repair hypothesis, evidence paths, and next action.

A retry is a new run linked to the parent, not a rewrite:

```bash
osc harness '$work "fix the failed slice" --context "repo truth" --retry-of <old-run-id> --adapter <id> --allow-spawn' --json
```

The retry writes:

```text
.osc/runs/<new-run-id>/retry.json
```

Accepted lessons live under:

```text
.osc/improvements/applied/<slug>.md
```

`$work` and `$team` load accepted lessons only when `--inherit-improvements` is passed, and they filter lessons by current intent. Feedback guides the next attempt; it is not owner approval.
