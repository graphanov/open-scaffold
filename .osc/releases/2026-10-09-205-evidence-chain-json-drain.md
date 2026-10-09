# Release / Evidence Note: 205-evidence-chain-json-drain

## Summary

John Lomein, an AI maintainer, prepared a bounded source repair for [issue #310](https://github.com/graphanov/open-scaffold/issues/310): retain complete evidence-chain JSON through real child pipes while preserving all existing report/status contracts. Source implementation is pending.

## Traceability

- Issue: [#310](https://github.com/graphanov/open-scaffold/issues/310), unchanged public body SHA-256166891c7b9487259abaac49ca6f35e2e3e62d891b91549258b90cf496267b994. The public origin is source6abc8fbb35d4ec78e8bedf236332758561a5b558 and actual candidate7b146e25f0bfa46e8f9395d2e7c7c2ac2794e64c from independent intake; older bytes/rows are historical declarations whose raw outputs were not newly located.
- Plan: `.osc/plans/active/205-evidence-chain-json-drain.md`, SHA-256 `f63a6db4991bc8f2090524e4bfd21cd367102b6a372340e7127f560033dcb7ec`.
- Current public source: [ad5b2fbccdc3a22905add1ad98a6485f3318220b](https://github.com/graphanov/open-scaffold/commit/ad5b2fbccdc3a22905add1ad98a6485f3318220b); local preparation base04de7bc2456b7ba1643c16334d48932647701b1b includes only previously verified204 closeout metadata.
- Parent: `.osc/plans/active/184-john-six-day-maintainer.md` remains unchanged active3/5. Run ID/packet: N/A; no execution packet generated for record preparation. PR/merge pending.
- Batch: #310 alone; #311 offline study validation and#315 artifact qualification have independent paths/contracts/controls/rollback. Existing204 closeout may accompany a coherent evidence-record batch and stays separately traceable to [PR321](https://github.com/graphanov/open-scaffold/pull/321), not another repair.

## Verification

A fresh unchanged-source probe executed exactly8 product invocations (3 API,5 CLI),2 owned OS-temp synthetic fixtures, both copied/hash-checked and removed. Large valid API serialization was189,459bytes/48 rows. The real source CLI child pipe emitted65,536 invalid JSON bytes, an exact prefix, exit0; the same CLI to a regular file emitted all189,459bytes exactly. Small JSON1,416bytes and text981bytes matched API rendering. A deliberate absent local reference produced189,468 API bytes/48rows/broken1; the API wrapper process exited0 and its metadata computed strict and non-strict report exit1, while the actual CLI child pipe emitted a truncated65,536-byte prefix and exited1. All stderr was empty, with null signal/error and no buffer/timeout/tsx startup failures. These numbers belong to captured fresh producers, not a new human report or the old569,461-byte/178-row issue reproduction.65,536 is the observed environment cutoff, not a universal pipe capacity.

Maintained source before/after equals publicAD5 at17,027physical lines/41 files. The probe used Node26.6.0/source imports and pinned tsx4.23.15, not a separately installed or rebuilt package. Final retained Forge index6ddc040bf4f8feb1b7479c7ed9137c4ce7ec35e1f237f4e0661bc0f4b7cd42b2 covers197 byte-bound artifacts; seal d52c9c6d883dd3daac585538047b0053625e3d4e0b3ce93a2f031770d5f440d1. A fresh passive outcome audit verifies the raw counts/status distinctions, removed roots and unchanged source; finalization seal cca5974b3a4c614a9e4a704a2c5294352fa093cc080bedd82ba78178580c14c3. Hashes bind retained bytes, not signed authority or candidate success.

Immediate process.exit after stdout, the actual pipe/file discriminator and [version-matched Node process I/O documentation](https://nodejs.org/download/release/v26.6.0/docs/api/process.html#a-note-on-process-io) strongly support truncating pending asynchronous stdout. Patched-source causality remains unexecuted. The accepted private design assigns the same computed status to process.exitCode and returns only in the evidence-chain branch. Fresh independent design-review seal c5fe73075311cc503c0b21f787ddbfedd389145b030868772e5a295c635667ef binds30 artifacts and the exact three source/test paths, proposed readable+1 budget17,028/41 and original controls. The20,890baseline/counting roots/algorithm/POSIX check/file cap remain. Neither production nor metric has changed in preparation.

The pinned runner relays SIGTERM to its child and escalates the child; blindly killing its wrapper could orphan the descendant. A [requested spawnSync timeout](https://nodejs.org/download/release/v26.6.0/docs/api/child_process.html#child_processspawnsynccommand-args-options) is not a universal hard wall. Candidate full-output, no-error/no-signal, completion and status controls are still required; no patched or repaired passing result is asserted.

## Outcome

Preparation only. Source implementation is blocked pending exact accepted-plan/base/issue/path/candidate/portfolio binding and separate native Source admission. The design verdict confers no implementation, semantic proof, close decision, human approval or publication authority. All plan criteria remain unchecked.

## Follow-up

Implement only the admitted evidence-chain transport scope, preserve failed attempts and unchanged status/report functions, then record actual candidate output/termination and measured footprint. Run final committed-head verification and fresh full-publication review before public effects; obtain current GitHub review/CI/protection and actual merge/tree/issue readback before delivery. Installed/npm/compiler reproducibility/nativeWindows/human adoption/novelty and whole six-day finality remain unqualified.
