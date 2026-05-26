# Release / Evidence Note: 104-osc-work-dry-run-target

## Summary

Added `osc work <task-description> --runtime <preset> --dry-run` as the first natural-language composition layer in the Codex-first runtime adoption chain. The command previews a candidate plan, run packet, and dispatch command while refusing non-dry-run execution.

## Traceability

- Roadmap / issue / task: Milestone 19 — Post-v1 adoption workflow target.
- Plan: `.osc/plans/done/104-osc-work-dry-run-target.md`.
- Pull Request: implementation PR assigned after branch push.
- Public package sync: pending follow-up because this adds package-visible CLI behavior.

## Verification

- `npm test -- tests/cli-work.test.ts tests/artifacts.test.ts` — PASS, 13 tests.
- `npm test` — PASS, 43 files / 378 tests.
- `npm run build` — PASS.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- `git diff --check` — PASS.
- Scratch smoke `npm run osc -- work "Add a /health endpoint with tests" --runtime codex --dry-run` — PASS; output includes candidate plan preview, run packet preview, dispatch preview, scope confirmation, and no-spawn/no-write boundary text.
- Scratch JSON smoke `node_modules/.bin/tsx src/cli.ts work "Add a /health endpoint with tests" --runtime codex --dry-run --json` — PASS; JSON has schema `open-scaffold.work-dry-run.v1`, no-write/no-spawn booleans, executor spawning = `false`, and dispatch preview command.
- Private-marker scan over smoke outputs — PASS.

## Outcome

Repo implementation candidate is ready for PR review. `osc work --dry-run` is preview-only: it does not write `.osc/plans`, does not write `.osc/runs`, does not spawn runtimes, does not call provider APIs, and does not perform GitHub/npm/release side effects. Non-dry-run `osc work` exits with usage error until a separate safety design exists.

## Follow-up

- After PR integration, prepare a package/public-surface sync so npm `latest`, fresh `npx`, and GitHub Latest Release expose `osc work --dry-run`.
- Optional gated execution remains future work and requires a separate architecture/security decision.
