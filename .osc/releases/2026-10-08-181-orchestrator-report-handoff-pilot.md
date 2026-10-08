# Release / Evidence Note: 181-orchestrator-report-handoff-pilot

## Summary

A preregistered synthetic report-transfer pilot completed three worker, six coordinator, and six fresh-reader invocations in native Codex. Two independent assessors scored every reader 12/12; all three structured-minus-plain differences were zero. This is a ceiling result with no observed recovery advantage. A portable saved-record bundle is prepared for independent implementation review.

## Traceability

- Roadmap / task: plan 181; existing roadmap pilot, with frozen amendment 1.
- Plan: `.osc/plans/active/181-orchestrator-report-handoff-pilot.md`.
- Run packet: `181-public-comparison-fixture`; source lineage SHA-256 `6fd049932c50e9b9c0aca4b0c75a5d7c7502bc8572c641ef46bffad57e791149`.
- Branch: `codex/john-report-handoff-pilot`. No PR has been created for this candidate; Root publication and merge remain pending.
- Example: `examples/orchestrator-handoff/README.md`; exact synthetic sources/prompts/raw outputs and portable metadata projections in `study.json`, both frozen assessment projections, derived results, frozen formatter and offline verifier.

## Verification

- `npm run osc -- resume` and `./verify.sh --quick --quiet` passed before implementation.
- `python3 examples/orchestrator-handoff/verify.py` passed: 146 closed artifact entries, twelve ordered facts, fifteen captures, ten saved clock objects, six termination/fresh-reader links, both assessment projections and derived results.
- `python3 examples/orchestrator-handoff/formatter.py --check-parity` passed: frozen semantic SHA-256 `8adf7272ae2155782b1b4f67a2dc27df7c7a741676a6778158659368435cc7bd`; OSC 5,485 bytes/characters, plain 3,771 bytes and 3,769 characters.
- Local source comparison matched 112 materialized source bindings, exact safe strings, fifteen routing substitutions, the frozen formatter function body and all 27 assessor response projections. A corrected scan found no private absolute user paths in the seven example files. The first scan falsely matched the verifier's own generic path-detection literal.
- Twenty-four disposable-copy tamper cases failed nonzero for their intended reasons. Relationship cases recomputed affected local hashes before checking identities, source ordinals/categories/order, own-reader handoff, termination links, clock arithmetic, timing correction, excerpt binding, binary scores, secondary counts and derived results. Duplicate JSON members and unsafe file/reference paths also failed.
- `npm run build` passed. The initial `npm test` run passed 799/800 tests; the live release corpus reported an extra publication-traceability warning from Root's preimplementation preparation note. Its Branch field now uses the existing validator's supported spelling. The rerun passed all 56 test files and 800 tests. `./verify.sh --strict` passed with nine checks, zero failures and eighteen existing plan-intent history warnings. Committed-candidate checks remain pending.
- `git diff --check` passed after the example and note edits. Independent fresh implementation/tamper review remains pending.

## Outcome

The study is executed and scored; the example is not yet shipped. Both assessment projections retain all reader/coordinator fact scores, excerpts, omissions, unsupported claims, disagreement/open-decision findings and uncertainty without rescoring. The second assessor's worker diagnostics also remain. Original private artifact digests are opaque provenance; separately labeled projection hashes bind public projections. Public payloads do not reproduce full native inputs, because original routing text and hidden native system/tools context are unavailable publicly.

The original first plain-reader receipt falsely recorded 64 seconds from an estimated end. Original bytes remain; an append-only correction records a Root-attested 93-second parent bound. The later ten captures save actual clock responses. The corrected 1,139 = 1,110 + 29-second aggregate is bookkeeping, not provider latency. First-five timing remains Root attestation. Cooperative fresh-context isolation is not an OS/provider security boundary. Model identity/version, provider usage, exact tokens and cost remain unknown.

The experimental attributed envelope is a fixture format, not a shipped core schema. No core production code, documented contract, plan intent, package version or lifecycle state changed. Consistency checks establish neither execution authenticity nor assessor reasoning, authority, approval or product advantage. No scaling, significance, cost, runtime or named-model superiority claim follows.

## Follow-up

- Root performs independent review, fresh tamper tests and exact committed-head strict/build/test checks before any public pull request or merge.
- A harder recovery comparison requires separate preregistration; preserve this ceiling result and timing-method deviation.
