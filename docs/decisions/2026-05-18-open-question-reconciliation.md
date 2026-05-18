# Open Question Reconciliation — 2026-05-18

## Scope and cutoff

This note reconciles historical `## Open questions` in Open Scaffold plans after PR #52 merged and the visible implementation backlog was effectively exhausted.

Cutoff state:

- Cutoff commit: `a8640ce84b874f7b94c5e58599c3a7c3e75fed1b` (`main` after PR #52).
- Open PRs: none.
- Remote branches: `main` only.
- Kanban `open-scaffold`: no triage, todo, ready, running, or blocked tasks.
- Active plans at cutoff: none.
- Blocked plans at cutoff: none.
- Backlog plans at cutoff: `030-agent-runtime-selection-vision`, `031-agentic-orchestration-model-lab-vision`.
- Done plan files at cutoff: 54 files, including amendments; 44 parent plans.
- Release/evidence notes: 33 markdown files under `.osc/releases/`.
- Relevant wiki concepts: 12 pages under `docs/wiki/concepts/`.

This reconciliation does not edit historical done plans. Their old questions remain part of the record. This note is the current answer layer.

## Classification buckets

Historical open-question bullets were grouped into these buckets:

| Bucket | Count | Meaning |
|---|---:|---|
| `answered_by_shipped_pr_or_doc` | 51 | Later PRs, docs, release notes, tests, or package code already answer the question well enough. No new work. |
| `still_unanswered_concrete` | 9 | A small, testable follow-up could be planned. Only one becomes near-term backlog now. |
| `still_unanswered_speculative` | 15 | Interesting, but not actionable as near-term product work. Keep in parking lot, wiki, or future decision notes. |
| `catalyzed_product_direction` | 8 | The question affects roadmap/mission/product framing and needs owner approval before public direction changes. |
| `superseded_or_not_useful` | 5 | Later work made the question stale or answered it in a narrower way than originally imagined. |
| **Total historical bullets** | **88** | Excludes this plan's own active questions and the new `048` backlog plan created by this reconciliation. |

Counts are intentionally grouped by product decision, not by rewriting old plan files. Several old questions overlap; where a question both has a shipped partial answer and a speculative extension, the shipped answer wins unless the remaining work is small and testable.

## Current backlog classification

### `030-agent-runtime-selection-vision`

Classification: keep as broad hypothesis / not immediate execution.

What is answered now:

- Runtime choice is **not** a v1 `osc init --runtime` promise.
- Runtime selection exists as a v1-compatible extension point through `--runtime`, `--workflow`, runtime profiles, run packets, and adapter/agentic-runtime package boundaries.
- `docs/RUNTIME_SELECTION.md`, `docs/RUNTIME_PROFILES.md`, `docs/AGENTIC_RUNTIME_LAYER.md`, and `packages/runtime-omx/README.md` now answer the safe layer split.
- The first runtime target is OMX / oh-my-codex with `$ralplan`, but only as an explicit package-gated track, not hidden core spawning.

What remains open:

- Which external runtimes deserve built-in, adapter-candidate, or certified/support labels after public evidence.
- Whether runtime profile selection ever belongs in `osc init` after adapter packages prove useful.
- Whether Open Scaffold-native runtime work becomes a separate product track.

Decision: keep `030` as a strategic hypothesis container. Do not execute it directly next.

### `031-agentic-orchestration-model-lab-vision`

Classification: keep as broad hypothesis / parking-lot until stronger evidence exists.

What is answered now:

- Closed evolutionary loops can be expressed as contracts: slice-close, evaluation envelopes, audit envelopes, run packets, receipts, and postflight evidence already cover much of the loop without Open Scaffold owning runtime execution.
- The accepted executable track is not a multi-agent orchestration layer; it is an agentic runtime package boundary with OMX `$ralplan` first.
- Model-task recommendation remains outside core because no reproducible model/task benchmark evidence exists.

What remains open:

- Whether a model/task-fit artifact should be curated doctrine, adapter metadata, benchmark harness, eval registry, or an external research package.
- Whether multi-lane orchestration strengthens the source-of-truth moat or dilutes Open Scaffold into a generic agent platform.

Decision: keep `031` as a contested hypothesis. Do not promote it into roadmap/mission claims without owner approval.

## High-signal answered questions

### Evidence and release-note location

Answered by: `.osc/releases/`, `docs/SLICE_CLOSE_PROTOCOL.md`, PR #9, PR #10, and later release/evidence notes.

Current answer:

- `.osc/releases/` is the repo-local release/evidence-note convention for meaningful product slices.
- GitHub Releases remain the public package/version surface when versioned package releases happen.
- Evidence notes cite the final done-plan path, PR, verification, outcome, and follow-up.

No new work.

### Which first CLI helpers should exist

Answered by: PR #27 (`osc init`), PR #52 (`osc plan new`, `osc evidence new`), README/minimum/workflow docs, and generated downstream templates.

Current answer:

- The first useful CLI path is `osc init`, then `osc plan new`, then `osc evidence new`.
- Downstream docs should prefer `npx open-scaffold ...` when a persistent local `osc` binary is not guaranteed.
- Shell scripts remain the compatibility floor.

Follow-up: one concrete plan, `048-cli-lifecycle-parity`, should evaluate `osc amend` / `osc close` parity next.

### Runtime selection layer

Answered by: PR #36, PR #37, PR #49-#51, `docs/RUNTIME_SELECTION.md`, `docs/RUNTIME_PROFILES.md`, `docs/AGENTIC_RUNTIME_LAYER.md`, `docs/RUNTIME_BINDING_CONTRACT.md`, and `packages/runtime-omx/README.md`.

Current answer:

- Runtime selection is a profile/run-packet contract.
- Open Scaffold core does not spawn.
- Agentic runtime packages can consume run packets and launch only through explicit package-level gates.
- OMX `$ralplan` is the first proof lane.

No new broad runtime-selection PR is needed before concrete adapter/package evidence.

### Examples, demos, and wiki shape

Answered by: PR #22, PR #25, PR #27, PR #28, PR #43, PR #44, PR #45, docs examples, and `docs/wiki/` seed pages.

Current answer:

- Tiny downstream examples and the session-2 recovery walkthrough are enough for the current adoption path.
- The project wiki is public and method-level, not live task/PR state.
- First-touch docs now use plainer vocabulary and keep advanced terms deeper.

No new examples/docs slice is justified without a new adoption signal.

### Verification and CI

Answered by: PR #11, PR #12, PR #40, PR #41, PR #46, branch protection state, and release evidence.

Current answer:

- Strict verification catches plan/evidence/state drift locally.
- `osc eval` and `osc audit` provide structure-only envelope mechanics.
- GitHub Actions CI runs on PRs/main, and branch protection requires `ci`.

No immediate CI/verification backlog item.

## Still-unanswered concrete work

Only one concrete follow-up is promoted now.

### Created: `048-cli-lifecycle-parity`

Reason:

- PR #52 reduced first-plan and evidence-note friction.
- The remaining day-two lifecycle still jumps back to shell scripts for amend/close.
- This is small, testable, adoption-facing, and aligned with the current product layer.

Created plan:

- `.osc/plans/backlog/048-cli-lifecycle-parity.md`

Recommended next slice after this reconciliation:

- `048-cli-lifecycle-parity`

Other concrete candidates that should **not** be created yet:

- `osc runtimes check <id>` — useful later, but runtime package/adapter evidence should drive it.
- Cockpit event JSON schema — possible later, but no current adopter pain signal.
- Runtime OMX package publication/readiness — possible later, but current package still needs usage evidence.
- External-anchor / Merkle / ledger audit envelope mechanics — valid future option, but too speculative for near-term backlog.

## Speculative / parking-lot items

Keep these out of near-term backlog unless owner explicitly reopens them with a sharper proof target:

- native Open Scaffold runtime supervision;
- `osc spawn` in core;
- model/task-fit recommendation maps;
- benchmark/model-lab registry;
- certified third-party runtime integrations;
- workspace memory / `.osc/knowledge/` as a core feature;
- visual dashboard beyond existing operator-surface protocols;
- external ledger/hashgraph anchoring;
- stakeholder/client cockpit templates;
- metrics dashboards for cycle time, approval latency, or stale tasks.

These may belong in future wiki/parking-lot/ADR material, not active backlog today.

## Product-direction gates

Owner approval is required before changing public roadmap/mission/docs for these ideas:

1. Promoting runtime choice from extension point to v1 release promise.
2. Promoting Open Scaffold from evidence/control substrate to orchestration runtime.
3. Claiming model-task recommendations or model-lab capability.
4. Claiming certified runtime support beyond current evidence.
5. Advertising compliance-grade or tamper-evident ledger capability beyond structure-only audit/eval envelope mechanics.
6. Making open-question reconciliation a public product convention rather than a steward operating rule.

No roadmap or mission change is made in this PR.

## Superseded questions

Several historical questions are now stale because later slices made narrower decisions:

- Whether the first example should be docs-only, fixture, or separate repo: current answer is fixture/docs walkthrough first.
- Whether the first demo should be asciinema, screenshots, or transcript: current answer is text/docs-first, no media demo needed now.
- Whether first-read docs need a new `START_HERE.md`: current answer is README + minimum scaffold + workflow path.
- Whether branch protection should require CI after CI shipped: current answer is yes, and `ci` is already required.
- Whether runtime package should jump directly to real launch: current answer was no; no-spawn package first, then explicit `--allow-spawn` gate.

No new work.

## Reconciliation cadence

For Hermes roadmap stewardship, use this cadence:

- Run reconciliation when active plans are empty and only broad hypothesis backlog remains.
- Recommend reconciliation after five backlog-origin plans close since the last reconciliation.
- Use ten total plan/PR closures as a hard upper bound if the work was mostly small hygiene slices.

This cadence is now part of the roadmap steward skill. It is not yet a public Open Scaffold product convention.

## Final recommendation

The backlog is not empty anymore, but it should stay intentionally small.

Current near-term backlog after this PR:

1. `030-agent-runtime-selection-vision` — keep as broad hypothesis / not immediate execution.
2. `031-agentic-orchestration-model-lab-vision` — keep as contested hypothesis / not immediate execution.
3. `048-cli-lifecycle-parity` — concrete next implementation slice.

Recommended next slice:

- Plan: `.osc/plans/backlog/048-cli-lifecycle-parity.md`
- Branch: `cli/lifecycle-parity`
- PR title: `Add CLI lifecycle parity helpers`
- Goal: evaluate and implement the next smallest `osc amend` / `osc close` lifecycle helper path while keeping shell scripts as fallbacks.

Why this beats alternatives:

- It follows directly from PR #52.
- It improves first-user and day-two adoption.
- It avoids widening runtime/model-lab claims before evidence.
- It keeps Open Scaffold moving through small, verifiable product slices.

Do not include:

- runtime launch expansion;
- model-lab claims;
- roadmap/mission rewrite;
- cockpit/dashboard work;
- external anchor/compliance claims;
- closing or deleting `030` / `031` without owner approval.