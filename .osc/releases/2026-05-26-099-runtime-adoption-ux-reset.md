# Release / Evidence Note: 099-runtime-adoption-ux-reset

## Summary

Captured the post-v1 adoption workflow target as a Codex-first, adapter/dispatch path rather than a native runtime-in-core pivot. The repo now has a canonical target document for `osc work "TASK DESCRIPTION" --runtime codex`, mission/roadmap wording that preserves the core no-spawn boundary, and follow-up backlog plans for the staged implementation chain.

## Traceability

- Roadmap / issue / task: Milestone 19 — Post-v1 adoption workflow target.
- Plan: `.osc/plans/done/099-runtime-adoption-ux-reset.md`
- Source audit: post-v1 architecture/product/runtime/security audit synthesis; public-safe conclusions are promoted into this plan, roadmap milestone, and target workflow doc.
- Run packet: N/A — strategy/docs/backlog slice, no runtime handoff package.
- Branch / PR: `strategy/runtime-adoption-ux-reset`; https://github.com/graphanov/open-scaffold/pull/117.

## Verification

- `npm run osc -- plan validate .osc/plans/done/099-runtime-adoption-ux-reset.md` — passed.
- `npm run osc -- plan validate .osc/plans/backlog/100-verify-strict-filename-quoting.md` — passed.
- `npm run osc -- plan validate .osc/plans/backlog/101-osc-start-codex-agent-entry.md` — passed.
- `npm run osc -- plan validate .osc/plans/backlog/102-codex-runtime-adapter-package-hardening.md` — passed.
- `npm run osc -- plan validate .osc/plans/backlog/103-osc-dispatch-adapter-glue.md` — passed.
- `npm run osc -- plan validate .osc/plans/backlog/104-osc-work-dry-run-target.md` — passed.
- `./verify.sh --strict` — passed after plan closure: 10 pass, 0 fail, 0 warn.
- `npm test` — passed after docs/backlog changes: 40 files, 356 tests.
- `npm run build` — passed after docs/backlog changes.
- `git diff --check` — passed after docs/backlog changes.

Final PR readiness is determined after the last pushed commit and review loop, not by this note alone.

## Outcome

The target direction is now explicit: Open Scaffold should evolve toward a smooth `osc work` control loop while keeping core as the work record, policy, evidence, and verification layer. The next runtime-adoption work is Codex-first. The existing `packages/runtime-omx/` is treated as the current experimental Codex/OMX proof, not as a finished broad runtime platform.

## Follow-up

Recommended sequence:

1. `.osc/plans/backlog/100-verify-strict-filename-quoting.md`
2. `.osc/plans/backlog/101-osc-start-codex-agent-entry.md`
3. `.osc/plans/backlog/102-codex-runtime-adapter-package-hardening.md`
4. `.osc/plans/backlog/103-osc-dispatch-adapter-glue.md`
5. `.osc/plans/backlog/104-osc-work-dry-run-target.md`
6. Existing evidence-chain verifier and adapter-registry backlog after the above clarifies the adapter path.

Out of scope remains unchanged: no native runtime in core, no default-on spawning, no runtime package publication, no npm release, no GitHub Release update, and no automation-runner product PR resume in this slice.
