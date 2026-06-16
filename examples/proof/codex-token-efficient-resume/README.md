# Codex Token-Efficient Resume Fixture

Bounded fixture: one paused-work cold-resume decision, three read-only
`codex exec`/`gpt-5.5` replicates per arm.

Run the committed comparison:

```bash
osc prove compare examples/proof/codex-token-efficient-resume/manifest.json --format markdown
```

Current committed result:

- Naked Codex over raw paused-session artifacts: median 137,327 reported total
  tokens.
- Open Scaffold resume capsule + Codex: median 31,715 reported total tokens.
- Ratio: 4.330033x fewer reported total tokens for the scaffolded arm.
- Quality: tied at 6/6 by a deterministic human-facing decision rubric.

The manifest sets `minimum_ratio: 2` on the Codex-reported total-token metric;
`osc prove compare` fails the bounded proof if that threshold is missed.

Quality is not just a raw field-presence check. The committed receipts use
`deterministic-human-facing-decision-rubric-v1`, a six-point reader-usability
rubric:

1. Plain closeout/stop action.
2. Reasons that explain the frontier, acceptance evidence, and why another
   attempt is not authorized.
3. Unambiguous `attempt-f-closeout-candidate` resume pointer.
4. Clear acceptance status and remaining-work status.
5. Complete next fields and at least one traceable evidence reference.
6. Plain boundary saying this is decision support, not approval, release,
   deployment, or compliance.

The rubric is deterministic, but the criteria target readability, comprehension,
clarity, enough detail, and unambiguous routing for a human reader. It is not a
blind human-reader study.

To regenerate the prompt payloads:

```bash
node examples/proof/codex-token-efficient-resume/generate-fixture.mjs
```

To refresh receipts, rerun live Codex for `raw-events/<arm>-r<n>.jsonl` and
`answers/<arm>-r<n>.json`, then run:

```bash
node examples/proof/codex-token-efficient-resume/score-fixture.mjs
```

For rubric-only re-scoring of the committed answers while preserving the
previously committed usage and wall-time receipts:

```bash
node examples/proof/codex-token-efficient-resume/score-fixture.mjs --reuse-committed-receipts
```

Raw Codex event logs are local runtime residue and are not committed. The
committed receipts record that the usage values originated from the original
live `codex exec --json` `turn.completed` events and that wall time came from
the per-run meta receipts captured during those live invocations. Public source
refs are the prompts, answers, receipts, aggregate, generator, scorer, and
manifest in this directory.

