# Handoff compiler

The harness handoff compiler creates compact continuation packets for future workers without dumping raw logs into chat or docs.

Schema: `osc.handoff-compiler.v1`

## Required sections

A valid packet must include:

1. `State`
2. `Decisions`
3. `Blockers / Open Questions`
4. `Evidence refs`
5. `Next Actions`

It must also stay within the configured character budget.

## Why it exists

Long AI runs often leave useful work hidden in logs, chat, or scattered notes. The handoff compiler preserves the minimum resume context:

- current state,
- decisions and rationale,
- blockers/open questions,
- evidence references,
- next actions.

It explicitly avoids raw-log dumping. Evidence links point at repo-local artifacts or external URLs instead.

## Boundary

A handoff packet is not proof, approval, or a release note. It is a compact resume aid. Future workers must still verify referenced artifacts before claiming pass.

## Handoff lab

`osc bench handoff-lab` scores 15 deterministic candidates and writes:

```text
.osc/bench/handoff-lab-15/aggregate.json
.osc/bench/handoff-lab-15/REPORT.md
.osc/bench/handoff-lab-15/methods/<method>/resume.md
.osc/bench/handoff-lab-15/methods/<method>/score.json
```

The lab can show a narrow compiler candidate that fits the packet budget. It cannot prove broad Open Scaffold dominance over naked Codex.
