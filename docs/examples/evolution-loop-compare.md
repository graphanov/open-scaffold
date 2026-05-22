# Evolution loop compare walkthrough

This walkthrough shows the smallest useful `osc evolve` story:

```text
one task
  -> attempt A with evidence/evaluation
  -> attempt B with evidence/evaluation
  -> compare
  -> frontier rationale a reviewer can read
```

Open Scaffold core records and compares the loop. It does **not** launch agents, rank models, certify compliance, or approve a release.

## Scenario

A small task has two attempts:

- `attempt-a` handled the easy cases but failed `AC2`.
- `attempt-b` kept `AC1` passing and fixed `AC2`.

The useful reviewer question is:

```text
Why did B become the current frontier instead of A?
```

`osc evolve compare` answers that from repo files instead of asking a reviewer to open raw JSONL.

## 1. Initialize the loop

Start from a plan or run packet:

```bash
osc evolve init .osc/plans/active/csv-importer.md \
  --out .osc/evolution/csv-importer \
  --strategy greedy
```

This creates:

```text
.osc/evolution/csv-importer/
  loop.json
  attempts.jsonl
  frontier.json
```

## 2. Record attempt A

Record the first attempt with its run packet and evaluation envelope:

```bash
osc evolve record .osc/evolution/csv-importer \
  --run .osc/runs/attempt-a/run.json \
  --evaluation docs/evidence/attempt-a-evaluation.json \
  --decision promote \
  --score 0.62 \
  --rationale "First useful frontier, but AC2 still fails."
```

Example evaluation status:

```text
AC1 Parse quoted CSV rows          pass
AC2 Reject malformed input clearly fail
```

## 3. Record attempt B

Record the improved attempt:

```bash
osc evolve record .osc/evolution/csv-importer \
  --run .osc/runs/attempt-b/run.json \
  --evaluation docs/evidence/attempt-b-evaluation.json \
  --decision promote \
  --score 0.94 \
  --rationale "Keeps AC1 passing and fixes AC2 with clear error handling."
```

Example evaluation status:

```text
AC1 Parse quoted CSV rows          pass
AC2 Reject malformed input clearly pass
```

Because this second record uses `--decision promote`, `frontier.json` now points at `attempt-b` while preserving the prior frontier in history.

## 4. Compare previous frontier vs current frontier

Default compare target is the common question: previous frontier vs current frontier.

```bash
osc evolve compare .osc/evolution/csv-importer \
  --format markdown \
  --out docs/evidence/csv-importer-frontier-compare.md
```

The markdown output is designed to paste into a PR description or review thread:

```markdown
# Evolution loop: csv-importer — A vs B

**Comparing:** `attempt-a` (promote) → `attempt-b` (promote, current frontier)

| Field | A | B | Δ |
|---|---|---|---|
| Decision | promote | promote | — |
| Score | 0.62 | 0.94 | +0.32 ▲ |
| Run ID | attempt-a | attempt-b | changed |
| Evidence files | 2 | 3 | +1 |
| Evaluation envelope | ✓ | ✓ | — |

## Rationale

**A (promote):** First useful frontier, but AC2 still fails.

**B (promote):** Keeps AC1 passing and fixes AC2 with clear error handling.

## Acceptance criteria delta

| Criterion | A | B |
|---|---|---|
| AC1 — Parse quoted CSV rows | ✓ pass | ✓ pass |
| AC2 — Reject malformed input clearly | ✗ fail | ✓ pass ▲ |
```

That table is the point: a reviewer can see the frontier decision without reconstructing it from `attempts.jsonl`, evaluation JSON, and evidence files by hand.

## 5. Use explicit targets when needed

Compare by attempt id, run id, or the reserved `frontier` keyword:

```bash
osc evolve compare .osc/evolution/csv-importer \
  --a attempt-a \
  --b frontier \
  --format terminal
```

## What this proves

- The repo records which attempts happened.
- The frontier promotion has a rationale.
- Evaluation envelopes make acceptance-criteria changes visible.
- The comparison is read-only; it does not mutate loop state.
- Human maintainers still own taste, risk, merge, publish, and release decisions.
