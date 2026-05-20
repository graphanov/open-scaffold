# Release / Evidence Note: 085-runtime-list-json

## Summary

This pinpoint dogfood slice tightens the runtime/profile boundary surface for automation. `osc runtimes list --json` now emits a parseable runtime profile summary instead of silently ignoring the flag and printing TSV.

## Traceability

- Roadmap / issue / task: Pinpoint dogfood surface `runtime/profile boundary`; no GitHub issue; not mirrored to a task board.
- Plan: `.osc/plans/done/085-runtime-list-json.md`.
- Run ID / run packet: N/A — pinpoint scout reproduction; no runtime run packet needed.
- Branch / PR: branch `cli/runtime-list-json`; PR https://github.com/graphanov/open-scaffold/pull/76.
- Automation provenance: Opened/advanced by John Lomein autopilot; cron job `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`; script `open-scaffold-prrunner-webhook-runner.py`; source `cron-open-scaffold-pr-runner`.
- Owner gates: merge, npm publish, and GitHub Release creation/latest movement remain owner-gated.

## Verification

- Pre-fix reproduction: `npm run --silent osc -- runtimes list --json` → exited 0 but silently ignored `--json` and printed TSV.
- Post-fix reproduction: `npm run --silent osc -- runtimes list --json` → exit 0; JSON parsed successfully; 5 runtime profiles returned.
- Post-fix reproduction: `npm run --silent osc -- runtimes list --bogus` → exit 2 with `Unknown option for runtimes list: --bogus` and `Usage: osc runtimes list [--json]`.
- Existing TSV path: `npm run --silent osc -- runtimes list` → exit 0; first row remained `omc\tbuiltin\tomc-claude\tadapter-candidate\tOMC / oh-my-claudecode`.
- `npm test -- tests/cli-init.test.ts --run` → pass; 1 file / 26 tests.
- `git diff --check` → pass.
- `npm test -- --run` → pass; 29 files / 249 tests.
- `npm run build` → pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `./verify.sh --strict` → pass; 10 pass / 0 fail / 0 warn.

## Outcome

Runtime profile listing is now scriptable without changing runtime semantics. The human TSV list remains available, while agents/coordinators can request JSON for profile id, source, path, lane, status, and display name.

Out of scope: runtime install, runtime registry, marketplace behavior, credential handling, real process spawning, npm publish, GitHub Release changes, or merge.

## Follow-up

- Review PR https://github.com/graphanov/open-scaffold/pull/76 and keep the owner merge gate explicit.
- Keep bundle-release treatment for package/release drift; this pinpoint does not require immediate npm publish by itself.
