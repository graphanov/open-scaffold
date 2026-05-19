# Plan: 075-brownfield-package-release-sync

## Status

done

## Context

PR #60 shipped `osc init --from-existing` on `main`, including safety tests for brownfield repositories and root project script preservation. GitHub truth now says brownfield init exists, and README/main can mention it.

The public package truth has not caught up yet: npm `latest` is still `open-scaffold@0.4.2`, and `npx --yes open-scaffold@latest --help` does not show `--from-existing`. A fresh user following the brownfield README path would hit `Unknown option for init: --from-existing`. That makes the just-shipped adoption path false until a package/release sync happens.

## Goal

Prepare the smallest package/public-surface sync needed for brownfield init: bump the package release candidate, verify the tarball and command surface, record evidence, and leave npm publish / GitHub Release as explicit owner gates.

## Constraints / Out of scope

- Do not run `npm publish` without explicit owner approval.
- Do not create or mark a GitHub Release without explicit owner approval.
- Do not implement plan wizard/templates/linter work from plans 052/053/055.
- Do not change runtime package distribution, runtime spawning, MCP, dashboards, task DB, or evidence-chain verifier behavior.
- Do not broaden this into a mission/roadmap wording pass.
- Keep the release sync limited to package version, public install truth, release evidence, and documentation needed to avoid stale package claims.

## Files to touch

- `package.json` — bump the release candidate version so the brownfield command can be published as a patch/minor release.
- `package-lock.json` — keep lock metadata aligned if the version changes.
- `.osc/releases/2026-05-19-075-brownfield-package-release-sync.md` — record package/public-surface evidence and gates.
- `MISSION.md` — close stamp after the package sync slice is locally verified.
- `.osc/plans/active/075-brownfield-package-release-sync.md` — this plan, moved to `done/` at slice close.

## Acceptance criteria

- [ ] Local `node dist/cli.js --help` exposes `osc init --from-existing --tier min --target <dir> [--force]`.
- [ ] `npm view open-scaffold version time dist-tags --json` is captured and shows npm latest still behind the brownfield command before publish.
- [ ] `npx --yes open-scaffold@latest --help` is captured and either lacks `--from-existing` before publish or shows it after owner-approved publish.
- [ ] `npm pack --dry-run --json` succeeds and confirms the package payload remains public-safe: no `.osc/research/`, `.osc/runs/`, `.osc/plans/done/`, or `.osc/plans/backlog/` payload.
- [ ] `npm publish --dry-run` succeeds for the release candidate.
- [ ] Build, tests, strict scaffold verification, and whitespace checks pass.
- [ ] Evidence states the exact owner gate for `npm publish` and GitHub Release creation.

## Verification steps

1. `npm view open-scaffold version time dist-tags --json` — capture current registry truth.
2. `npx --yes open-scaffold@latest --help` — capture current public command surface.
3. `npm run build` — local package builds.
4. `node dist/cli.js --help` — local command surface includes brownfield init.
5. `npm pack --dry-run --json` — package payload is public-safe and records file count/size.
6. `npm publish --dry-run` — publish candidate validates without performing a real publish.
7. `npm test -- --run`, `git diff --check`, and `./verify.sh --strict` — repo gates pass.

## Open questions

- Patch or minor version: default assumption is patch (`0.4.3`) because this exposes an already-merged CLI adoption feature without changing runtime boundaries.
- Publish gate: owner approval is required before running real `npm publish` or creating/updating the GitHub Release marked Latest.
