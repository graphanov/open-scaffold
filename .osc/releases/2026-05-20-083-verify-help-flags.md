# Release / Evidence Note: 083-verify-help-flags

## Summary

This pinpoint dogfood slice tightens the verification opacity surface. `./verify.sh --help` now prints explicit verifier usage instead of exiting with `Unknown flag`, and `osc verify --help` now prints usage instead of running normal checks.

## Traceability

- Roadmap / issue / task: Pinpoint dogfood surface `verification opacity`; no GitHub issue; not mirrored to a task board.
- Plan: `.osc/plans/done/083-verify-help-flags.md`.
- Run ID / run packet: N/A — pinpoint scout reproduction plus John-Lo-Mein autopilot advancement; no runtime run packet needed.
- Branch / PR: branch `fix/verify-help-flags`; PR pending John-Lo-Mein autopilot creation.
- Owner gates: merge, npm publish, and GitHub Release creation/latest movement remain owner-gated.

## Automation provenance

- Opened/advanced by John-Lo-Mein autopilot.
- Cron job: `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`.
- Script: `open-scaffold-prrunner-webhook-runner.py`.
- Source: `cron-open-scaffold-pr-runner`.
- Owner gates: `merge`, `npm publish`, `GitHub Release`.

## Verification

- Pre-fix reproduction: `./verify.sh --help` → exit 2, `Unknown flag: --help`.
- Pre-fix reproduction: `npm run --silent osc -- verify --help` → exited 0 but ran normal verification and printed the existing warning instead of usage.
- Pre-fix reproduction: `npm run --silent osc -- verify --json` → exited 0 and silently ignored the unsupported option.
- Post-fix reproduction: `./verify.sh --help` → exit 0, prints `Usage: ./verify.sh [--quick|--standard|--strict] [--quiet] [--help]` and exit code meanings.
- Post-fix reproduction: `npm run --silent osc -- verify --help` → exit 0, prints `Usage: osc verify` without running checks.
- Post-fix reproduction: `npm run --silent osc -- verify --json` → exit 2 with `Unknown option for verify: --json` and `Usage: osc verify` instead of silently ignoring the flag.
- `npm test -- tests/verify-help.test.ts --run` → pass; 1 file / 3 tests.
- `git diff --check` → pass.
- `npm test -- --run` → pass; 28 files / 238 tests.
- `npm run build` → pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `./verify.sh --strict` → pass; 10 pass / 0 fail / 0 warn.

## Outcome

Verification help/option probes now fail safely and explain themselves. The shell verifier has a real help screen, the CLI verifier has a safe `--help` path, and unsupported CLI verifier options no longer masquerade as successful verification.

Out of scope: `osc verify --json` machine-readable output, shell verifier JSON, verifier redesign, npm publish, GitHub Release changes, or merge.

## Follow-up

- Push/open a focused PR once GitHub write authentication is available.
- Consider a separate future `osc verify --json` plan if machine-readable verifier output becomes the next highest-friction surface.
