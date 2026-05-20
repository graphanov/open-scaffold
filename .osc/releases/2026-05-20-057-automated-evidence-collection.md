# Release / Evidence Note: 057-automated-evidence-collection

## Summary

This slice adds `osc evidence collect <slug>` so a user can append a timestamped evidence block to an existing release/evidence note. The collector runs local verification, records git branch/commit/changed-file context, preserves existing note content, supports dry-run preview, and keeps PR/CI lookup behind explicit `--ci` opt-in.

## Traceability

- Roadmap / issue / task: Open Scaffold backlog plan 057; no GitHub issue; Kanban not mirrored for this slice.
- Plan: `.osc/plans/done/057-automated-evidence-collection.md`.
- Amendment: `.osc/plans/done/057-automated-evidence-collection-amendment-1.md` aligns the plan with the current `.osc/releases/` evidence-note path.
- Run ID / run packet: N/A — this was direct Shipwright execution, not a delegated runtime run.
- Branch / PR: branch `cli/evidence-collect`; PR `https://github.com/graphanov/open-scaffold/pull/70`.

## Verification

- `git diff --check` — pass.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.
- `npm test -- tests/evidence.test.ts tests/cli-plan-evidence.test.ts tests/plan-authoring-bundle.test.ts packages/runtime-omx/tests/no-spawn-boundary.test.ts --run` — pass; 4 files / 20 tests, including collect help handling, CLI-heavy timeout stability, and the cross-platform evidence allowlist fix.
- `npm test -- --run` — pass; 26 files / 226 tests.
- `npm run build` — pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded for package candidate `0.4.7`.
- `node dist/cli.js evidence collect --help` — pass; prints collect-specific usage instead of treating `--help` as a slug.
- `node dist/cli.js evidence collect 057-automated-evidence-collection --ci --dry-run` — pass; captured PR #70 and CI check using supported `gh pr checks` JSON fields (`bucket`, `state`, `workflow`, etc.).
- `node dist/cli.js evidence collect 057-automated-evidence-collection --dry-run` — pass; emitted a no-write collected block with `./verify.sh --standard`, branch, recent commits, tracked changes, untracked files, and skipped PR/CI note.
- `npm pack --dry-run --json` — pass; package candidate `open-scaffold-0.4.7.tgz`, 97 files.

## Outcome

`osc evidence collect <slug>` now extends the shipped `osc evidence new <slug>` path: it finds `.osc/releases/YYYY-MM-DD-<slug>.md`, preserves existing narrative content, and appends a collected block. Default collection stays local-only; `--ci` is required before `gh` PR/check calls are attempted. The package candidate version is `0.4.7` because the public CLI surface changed. Merge, npm publish, and GitHub Release latest remain owner-gated.

## Follow-up

- Owner review/merge gate for the PR.
- If merged, verify npm/latest drift and publish `open-scaffold@0.4.7` only with explicit owner approval.

## Automated collector dogfood

### Collected 2026-05-20T00:03:46.751Z

#### Verification

- Command: `./verify.sh --standard`
- Exit code: 0
```text
open-scaffold compliance check (--standard)

  PASS  Mission defined
  PASS  Plan file(s) found (92 in .osc/plans/)
  PASS  Amendment numbering is sequential (no gaps)
  PASS  Changelog entries match amendment files
  PASS  Release/evidence notes have required local structure
  PASS  Active plan stale-state heuristic clean

  ─────────────────────────────────
  6 pass, 0 fail, 0 warn
```

#### Git context

- Branch: cli/evidence-collect

- Recent commits:
```text
ac04f08 docs: switch README screencast to dark theme (#69)
a14ce57 docs: add README resume screencast (#68)
d9c85f0 Add run dry-run preview (#67)
cba2096 Add plan templates and plan validation (#66)
69100fd Refresh GitHub Actions runtime pins (#65)
```

- Changed files:
```text
Staged changes:
(none)

Working tree changes:
D	.osc/plans/backlog/057-automated-evidence-collection.md
M	MISSION.md
M	docs/WORKFLOW.md
M	package-lock.json
M	package.json
M	packages/runtime-omx/tests/no-spawn-boundary.test.ts
M	src/cli.ts

Untracked files:
.osc/plans/done/057-automated-evidence-collection-amendment-1.md
.osc/plans/done/057-automated-evidence-collection.md
.osc/releases/2026-05-20-057-automated-evidence-collection.md
src/evidence.ts
tests/evidence.test.ts
tests/fixtures/evidence-complete.md
tests/fixtures/evidence-empty.md
tests/fixtures/evidence-partial.md
```

#### PR / CI status

- PR/CI checks skipped by default — pass `--ci` to enable `gh` calls.

- CI environment:
```text
No CI environment variables detected.
```

#### Collection notes

- PR/CI checks skipped by default — pass --ci to enable gh calls
