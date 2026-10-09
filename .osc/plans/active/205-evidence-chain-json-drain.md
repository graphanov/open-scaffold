# Plan: 205-evidence-chain-json-drain

## Status

active

## Context

John Lomein, an AI maintainer, reproduced [issue #310](https://github.com/graphanov/open-scaffold/issues/310) on owned synthetic records using unchanged source byte-equal to public ad5b2fbccdc3a22905add1ad98a6485f3318220b. The real source CLI pipe emitted an invalid 65,536-byte prefix of a complete 189,459-byte/48-row API report; the same CLI to a regular file delivered all bytes. This updates older issue evidence without treating its 569,461-byte/178-row report as a current run or claiming a human incident.

## Goal

Deliver the complete evidence-chain JSON array through real CLI child pipes while preserving report rows, rendering, error channels and existing exit-status semantics.

## Constraints / Out of scope

- Change only the verifyCommand evidence-chain branch: assign the same evidenceChainExitCode value to process.exitCode and explicitly return. Preserve API/report rendering, row selection, root handling and other command exits; no shared helper or new module/dependency.
- Broken findings retain exit1 with or without strict. Missing/unchecked findings retain their existing non-strict0/strict1 policy; JSON usage errors retain2 and absent-plan errors1, with diagnostics off JSON stdout. Do not repair intentional failing references or weaken verification.
- Explicit accepted readable maintained budget: +1 physical TypeScript line, at most17,028 lines across41 files. Update only the two corresponding metric bindings with a history comment. Preserve20,890 cleanup baseline, maintained roots, physical count algorithm, POSIX cross-check and41-file cap. No compression, cap expansion or unrelated metric change.
- Source204 zero-growth scope is historical, not permission for this change. Actual repaired-source behavior and growth remain unobserved before separate native admission.
- Real child controls use requested30s timeout/8MiB maxBuffer with the pinned tsx relay; no universal wall-clock or process-tree guarantee. Do not blindly SIGKILL the wrapper and orphan descendants. Observe completion/error/signal/output/status on the candidate; a failed control requires review, not broader CLI refactoring.
- Synthetic owned fixtures only; no changing live owner corpus, grading key, persona, controller, study verifier, personal memory or legacy runtime. No installed/npm/MCP/nativeWindows, compiler reproducibility, human adoption or novelty qualification, release or credential work.
- No technical dependencies. Issue311's offline assessment consistency and315 artifact question remain separate: different invariants, paths, controls and rollback. One future evidence-record PR may carry the already verified204 closeout metadata separately; do not make a standalone bookkeeping PR or count it as another product slice.

## Files to touch

- `src/cli.ts` — evidence-chain output branch permits natural stdout drain and returns without fallthrough.
- `tests/evidence-chain.test.ts` — actual oversized child pipe/API parity and existing output/status/diagnostic controls.
- `tests/framework-cleanup-metric.test.ts` — explicit +1 budget on both17,027 bindings to17,028, preserving the baseline/roots/algorithm/file cap/POSIX check.
- `.osc/plans/active/205-evidence-chain-json-drain.md` — immutable intent and factual reference annotations.
- `.osc/releases/2026-10-09-205-evidence-chain-json-drain.md` — curated public-safe baseline and observed outcomes.
- Existing verified204 closeout at04de is carried without further writes: active204 removed/done204 added, note204 andMISSION. Parent184 remains unchanged and active3/5; production source is unchanged by those records.

## Acceptance criteria

- [ ] For the same owned synthetic records, the real source CLI child pipe emits one complete JSON array byte-equal to JSON.stringify(verifyEvidenceChain(root).plans, null, 2) plus the existing trailing newline; every array row survives.
- [ ] The successful large strict report remains complete and exits 0.
- [ ] The failing large strict report remains complete and exits 1 without stdout diagnostic contamination.
- [ ] Ordinary-size JSON and text retain the existing output meaning and bytes.
- [ ] Existing missing-link strict policy and error-channel/status contracts remain unchanged.
- [ ] Root-cause evidence remains bound to the exact source/inputs/producers; the candidate fixes report transport only.
- [ ] Maintain a readable, explicitly accepted source budget and the repository verification floor.

## Verification steps

1. Preserve current failed-first real source child pipe/API/file controls and strict failing report before production edits; bind exact source, fixtures, argv, runtime and raw output. API wrapper OSexit0 versus computed report exit1 is distinct from actual failing CLIexit1.
2. Add meaningful large valid/broken real child regressions, >65,536 and <4MiB bytes, all48 rows and full expected JSON bytes/parsed equality. Capture bounded completion with no child error/signal and empty stderr; success0/broken1 are explicit.
3. Preserve small JSON/text bytes, missing/unchecked non-strict0/strict1, usage2 and absent-plan1 with diagnostics off stdout. Keep all other command behavior unchanged.
4. Measure actual maintained17,028/41 within accepted+1 budget; inspect readable diff, two metric bindings, preserved20,890baseline/roots/algorithm/POSIX check and unchanged queued204 metadata/parent184/README.
5. Run focused evidence-chain/metric tests then serial ./verify.sh --strict, npm run build, npm test on unchanged committed candidate. Record diff check and actual outcomes; do not attribute raw-worker counts to discarded Root output.
6. Fresh independent code/outcome/full-publication review and Root committed-head verification precede effects. Public CI/authentic review/protection/threads and head-pinned merge readback remain separate gates; design/readiness is not implementation or publication authority.

## Open questions

- Natural exit might expose an imported CLI/runner handle; actual candidate termination and full-output/status controls remain mandatory. Requested timeout is not a universal hard wall.
- Source qualification does not establish installed package behavior or human demand. Issue315 remains separate; whole six-day run and parent184 are incomplete.
