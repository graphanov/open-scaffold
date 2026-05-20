# Release / Evidence Note: 084-macos-tmp-brownfield-init

## Summary

This slice fixes a macOS first-run brownfield smoke failure where targets under `/tmp` were rejected because `/tmp` is a system compatibility symlink to `/private/tmp`. Open Scaffold now canonicalizes that known alias before the existing symlink guard runs, while keeping arbitrary symlinked project paths and scaffold-owned destinations protected.

## Traceability

- Roadmap / issue / task: build-in-public Sentinel friction finding; Hermes Kanban card `t_217ac297`; no GitHub issue.
- Plan: `.osc/plans/done/084-macos-tmp-brownfield-init.md`.
- Run ID / run packet: N/A — direct John Lomein autopilot implementation; no runtime run packet needed.
- Branch / PR: branch `fix/macos-tmp-brownfield-init`; PR pending.
- Version candidate: `open-scaffold@0.4.8` remains the current unpublished release-train candidate; no publish-only bump in this PR.
- Owner gates: merge, npm publish, and GitHub Release creation/latest movement remain owner-gated.

## Automation provenance

- Opened/advanced by John Lomein autopilot.
- Cron job: `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`.
- Script: `open-scaffold-prrunner-webhook-runner.py`.
- Source: `cron-open-scaffold-pr-runner`.
- Owner gates: `merge`, `npm publish`, `GitHub Release`.

## Verification

- `npm test -- tests/init.test.ts --run` → pass; 1 file / 16 tests, including macOS `/tmp` alias regression coverage and existing arbitrary symlink rejection coverage.
- `npm run build` → pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `node dist/cli.js init --from-existing --tier min --target /tmp/osc-john-lomein-tmp-smoke-1779300306 --force` → pass; generated the scaffold under `/private/tmp/osc-john-lomein-tmp-smoke-1779300306` and verified `MISSION.md` exists with the mission-unset marker.
- `git diff --check` → pass.
- `npm test -- --run` → pass; 29 files / 249 tests.
- `npm pack --dry-run --json` → pass; package candidate `open-scaffold@0.4.8`, 99 files.

## Outcome

`init --from-existing --tier min --target /tmp/<fresh-dir> --force` now works on macOS instead of failing on the system `/tmp` symlink. The fix is intentionally narrow: it recognizes only the standard Darwin `/tmp` → `/private/tmp` alias and leaves the existing symlink safety checks in place for arbitrary target ancestors and scaffold-owned destinations.

Out of scope: broad brownfield redesign, standard/max brownfield tiers, arbitrary symlink allowance, npm publish, GitHub Release changes, merge, or deployment.

## Follow-up

- Patch this note with the real PR URL after PR creation.
- Owner-gated release-train work remains: publish the accumulated `open-scaffold@0.4.8` candidate, verify registry + `npx`, then create/mark GitHub Release `v0.4.8` Latest if approved.
