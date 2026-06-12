# AC7 validation run — cheap judge feeds frontier worker (plan 167)

One end-to-end run of the "suggestions upward" mechanism, 2026-06-12. A local
cheap model judged a recorded attempt; the gate packet it authorized was the
ONLY channel into a fresh frontier worker's next attempt; the next attempt
fixed exactly the recorded failures.

## Design

- Task: implement `parseDuration(input)` (Node ESM, no deps) from a TERSE
  prompt. Eight acceptance criteria were held coordinator-side (`check.mjs`);
  the worker never saw them. Criteria AC7 (exact `TypeError` for invalid
  input) and AC8 (exact `RangeError` for negatives) are genuinely
  underdetermined by the prompt — a worker can only learn them through the
  record.
- Worker: `claude -p`, model sonnet, fresh session per attempt (no shared
  context), isolated workspace `/tmp/ac7-ws`, `--setting-sources project`,
  strict empty MCP.
- Judge: local `gemma4:31b` via Ollama's OpenAI-compatible endpoint, invoked by
  the product path `osc gate <loop> --judge-endpoint http://localhost:11434/v1
  --judge-model gemma4:31b`.

## What happened

1. Attempt 1 (terse prompt only): **6/8** — AC7 threw the wrong error class,
   AC8 silently parsed `-5m` as 300. 2 turns, 530 output tokens, ~10s.
2. Coordinator recorded the attempt (`osc evolve record`, decision `retry`,
   repair hypothesis, usage receipt) against the evaluation envelope built by
   `check.mjs`.
3. `osc gate` with the local judge: ruling `continue` ("standard
   error-handling requirements... no evidence of a plateau or impossibility"),
   **1,725 judge tokens, zero cloud quota**; retry authorized, mode `normal`.
   The packet's Remaining-failures section carried both criterion texts
   verbatim (`gate-packet.md`).
4. Attempt 2 (fresh session; terse prompt + the gate packet, nothing else):
   **8/8**. 3 turns, 1,520 output tokens, ~28s. Recorded as `promote`;
   frontier updated; analysis auto-filled `accepted_ac_count` actual delta +2.

## Receipts

`gate-packet.md` (the mechanism's artifact), `loop/` (loop.json,
attempts.jsonl, frontier.json), `eval-attempt-{1,2}.json`,
`run-attempt-{1,2}.json`, `ac7-worker-attempt-{1,2}.json` (claude -p usage
receipts), `judge-receipt.txt`, `final-analysis.md`,
`parse-duration-final.mjs`, and the oracle `check.mjs`.

## Boundaries

- n=1 validation that the mechanism works end to end through the shipped
  product commands — not a benchmark, not a model ranking, not a claim that
  judged retries beat unjudged ones.
- The attempt-1 module was overwritten by attempt 2; its behavior survives in
  `eval-attempt-1.json` rationales rather than as a file.
- Worker prompts are recorded verbatim inside the worker receipt JSONs; the
  attempt-2 prompt embedded `gate-packet.md` unmodified.
