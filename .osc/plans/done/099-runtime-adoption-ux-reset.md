# Plan: 099-runtime-adoption-ux-reset

## Status

done

## Context

A post-v1 eight-lane Claude Code audit found that Open Scaffold v1 is a credible protocol release, but the adoption path is still too manual: users can create plans and run packets, yet the bridge from "I have a task" to "my agent is working with durable evidence" is not legible enough. The owner accepted the recommendation to capture a future `osc work "..."` target, but corrected the next runtime-adapter direction from Claude Code to Codex-first.

## Goal

Capture the post-v1 Codex-first `osc work` target workflow and staged improvement chain in public repo truth without adding runtime spawning or provider coupling to core.

## Constraints / Out of scope

- Do not implement `osc work`, `osc start`, `osc dispatch`, adapter registry behavior, or runtime spawning in this slice.
- Do not add Claude Code-specific runtime work as the next default adapter path.
- Do not claim Open Scaffold core executes tasks today; it packages work and records evidence.
- Do not publish runtime packages, npm packages, or GitHub Releases in this slice.
- Do not resume autonomous PR runner/product automation as part of this strategy capture.

## Files to touch

- `docs/RUNTIME_ADOPTION_WORKFLOW.md` — new canonical target workflow and staged chain.
- `README.md` — link the target workflow and describe it as future direction, not current execution.
- `MISSION.md` — align the mission goals with Codex-first adapter/dispatch UX while keeping core non-spawning.
- `ROADMAP.md` — add the post-v1 adoption workflow target milestone.
- `.osc/plans/backlog/100-verify-strict-filename-quoting.md` — immediate security/trust follow-up.
- `.osc/plans/backlog/101-osc-start-codex-agent-entry.md` — no-spawn agent-entry command follow-up.
- `.osc/plans/backlog/102-codex-runtime-adapter-package-hardening.md` — Codex/OMX adapter package follow-up.
- `.osc/plans/backlog/103-osc-dispatch-adapter-glue.md` — adapter invocation glue follow-up.
- `.osc/plans/backlog/104-osc-work-dry-run-target.md` — future natural-language workflow command follow-up.
- `.osc/releases/2026-05-26-099-runtime-adoption-ux-reset.md` — evidence note for this strategy capture.

## Implementation Architecture Coverage

- Strengthens: workflow design, authority, adoption trust, runtime boundary clarity.
- Audit envelope: this plan, the new target workflow doc, roadmap/mission diffs, and follow-up backlog plans define the post-v1 improvement chain.
- Evaluation envelope: verification is documentation/source-truth consistency plus repo verification; implementation follow-ups remain separate plans.
- Feedback routing: if the owner changes the runtime target again, create a new plan or amendment rather than silently editing this chain.
- Boundary: runtime enforcement, adapter publication, provider auth, real process spawning, Codex/OMX session correctness, merge, publish, and compliance certification remain outside this slice.

## Acceptance criteria

- [x] The repo contains a public doc explaining the future `osc work "..." --runtime codex` target flow.
- [x] The doc separates current implemented truth from staged future work.
- [x] The staged chain starts with no-spawn UX (`osc start`) before adapter dispatch and optional gated execution.
- [x] The chain is Codex-first and does not promote a Claude Code adapter as the next default path.
- [x] The roadmap and mission reflect the adapter/dispatch target while preserving core no-spawn boundaries.
- [x] Follow-up backlog plans exist for security hotfix, no-spawn agent entry, Codex adapter hardening, dispatch glue, and future `osc work` dry-run.
- [x] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass before PR.

## Verification steps

1. Run `./verify.sh --strict` and confirm it passes.
2. Run `npm test` and confirm the test suite passes.
3. Run `npm run build` and confirm TypeScript builds.
4. Run `git diff --check` and confirm no whitespace errors.
5. Manually read `docs/RUNTIME_ADOPTION_WORKFLOW.md` and confirm it does not claim current autonomous execution in core.

## Open questions

- Should the public package name for the Codex-first adapter remain `@open-scaffold/runtime-omx`, become `@open-scaffold/runtime-codex`, or support both as separate adapter packages? This plan captures the decision point but leaves implementation to the adapter-hardening slice.
