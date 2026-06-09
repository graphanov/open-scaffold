# Feedback and improvement loop

Feedback is how a run learns what to fix next. It is not approval.

The loop is intentionally small:

```text
run -> verify -> feedback -> repair hypothesis -> retry or accepted lesson -> future run inherits the relevant lesson
```

## What gets written

A failed or blocked `$work` runtime attempt now writes a feedback record automatically:

```text
.osc/runs/<run-id>/feedback.jsonl
```

Each `osc.feedback.v1` record includes:

- source: where the feedback came from (`runtime`, `tests`, `reviewer`, `benchmark`, `human`, `codex`, or `hermes`);
- verdict: what to do next (`pass`, `retry`, `reject`, `block`, or `improve`);
- scope: what the feedback applies to;
- what happened;
- why it matters;
- repair hypothesis;
- evidence paths;
- next action.

Runtime failures and blocked markers are converted into repair input, not success:

- missing, duplicate, non-final markers, timeouts, signals, non-zero exits, and spawn errors become retry feedback;
- `LOMEIN_BLOCKED` becomes block feedback;
- the runtime receipt and bounded logs are kept as evidence refs.

Backend scripts can still record non-runtime feedback directly:

```bash
osc feedback record <run-id> \
  --source tests \
  --verdict retry \
  --scope run \
  --what-happened "The simulated benchmark passed but the docs implied live proof." \
  --why-it-matters "Open Scaffold proof claims must distinguish simulated smoke from live reproduction." \
  --repair-hypothesis "Downgrade docs to say simulated-only until live paired runs pass." \
  --evidence-path .osc/bench/simulated-runtime-smoke/aggregate.json \
  --next-action retry

osc feedback analyze <run-id>
```

`osc feedback analyze` writes `.osc/runs/<run-id>/improvement-candidates.json` with schema `osc.feedback-analysis.v1`. The analysis groups feedback into repair hypotheses. It is not a patch and not approval.

## Retrying without overwriting evidence

A retry is a new run linked to the parent run:

```bash
osc harness '$work "fix the failed slice" --context "repo truth" --retry-of <old-run-id> --adapter <id> --allow-spawn' --json
```

The new run writes its own evidence under its own run directory. The old run keeps its original `runtime-receipt.json`, logs, feedback, and postflight note.

Creating the retry reads the parent feedback without writing new parent-side analysis files. Any new receipt, retry record, or handoff packet belongs to the new run.

The retry record lives here:

```text
.osc/runs/<new-run-id>/retry.json
```

It records:

- parent run id;
- attempt number;
- inherited repair hypothesis;
- previous evidence paths;
- boundary flags saying the repair hypothesis is not approval.

## Accepted lessons

Accepted improvements live under:

```text
.osc/improvements/applied/<slug>.md
```

They are lessons future runs may inherit. They are not owner approval and do not grant commit, push, merge, publish, or release authority.

Future `$work` and `$team` runs only load accepted lessons when asked:

```bash
osc harness '$work "handoff resume budget next slice" --context "enough" --inherit-improvements'
```

The loader filters by the current intent. It should pass forward relevant lessons, not dump every old lesson into every run package.

Filtering uses the lesson title/slug and `## Lesson` body. Boilerplate boundary text like “not approval” or headings like “Evidence paths” are not enough to make a lesson relevant. `$work` and `$team` also inherit no accepted lessons when the intent is empty or too generic to produce meaningful search terms.

## `$team` parity

`$team` uses the same ideas as `$work`:

- one shared evidence file;
- a shared feedback path;
- accepted improvement inheritance when requested;
- repair hypotheses for failed or blocked worker lanes;
- a postflight note that says feedback is not approval.

A backend smoke can model worker feedback like this:

```bash
osc harness '$team "team handoff budget repair" --context "plan is ready" --worker implementation --worker review --inherit-improvements --worker-outcome review:blocked --repair-hypothesis "Review lane should summarize blockers in shared evidence before retry."' --json
```

That records the feedback and keeps the team run in a blocked state until the repair path is handled.

## Boundary

Feedback can guide the next attempt. It can become an accepted lesson after review. It never means the owner approved merge, publish, release, deployment, secrets use, or history changes.
