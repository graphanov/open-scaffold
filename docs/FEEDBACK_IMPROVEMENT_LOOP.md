# Feedback and improvement loop

Feedback is first-class in the harness, but it is not a fifth public command. Humans still use `$work` or `$team`; the feedback loop happens inside the run record and backend commands.

## Product loop

1. Clarify what the human wants.
2. Plan the work in the repo.
3. Package or run controlled AI workers.
4. Verify what they produced.
5. Capture feedback from humans, tests, reviewers, benchmarks, runtime adapters, Codex, or Hermes.
6. Turn the feedback into a repair hypothesis.
7. Retry, amend the plan, block, or store an accepted lesson.
8. Let future runs inherit accepted lessons.

## Feedback record

`osc feedback record` appends `.osc/runs/<run-id>/feedback.jsonl` records with schema `osc.feedback.v1`.

Required fields:

| Field | Values / meaning |
| --- | --- |
| `source` | `human`, `tests`, `reviewer`, `benchmark`, `runtime`, `codex`, or `hermes` |
| `verdict` | `pass`, `retry`, `reject`, `block`, or `improve` |
| `scope` | `run`, `plan`, `command`, `docs`, `benchmark`, or `runtime` |
| `whatHappened` | What was observed. |
| `whyItMatters` | Why the observation changes the work. |
| `repairHypothesis` | What should change on retry or future runs. |
| `evidencePaths` | Repo-relative evidence paths or URLs. |
| `nextAction` | Suggested next action; not authorization. |

Boundary:

- Feedback is not approval.
- A human feedback note does not grant merge/publish/release authority.
- Analysis is not a patch.
- Accepted lessons require review before they become durable behavior.

## Analysis

`osc feedback analyze <run-id>` writes `.osc/runs/<run-id>/improvement-candidates.json` with schema `osc.feedback-analysis.v1`.

The analysis groups feedback into repair hypotheses. A rejected or retry verdict should become an explicit next-attempt hypothesis, not a vague “try harder” note.

## Accepted improvements

Accepted improvements live under:

```text
.osc/improvements/applied/<slug>.md
```

A future `$work ... --inherit-improvements` run can load these accepted lessons into the run package. That is inheritance of reviewed learning, not automatic mutation of skills, source code, releases, or owner gates.

## Example

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
