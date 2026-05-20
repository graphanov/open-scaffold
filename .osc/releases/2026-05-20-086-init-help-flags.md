# Release / Evidence Note: 086-init-help-flags

## Summary

This pinpoint dogfood slice tightens the first-run / brownfield init CLI surface. `osc init --help` now prints concise init-specific usage instead of exiting 2 with `Unknown option for init: --help` and dumping the full root help surface.

## Traceability

- Roadmap / issue / task: Pinpoint dogfood surface `brownfield init`; no GitHub issue; not mirrored to a task board.
- Plan: `.osc/plans/done/086-init-help-flags.md`.
- Run ID / run packet: N/A — pinpoint scout reproduction; no runtime run packet needed.
- Branch / PR: branch `fix/init-help-flags`; PR URL to be inserted after creation.
- Automation provenance: opened/advanced by John Lomein autopilot; cron job `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`; script `open-scaffold-prrunner-webhook-runner.py`; source `cron-open-scaffold-pr-runner`.
- Owner gates: merge, npm publish, and GitHub Release creation/latest movement remain owner-gated.

## Verification

- Pre-fix reproduction: `node dist/cli.js init --help` → exited 2 with `Unknown option for init: --help` and printed the root CLI help.
- Post-fix reproduction: `npm run --silent osc -- init --help` → exit 0; printed only init usage including `osc init --from-existing --tier min --target <dir> [--force]`.
- Post-fix reproduction: `npm run --silent osc -- init --json` → exit 2 with `Unknown option for init: --json` and init-specific usage.
- `npm test -- tests/cli-init.test.ts --run` → pass; 1 file / 28 tests.
- `git diff --check` → pass.
- `npm test -- --run` → pass; 29 files / 251 tests.
- `npm run build` → pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `./verify.sh --strict` → pass; 10 pass / 0 fail / 0 warn.

## Outcome

Init help probes are now safe for first-run and brownfield users. The fix does not alter scaffold generation, conflict handling, existing project preservation, or package/release behavior.

Out of scope: command-parser rewrite, semantic mission generation, package publish, GitHub Release latest movement, merge, or broader first-run strategy changes.

## Follow-up

- PR opened by John Lomein autopilot; continue latest-head CI/Codex review loop.
- Keep package/release drift bundled with other user-visible slices; this pinpoint does not require immediate npm publish by itself.
