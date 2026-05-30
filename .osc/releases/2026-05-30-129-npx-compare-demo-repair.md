# Release / Evidence Note: 129-npx-compare-demo-repair

## Summary

Published `open-scaffold@0.20.4` as the package-visible repair for plan `129-zero-context-resume-proof` AC-5: the advertised first-read `npx open-scaffold@latest compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` command now works from a fresh external directory, not only from the repository root.

This release keeps `osc compare` local and read-only. It does not add runtime spawning, model scoring, frontier promotion, approval automation, or a new stable command.

## Traceability

- Roadmap / issue / task: Open Scaffold self-dogfood package/adoption repair for plan 129; Hermes Kanban card `t_4ff11e15`.
- Plan: `.osc/plans/done/129-zero-context-resume-proof.md` after closeout; `.osc/plans/active/129-zero-context-resume-proof.md` during implementation and package/release follow-through.
- Repair branch: `fix/129-npx-compare-demo`.
- Repair Pull Request: https://github.com/graphanov/open-scaffold/pull/155.
- Repair merge commit: `2c8c81f973c500f43a7796645a92d7f790c7194e`.
- Trusted publishing workflow: https://github.com/graphanov/open-scaffold/actions/runs/26689646203.
- npm package: `open-scaffold@0.20.4` with dist-tag `latest`.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.20.4.
- Run ID / run packet: N/A for this scoped package repair.

## Verification

Reproduced pre-fix failure from a fresh temp directory and isolated npm cache against published `open-scaffold@latest` before the repair (`0.20.3`):

```text
npx --yes open-scaffold@latest compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b
attempt-a: attempt folder does not exist: examples/attempt-compare/attempt-a
```

Candidate gates before PR-ready:

- [x] Fresh published-package failure reproduced from external temp directory with isolated npm cache — PASS: pre-fix `open-scaffold@latest` exited 1 with `attempt folder does not exist`.
- [x] `npm test -- tests/package-payload.test.ts` — PASS: 1 file / 4 tests after adding extracted-package external-cwd compare regression.
- [x] `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `0.20.4 / 0.20.4 / 0.20.4`.
- [x] `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before publish: live npm remained `0.20.3`, `latest: 0.20.3`, and `0.20.4` was not yet published.
- [x] `npm run build` — PASS.
- [x] `npm test` — PASS after updating the live-corpus hash for this new evidence note: 53 files / 531 tests.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.20.4` (204 files); includes compare-demo inputs, resume-demo fixture, and `dist/cli.js`.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.20.4`.
- [x] Extracted-package compare smoke from a fresh external cwd — PASS: `node <extracted>/package/dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` rendered `# Attempt comparison: attempt-a → attempt-b`.
- [x] `git diff --check` — PASS.
- [x] PR CI and latest-head Codex review loop — PASS: PR #155 checks green, Codex clean, unresolved review threads zero.

Post-merge/publication gates after owner-approved follow-through:

- [x] Sync clean `main` after merge — PASS at `2c8c81f973c500f43a7796645a92d7f790c7194e`.
- [x] Trusted publishing workflow published `open-scaffold@0.20.4` with dist-tag `latest` — PASS: run `26689646203` succeeded.
- [x] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.20.4` and `latest: 0.20.4`.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest --version` reports `0.20.4`.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` succeeds from a fresh external directory.
- [x] GitHub Release `v0.20.4` exists and is marked Latest.
- [x] Source plan 129 is closed to `done/` with final public proof in this closeout branch.

## Outcome

Completed. PR #155 merged the package-path repair, trusted publishing succeeded, npm `open-scaffold@latest` resolves to `0.20.4`, fresh isolated-cache `npx` proves the zero-context compare demo from an external directory, GitHub Release `v0.20.4` is Latest, and plan 129 is closed to `done/` by the closeout branch.

## Follow-up

- Next roadmap decision can move to the next active/backlog slice only after this closeout branch lands on `main`.
