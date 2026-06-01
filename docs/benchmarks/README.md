# Benchmark learning notes

This folder holds public-safe benchmark lessons that affect Open Scaffold's product direction.

It is not a scoreboard, raw evidence archive, or adoption-proof folder. Raw run logs, transcripts, screenshots, JSONL files, and local machine paths stay out of this repo. Notes here should say what was actually tested, what failed, what remains unproven, and what the next test should measure.

Current notes:

- [`2000m-v1-two-lane-postmortem.md`](2000m-v1-two-lane-postmortem.md) — a local two-lane 2000m v1 run showed no raw-score advantage for Open Scaffold over a naked Codex/GPT-5.5 lane.
- [`2000m-v2-workflow-benchmark-proposal.md`](2000m-v2-workflow-benchmark-proposal.md) — a handoff proposal for a benchmark v2 that tests recovery, handoff, stop conditions, and artifact quality.
- [`../examples/benchmark-v2-workflow/`](../examples/benchmark-v2-workflow/) — a machine-readable scenario fixture for the first v2 workflow-value slice.

Honesty rules:

- A tie or loss is reported as a tie or loss.
- Evidence/recovery value is not smuggled into a raw-score claim.
- Owner-run local experiments are not adoption proof.
- Headless protocol drivers are not called playable games unless a real player/viewer exists.
- Scenario fixtures are not benchmark results; the benchmark repo still owns scorer and harness implementation.
