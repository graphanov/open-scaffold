# Plan: 076-plan-wizard-package-release-sync

## Status

done

## Context

PR #62 shipped `osc plan wizard` on `main`, including interactive and non-interactive plan creation plus a Codex-hardening regression for unset missions. GitHub truth now says the wizard exists, but public package truth has not caught up: npm `latest` is still `open-scaffold@0.4.3` and `npx --yes open-scaffold@latest --help` does not show `osc plan wizard`.

This slice exists to prevent the first-run adoption path from becoming false after a merged CLI feature. It follows the same narrow package/public-surface sync pattern used for plans 074 and 075.

## Goal

Prepare the smallest package/public-surface sync needed for the plan wizard: bump the package release candidate, verify npm/tarball/command-surface truth, record evidence, and leave real npm publish plus GitHub Release creation behind explicit owner gates.

## Constraints / Out of scope

- Do not run `npm publish` without explicit owner approval.
- Do not create or mark a GitHub Release without explicit owner approval.
- Do not implement plan templates, plan linter, run preview, evidence collection, dashboards, MCP, task database, or runtime work.
- Do not broaden this into mission/roadmap wording, runtime package distribution, or public positioning changes.
- Keep this release sync limited to package version, npm/latest command-surface truth, release evidence, and any minimal docs needed to avoid stale package claims.

## Files to touch

- `package.json` — bump the release candidate version so the merged wizard command can be published.
- `package-lock.json` — keep lock metadata aligned if the version changes.
- `.osc/releases/2026-05-19-076-plan-wizard-package-release-sync.md` — record package/public-surface evidence and owner gates.
- `MISSION.md` — close stamp after the package sync slice is locally verified.
- `.osc/plans/active/076-plan-wizard-package-release-sync.md` — this plan, moved to `done/` at slice close.

## Acceptance criteria

- [ ] Local `node dist/cli.js --help` exposes `osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]`.
- [ ] `npm view open-scaffold version time dist-tags --json` is captured and shows npm latest before publish.
- [ ] `npx --yes open-scaffold@latest --help` is captured and either lacks `osc plan wizard` before publish or shows it after owner-approved publish.
- [ ] `npm pack --dry-run --json` succeeds and confirms the package payload remains public-safe: no `.osc/research/`, `.osc/runs/`, `.osc/plans/done/`, or `.osc/plans/backlog/` payload.
- [ ] `npm publish --dry-run` succeeds for the release candidate.
- [ ] Build, tests, strict scaffold verification, and whitespace checks pass.
- [ ] Evidence states the exact owner gate for real `npm publish` and GitHub Release creation.

## Verification steps

1. `npm view open-scaffold version time dist-tags --json` — capture current registry truth.
2. `npx --yes open-scaffold@latest --help` — capture current public command surface.
3. `npm run build` — local package builds.
4. `node dist/cli.js --help` — local command surface includes `osc plan wizard`.
5. `npm pack --dry-run --json` — package payload is public-safe and records file count/size.
6. `npm publish --dry-run` — publish candidate validates without performing a real publish.
7. `npm test -- --run`, `git diff --check`, and `./verify.sh --strict` — repo gates pass.

## Open questions

- Patch or minor version: default assumption is patch (`0.4.4`) because this exposes an already-merged CLI adoption helper without changing runtime boundaries.
- Publish gate: owner approval is required before running real `npm publish` or creating/updating the GitHub Release marked Latest.
