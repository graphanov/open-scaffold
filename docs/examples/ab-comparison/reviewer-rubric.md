# A/B Comparison — Blinded Reviewer Rubric (H4)

> **Template, not a result.** This rubric scores how completely a cold reviewer
> can reconstruct a task from its record alone. It is used in the controlled
> comparison described in `docs/AB_COMPARISON_PROTOCOL.md`. No scores in this
> repository have been collected.

## How to use this rubric

1. The experimenter **strips arm labels** from each task's record before review:
   the reviewer must not know whether a task was Arm A (scaffolded) or Arm B
   (control). Blinding is what keeps experimenter bias out of H4.
2. The reviewer reads only the durable record left behind for a task (repo
   files, commits, evidence notes, and/or chat transcript — whatever that arm
   produced) and answers the four questions below from that record alone.
3. The reviewer records points per dimension in the raw-data file as the
   `reconstruction_score` metric (sum, 0–12), with `source: manual`.

## Scoring dimensions

Score each dimension independently. Do not let a strong record on one dimension
inflate another.

| Dimension | 0 — absent | 1 — partial | 2 — mostly | 3 — complete |
|-----------|-----------|-------------|------------|--------------|
| **What was asked** (the goal/scope) | Cannot tell what the task was | Vague sense of the goal | Goal clear, scope fuzzy | Goal and scope both unambiguous |
| **Why** (intent / decisions) | No rationale recoverable | One decision explained | Most decisions explained | Intent and key decisions traceable |
| **What changed** (the diff/work) | Cannot tell what was done | Some changes identifiable | Most changes identifiable | Full change set reconstructable |
| **How it was verified** | No verification evidence | A claim of testing, no detail | Partial verification record | Verification commands/results present |

Maximum score: **12**.

## Recording the score

For each task, add one row to the raw-data file:

```text
task_id,arm,metric,value,source,notes
T07,A,reconstruction_score,11,manual,"blinded review; verification fully reconstructable"
```

The `arm` is filled in by the experimenter **after** scoring, from the blinding
key — never by the reviewer. A task the reviewer could not score is recorded
with a blank value and `source: unavailable`, not a zero.

## Honesty rules (inherited from the project)

Report every task's score, including ties and reversals where the control arm
scored as well as or better than the scaffolded arm. A pilot is descriptive
only. No public claim is drawn from these scores without a separate owner gate.
