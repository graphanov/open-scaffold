# Handoff compiler

The handoff compiler writes a compact resume packet. It is for continuing work after context loss, not for proving the work passed.

A packet must stay under a hard character budget and include these sections:

1. State
2. Decisions
3. Blockers / Open Questions
4. Evidence refs
5. Next Actions

The compiler keeps evidence links instead of raw logs.

## `$work` integration

`$work` can request a continuation packet:

```bash
osc harness '$work "handoff continuation runtime" --context "repo truth" --adapter <id> --allow-spawn --handoff --handoff-max-chars 950' --json
```

The packet is written to:

```text
.osc/runs/<run-id>/handoff.md
```

The run packet records the handoff receipt:

```json
{
  "handoff": {
    "requested": true,
    "path": ".osc/runs/<run-id>/handoff.md",
    "schema": "osc.handoff-compiler.v1",
    "maxChars": 950,
    "validation": { "status": "pass" }
  }
}
```

## What goes into the packet

The packet summarizes:

- current run state;
- adapter/runtime status when there was a runtime attempt;
- decisions that matter for continuation;
- blockers or repair hypotheses when the run failed or blocked;
- repo-relative evidence refs;
- next actions.

It should not include raw stdout, private local paths, secrets, or broad proof claims.

The compiler redacts common local path and token-like strings before writing the packet. Evidence refs should still be repo-relative paths or public URLs.

## Validation

`validateHandoffPacket` checks the required sections and character budget. A packet that misses sections or exceeds the budget fails validation. `$work --handoff-max-chars` refuses budgets below 900 characters because the required section headings and minimum bullets need room to survive. If a generated `$work` handoff still fails validation, `$work` fails closed instead of returning a successful handoff.

The handoff file can be useful even after a failed run: it points the next worker to the repair hypothesis and old evidence without overwriting the failed attempt.

## Handoff lab

`osc bench handoff-lab` still exists for deterministic compiler experiments. It scores 15 candidates and writes:

```text
.osc/bench/handoff-lab-15/aggregate.json
.osc/bench/handoff-lab-15/REPORT.md
.osc/bench/handoff-lab-15/methods/<method>/resume.md
.osc/bench/handoff-lab-15/methods/<method>/score.json
```

The lab can show that a narrow candidate fits the packet budget. It cannot prove broad Open Scaffold dominance over naked Codex.

## Boundary

A handoff packet is a continuation aid. It is not owner approval, not a verification result, and not evidence that Open Scaffold reproduced the source prototype signal.
