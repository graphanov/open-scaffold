# Release / Evidence Note: 058-doctor-auto-fix

## Summary

This slice turns `osc doctor` from a placeholder status print into a scaffold hygiene repair tool. The command can now diagnose and safely fix mechanical issues such as non-done plan status drift, missing amendment changelog entries, missing release README files, stale active plans that should be blocked, and narrow paired-view section drops.

## Traceability

- Roadmap / issue / task: accepted public backlog plan `058-doctor-auto-fix`; no GitHub issue; not mirrored to Kanban.
- Plan: `.osc/plans/done/058-doctor-auto-fix.md`.
- Run ID / run packet: N/A — direct John-Lo-Mein autopilot implementation; no runtime run packet needed.
- Branch / PR: branch `cli/doctor-auto-fix`; PR https://github.com/graphanov/open-scaffold/pull/74.
- Version candidate: `open-scaffold@0.4.8` in `package.json` / `package-lock.json` for owner-gated npm publication after merge.
- Owner gates: merge, npm publish, and GitHub Release creation/latest movement remain owner-gated.

## Automation provenance

- Opened/advanced by John-Lo-Mein autopilot.
- Cron job: `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`.
- Script: `open-scaffold-prrunner-webhook-runner.py`.
- Source: `cron-open-scaffold-pr-runner`.
- Owner gates: `merge`, `npm publish`, `GitHub Release`.

## Verification

- `npm run --silent osc -- doctor --help` → pass; documents `--fix`, `--dry-run`, `--severity`, and `--check`.
- `npm run --silent osc -- doctor --fix --dry-run` → pass; current repo reports `0 fix(es) would be applied` plus one unfixable broad paired-view drift warning for manual review.
- `npm test -- tests/doctor.test.ts --run` → pass; 1 file / 10 tests after Codex hardening for broad paired-view drift and malformed stale plans.
- `git diff --check` → pass.
- `npm test -- --run` → pass; 29 files / 248 tests.
- `npm run build` → pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `npm pack --dry-run --json` → pass; package candidate `open-scaffold@0.4.8`, 99 files, includes `dist/doctor.js` and `dist/doctor.d.ts` after build.
- `./verify.sh --strict` → pass; 10 pass / 0 fail / 0 warn.

## Outcome

`osc doctor` now has a real repair workflow: diagnostic output includes severity and fixability, `--fix --dry-run` previews planned repairs, `--fix` applies fixable repairs, `--check` limits diagnostics to one checker, and `--severity` filters output. The implementation deliberately avoids broad paired-view rewrites and does not auto-mutate historical done-plan status drift in the current repository, preserving done-plan immutability. A Codex review round on PR #74 found two safe-repair edge cases; the branch now reports broad paired-view drift as unfixable instead of clean and reports malformed stale active plans without crashing or partially moving files.

Out of scope: semantic plan judgment, backup snapshots, automatic verifier integration, npm publish, GitHub Release changes, merge, or broad dashboard/metrics work.

## Follow-up

- PR opened: https://github.com/graphanov/open-scaffold/pull/74.
- After merge, owner-gated package/release sync remains: publish `open-scaffold@0.4.8`, verify registry + `npx`, then create/mark GitHub Release `v0.4.8` Latest if approved.
