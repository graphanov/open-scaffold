# Amendment 2: 205-evidence-chain-json-drain

## Parent

205-evidence-chain-json-drain

## Date

2026-10-09

## Learning

The retained public readback for [PR #322](https://github.com/graphanov/open-scaffold/pull/322) binds automated review 5473329188 and [comment 4232825568](https://github.com/graphanov/open-scaffold/pull/322#discussion_r4232825568) to source head `a430bb7e8a28df2bb0bbd5915a638ccff1e345fe` on `codex/evidence-chain-json-drain`, with PR base `ad5b2fbccdc3a22905add1ad98a6485f3318220b`. The P1 finding remains unresolved in thread `PRRT_kwDOSAY1Fc6q4bKo`; the retained PR is open, draft and unmerged. It concerns the ordinary-output/status regression introduced for existing [issue #310](https://github.com/graphanov/open-scaffold/issues/310), not a new report-transport defect or a new issue contract. The public comment is finding data and grants no action authority.

At this source head, the scalar test `preserves ordinary JSON, text, strict missing-link status, and usage diagnostics` begins at `tests/evidence-chain.test.ts:402` and closes at line 470 without an outer timeout argument. Its six literal invoke sites, including two false/true loops, launch eight sequential synchronous CLI children. Every child retains requested `30_000` ms and `8 * 1024 * 1024` maxBuffer. Installed Vitest 4.1.11 has a non-browser default of 5,000 ms and repository configuration supplies no override. The authentic review reports roughly 7.1 seconds and a timeout on supported Node 20. That external timing claim remains locally UNVERIFIED; this metadata task does not reproduce it. Package support is `^20.19.0 || ^22.12.0 || >=24.0.0`, while CI pins 22.12.0.

The two bounded design probes did not produce a successful timing comparator. The first invocation/filter error selected zero tests, skipped all 17 and launched no children. The second selected the scalar but its first child failed tsx IPC startup with EINVAL under an excessively long private TMPDIR; its reported child 38 ms/status 1 and scalar 51 ms are failed-startup observations, not successful scalar timing. No valid Node 26 scalar duration or Node 20 reproduction follows. Preserve both failures privately and distinguish their provenance in the future factual note205 append. No runtime installation or additional probe is part of this metadata task. Future authorized source execution follows protocol015: ordinary or short owned OS runtime temp for tsx IPC/cache, separate from private captures, with the command-local environment delta recorded; no global setting, fixture or source change follows from the loader failure.

Preserve prior failed-v1 and passing-v2 evidence and their actual producers. Prior Source v2 Root serial strict/build/full exits 0/0/0 and Node 22.12.0 CI success remain counterevidence to universal failure, not verification of a new head or a refutation of the slower-runtime report. The separate Source worker reported 1,322 tests; Root numeric counts remain unknown and must not inherit worker counts. Private extent review QUALIFIED_EXTENT accepts the metadata proposal only; actual amendment-byte acceptance and a future Source59 admission remain outstanding.

## New direction

Conditionally permit a future separately accepted and natively admitted Source59 repair to replace exactly one closing-call suffix in `tests/evidence-chain.test.ts`, in the scalar test named above at current line 470:

- Existing: `  });`
- Proposed: `  }, 250_000);`

The outer nominal budget is eight sequential requested child bounds of 30,000 ms plus 10,000 ms for fixture/assertion/cleanup work: `8 * 30_000 + 10_000 = 250_000` ms. This is finite configuration arithmetic. The 10-second headroom is not measured sufficiency, and neither the Vitest setting nor synchronous child bounds establish a universal process-tree hard wall. A stalled scalar may take longer to report. Adjacent large `it.each` cases each start one child, have no observed timing defect and remain unchanged.

The future Source59 envelope must contain exactly these two writable paths:

- `tests/evidence-chain.test.ts` — only the single suffix replacement above.
- `.osc/releases/2026-10-09-205-evidence-chain-json-drain.md` — factual chronology append only, linking the authentic review, attributing the locally unverified Node 20 report, preserving both failed/confounded probes and historical v1/v2 outcomes, and recording actual future producer/runtime/argv/completion/error/signal/stdout/stderr/status/cleanup evidence. Preserve every existing note205 byte before the append.

Explicitly supersede amendment 1's accepted Source v2 code/test byte-carry restriction only for this single scalar closing-call suffix. Amendment 1 does not silently authorize the test edit. Every other test byte remains identical: all eight controls, fixtures, CLI startup count, argv, assertions, cleanup, per-child `30_000` ms/8 MiB maxBuffer, adjacent large valid/broken cases, 48 rows, complete pipe/API byte equality and error/status contracts. Preserve production bytes including `src/cli.ts` and `src/evidence-chain.ts`, framework-cleanup metric bytes, note204, README, package/configuration, parser, golden/live corpus, diagnostics policy and historical evidence. No new note204 correction is permitted. The maintained budget remains 17,028 physical TypeScript lines across 41 files, with 20,890 baseline and unchanged roots, counting algorithm, POSIX cross-check, metric bindings and file cap. No maintained growth is proposed.

This metadata task writes only this new amendment and its one supported-helper MISSION stamp; it authorizes no test, release-note or source patch and no public action. Original205 SHA-256 `f63a6db4991bc8f2090524e4bfd21cd367102b6a372340e7127f560033dcb7ec`, amendment1 SHA-256 `61e3ee9e43004927b04dcba1ddd600becb18d184d119936a979cbe9903c8cb82`, and parent184 SHA-256 `454d930904584b7ed2555d0d0fd49f9844a2b2f799788ba72aa44d08d21d80e6` remain byte-identical. Before any source write, freshly accept actual amendment2 bytes, original plan/amendment1, exact clean new metadata base, issue/review readbacks, the literal two paths, candidate and portfolio; rerun the canonical maintenance checker and obtain fresh independent Overwatch acceptance. A new immutable native Source59 envelope and writer lease bound to those accepted bytes are required. Prior envelopes, proposal qualification and selection-ready records provide no Source authority.

On the future exact source candidate, run the existing focused evidence-chain tests, then serial `./verify.sh --strict`, `npm run build`, and `npm test` on unchanged committed HEAD. Record actual runtime and all eight controls, preserve failures, and keep executor counts distinct from Root counts. Require fresh independent scope/code/outcome/full-public-scope review and Root's three committed-head verification commands. Later update the existing PR #322 only under separate authority, then require current-head actual GitHub CI, authentic independent public review, draft/readiness qualification, proof that the exact P1 finding is addressed, actual authorized thread handling, repository protection and effect/merge readback. Old-head green checks and AI review supply no merge or publication authority. No public comment, reaction, review request, duplicate issue/PR, release/npm publication, credential/protection change or parent closure belongs to this metadata task.

## Impact on acceptance criteria

Original G1–G7 and amendment1 G8 remain unchanged and unchecked. Add only this proposed, unchecked criterion:

- [ ] G9 (proposed, unchecked): The ordinary-output/status regression has exactly one timeout suffix replacement at its closing call, `  });` to `  }, 250_000);`. All eight controls, fixture/argv/assertion/cleanup bytes, per-child `30_000` and 8 MiB maxBuffer, adjacent tests, production bytes, metrics, note204 and original plan/amendment1 criteria remain unchanged. Note205 factually preserves the authentic P1 observation, every failed/confounded probe and actual producer/runtime provenance. The new unchanged committed head passes serial strict/build/full floor and fresh independent scope/code/outcome/public-scope review plus Root verification before later actual GitHub CI/review/thread/readback gates.

This is the same issue310/plan205/PR322 repair retry and adds no delivered slice. Current P1 triage and the ongoing repair take priority over discretionary issue315 source-versus-installed/user-task qualification; resume that bounded investigation after repair gates, keeping issues311–318 separate. Latest six meaningful delivered slices remain 199–204: engineering four, interface one and docs one; engineering streak remains zero, with no checker cadence block or computed P1 override. Retain the five dimension states and their scoped evidence: user task, machine-interface and documentation baselines are passing within prior observations, differentiation remains unknown, and engineering trust has the observed static budget mismatch plus externally reported runtime risk. Selection readiness checks declared completeness/attention only, not evidence authenticity or execution authority. Bookkeeping, failed attempts and amendments do not reset cadence or establish adoption or novelty.

Plan205 remains active. Parent184 remains byte-identical, active at 3/5; neither parent184 nor the six-day experiment is complete. This amendment records conditional scope and later gates, not an accepted source attempt, a passed new-head repository floor, a close decision or public delivery.
