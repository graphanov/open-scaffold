# Release / Evidence Note: 102-codex-runtime-adapter-package-hardening

## Summary

Hardened the Codex-first runtime adapter path by adding `codex` as the broad user-facing runtime preset while keeping the existing `runtime-omx` adapter package as the truthful OMX / oh-my-codex backend. The adapter now accepts `runtimeSelection.runtime = "codex"` and `"omx"`, writes receipts that preserve the selected runtime, and keeps core/runtime launch boundaries no-spawn by default.

## Traceability

- Roadmap / issue / task: Milestone 16 / post-v1 runtime adoption chain; no separate GitHub issue assigned for this local slice.
- Plan: `.osc/plans/done/102-codex-runtime-adapter-package-hardening.md`.
- Run ID / run packet: `.osc/runs/20260526T100150Z-102-codex-runtime-adapter-package-hardening-run/run.json` (ignored local smoke evidence).
- Branch / Pull Request: `runtime/codex-adapter-hardening`; PR pending.

## Verification

- `./verify.sh --quick --quiet` — PASS.
- `npm test -- tests/artifacts.test.ts tests/cli-init.test.ts packages/runtime-omx/tests/validation.test.ts` — PASS, 53 tests.
- `npm run build:runtime-omx && npm run test:runtime-omx` — PASS, runtime package build plus 47 runtime adapter tests.
- No-spawn local smoke: `osc run ... --runtime codex` followed by `node packages/runtime-omx/dist/cli.js <run.json>` — PASS; receipt written with `runtime_selection.runtime = "codex"`, `adapter_id = "runtime-omx"`, `runtime_backend = "omx"`, and `spawned = false`.
- `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` — PASS; strict verifier 10 pass / 0 fail / 0 warn; full test suite 362 tests.
- `npm pack --dry-run --json` — PASS for root package (`open-scaffold@1.0.1`, 149 files, unpacked 1007085 bytes).
- `npm pack --dry-run --json ./packages/runtime-omx` — PASS for runtime package dry-run (`@open-scaffold/runtime-omx@0.0.0`, 14 files, unpacked 50397 bytes).

## Outcome

Candidate implementation is locally verified. It documents the adapter naming decision (`codex` preset backed by `runtime-omx`), preserves package publication as owner-gated, and does not add core spawning, auto-install behavior, provider credentials, or full Codex/OMX support claims.

## Follow-up

- Open PR, trigger/poll Codex review, and merge only after latest-head CI/Codex gates are clean.
- Defer any direct `runtime-codex` package until separate source-grounded evidence proves a cleaner direct Codex adapter path.
