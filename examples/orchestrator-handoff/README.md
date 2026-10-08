# Orchestrator handoff pilot

**Both independent assessors scored all six fresh readers 12/12.** The three OSC-minus-plain recovery differences are 0, 0, and 0. All six coordinator syntheses also preserved the twelve facts. Neither assessor found an omission, unsupported completion/merge/publication claim, or attribution error. This is a tie at the ceiling, with no observed recovery advantage.

From the repository root, verify the saved bundle with Python 3.9 or later:

```sh
python3 examples/orchestrator-handoff/verify.py
```

The verifier uses only the Python standard library, works offline, and leaves the bundle unchanged. It does not dispatch agents, call models, access a grading key, or perform semantic grading. A passing run establishes consistency of these saved records and arithmetic. It does not establish execution authenticity, authority, approval, security isolation, or correctness of the assessors' reasoning.

## What was compared

Three native Codex workers each reported four fictional source facts once. Those twelve ordered facts were reused in two packaging arms: plain messages and an experimental attributed JSON envelope (`osc`). Six coordinators produced handoffs; each coordinator's turn ended before a separate fresh reader received that coordinator's own handoff and the same recovery request. Two assessors then independently graded the frozen responses. Their findings are preserved here without rescoring.

| Pair | Fixed arm order | Plain reader | OSC reader | OSC minus plain |
| --- | --- | --- | --- | --- |
| 1 | plain, OSC | 12/12 | 12/12 | 0/12 |
| 2 | OSC, plain | 12/12 | 12/12 | 0/12 |
| 3 | plain, OSC | 12/12 | 12/12 | 0/12 |

Each arm's mean accuracy is 100%; the mean paired difference is zero. There were fifteen actor invocations, no retries, no score-driven reruns, and no selection of replacement outputs. The fixed alternating order is neither randomized nor fully counterbalanced. One small synthetic fixture and three pairs support no significance, model-superiority, cost-efficiency, runtime-advantage, or scaling conclusion.

## Saved artifacts and portability

- `study.json` contains the closed expected file allowlist and explicit artifact map. It embeds exact UTF-8 source fixtures, common inventory, instructions, all fifteen materialized prompt strings, all fifteen captured raw strings, and their SHA-256 digests, byte counts, and character counts. Receipts, saved clock objects, termination records, the halt, continuation, and timing correction are included. `fixture/...` evidence references are synthetic source labels mapped to embedded artifacts; they do not imply extra public files.
- `assessment-primary.json` and `assessment-independent.json` are portable projections of the two frozen assessments. Every reader/coordinator binary fact score, supporting and attribution excerpt, omission, unsupported claim, disagreement/open-decision finding, rationale, and uncertainty remains. The second assessor's worker diagnostics also remain. Bulky private integrity/read-scope metadata is omitted; original JSON and Markdown digests are retained separately as opaque provenance.
- `results.json` derives every pair, descriptive arm mean, secondary count, context-size comparison, and score disagreement from the packaged records. Both assessors' uncertainty and preservation findings remain separately visible. In particular, the primary assessor records limited ambiguity in the pair-3 plain reader's summary wording while retaining its 12/12 score.
- `formatter.py` keeps the frozen rendering and parsing semantics. Only its CLI reads the portable bundle instead of the private study directory. Inspect either arm with `python3 examples/orchestrator-handoff/formatter.py --arm plain` or `--arm osc`; `--check-parity` reports the frozen twelve-record round trip.
- `verify.py` checks source identities, ordinals, categories and order; exact prompt framing and formatter parity; fifteen unique captures and fixed schedule; six termination/fresh-reader links; ten saved clock objects; timing correction arithmetic; correct-output excerpt bindings; binary scores and derived totals. It rejects duplicate JSON members, unsafe or ambiguous references, and extra/missing bundle files.

References beginning `study:` resolve only to the closed embedded artifact map. Entries marked `opaque` expose original digest/size metadata without exposing or reading those source contents. For a `projection`, `original_binding` identifies the original private artifact, while `payload_binding` hashes the public projection. These digests have different meanings.

Actual routing wrappers contained a private absolute study root. Public routing projections replace that root with `<STUDY_ROOT>`, carry independent projection hashes/sizes, and retain original wrapper digest/bytes as opaque metadata. The placeholder is descriptive; the verifier never opens it. Exact original routing text and native hidden system/tool context are not public. The public payload is therefore **not an exact reproduction of each complete native input**. Original supplied-input totals are metadata arithmetic, separately labeled from the sanitized projections.

The attributed envelope is an experimental fixture format, not a shipped Open Scaffold core schema. Open Scaffold core owns the repo-native work record, handoff packets, review/gate judgments, evidence and close protocol. External agents and coordinators own execution and routing. This example changes no core production code or documented report contract.

## Measurement limits and retained failure

The actual executor was native Codex with inherited/unreported model routing. Model name/version, temperature, tokenizer, exact token counts, provider usage and cost remain unknown. Missing usage means unavailable, never zero. Isolation was cooperative prescribed-input/fork-none context separation under a shared OS identity; it was not an OS/provider security boundary. Termination receipts describe completed native turns and interrupt readback, not provider-conversation deletion.

Materialized coordinator inputs measured 4,570 UTF-8 bytes for plain and 6,284 for OSC, including common instructions. Mean materialized fresh-reader inputs were 3,863.67 and 4,090 bytes respectively. These are byte measurements, not tokens or cost. The complete-supplied sizes in `results.json` additionally use the opaque original routing-byte metadata; hidden native context remains unmeasured.

The first five timestamps are Root-attested parent observation bounds. The original first plain-reader receipt falsely recorded an estimated 64-second end. Its original bytes remain. A separate correction records a Root-attested 93-second upper bound, adding 29 seconds. The later ten invocations save actual predispatch/post-final clock tool objects at second precision. The corrected aggregate is **1,139 = 1,110 + 29 seconds**, a sum of parent observation bounds including receipt latency, not provider latency or end-to-end study duration. The halt and admitted timing-only continuation remain recorded; no response was rerun.

This publication candidate is prepared for independent review and has not yet shipped. A harder comparison requires separate preregistration; this ceiling result supplies no evidence of a recovery advantage.
