# Release / Evidence Note: 051-brownfield-init-from-existing

## Summary

Adds explicit brownfield initialization with `osc init --from-existing` so Open Scaffold can be adopted inside existing repositories without moving or overwriting user project files. Brownfield init detects common project markers, writes a mission draft that names the detected project type, includes agent instruction files even for the min tier, and keeps scaffold-owned conflict handling explicit.

## Traceability

- Roadmap / issue / task: Kanban `t_7c4a64fb`.
- Plan: `.osc/plans/done/051-brownfield-init-from-existing.md`.
- Run ID / run packet: `N/A` — local CLI/product slice, no runtime run packet needed.
- Branch: `cli/brownfield-init-from-existing`.
- PR: #60 — https://github.com/graphanov/open-scaffold/pull/60.

## Verification

- RED check: `npm test -- --run tests/init.test.ts tests/cli-init.test.ts` initially failed because `fromExisting` behavior did not exist and the CLI rejected `--from-existing`; independent review/Codex also exposed unsafe standard/max force semantics, incomplete monorepo detection, and root shell-script overwrite risk before the final fixes.
- Targeted GREEN: `npm test -- --run tests/init.test.ts tests/cli-init.test.ts` → 2 files / 41 tests passed.
- `npm run build` → pass.
- Full test suite: `npm test -- --run` → 22 files / 196 tests passed.
- Manual brownfield smoke: `node dist/cli.js init --from-existing --tier min --target <tmp>` against an existing Node.js repo preserved `package.json` and `src/index.js` hashes, generated `MISSION.md`, `.osc/`, `AGENTS.md`, and `CLAUDE.md`, and refused a second run with scaffold-owned conflicts listed.
- `git diff --check` → pass.
- `./verify.sh --strict` before closure → 10 pass / 0 fail / 0 warn.

## Outcome

`osc init --from-existing` is now the safe min-tier adoption path for real existing repositories. It is additive by default, refuses existing scaffold-owned paths unless `--force` is explicit, rejects standard/max brownfield tiers before they can overwrite user-owned docs, detects Node.js, Python, Go, Rust, monorepo, and generic existing projects, and documents the brownfield command in the first-use docs.

Out of scope: task-system autodetection, CI autodetection, semantic mission generation, runtime spawning, runtime registry, MCP server, dashboards, package publish, and mutations to user project files.

## Follow-up

- If users want deeper project analysis later, make that a separate semantic/wizard slice rather than expanding brownfield init.
- If PR is opened, patch this note or the PR body with the final PR URL and Codex review status.
