# Release / Evidence Note: 129-npx-compare-demo-repair

## Summary

Prepares `open-scaffold@0.20.4` as the package-visible repair for plan `129-zero-context-resume-proof` AC-5: the advertised first-read `npx open-scaffold@latest compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` command must work from a fresh external directory after publication, not only from the repository root.

This candidate keeps `osc compare` local and read-only. It does not add runtime spawning, model scoring, frontier promotion, approval automation, or a new stable command.

## Traceability

- Roadmap / issue / task: Open Scaffold self-dogfood package/adoption repair for active plan 129; Hermes Kanban card `t_4ff11e15`.
- Plan: `.osc/plans/active/129-zero-context-resume-proof.md` remains active until merge, npm publication, fresh `npx`, GitHub Release Latest, and final closeout proof are complete.
- Branch: `fix/129-npx-compare-demo`.
- Pull Request: pending; this note is the candidate evidence for the repair PR.
- Run ID / run packet: N/A for this scoped package repair.

## Verification

Reproduced pre-fix failure from a fresh temp directory and isolated npm cache against current published `open-scaffold@latest` (`0.20.3`):

```text
npx --yes open-scaffold@latest compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b
attempt-a: attempt folder does not exist: examples/attempt-compare/attempt-a
```

Candidate gates before PR-ready:

- [x] Fresh published-package failure reproduced from external temp directory with isolated npm cache — PASS: current `open-scaffold@latest` exits 1 with `attempt folder does not exist`.
- [x] `npm test -- tests/package-payload.test.ts` — PASS: 1 file / 4 tests after adding extracted-package external-cwd compare regression.
- [x] `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `0.20.4 / 0.20.4 / 0.20.4`.
- [x] `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before publish: live npm remains `0.20.3`, `latest: 0.20.3`, and `0.20.4` is not yet published.
- [x] `npm run build` — PASS.
- [x] `npm test` — PASS after updating the live-corpus hash for this new evidence note: 53 files / 531 tests.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.20.4` (204 files); includes compare-demo inputs, resume-demo fixture, and `dist/cli.js`.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.20.4`.
- [x] Extracted-package compare smoke from a fresh external cwd — PASS: `node <extracted>/package/dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` renders `# Attempt comparison: attempt-a → attempt-b`.
- [x] `git diff --check` — PASS.
- [ ] PR CI and latest-head Codex review loop — pending after PR creation.

Post-merge/publication gates after owner merge approval:

- [ ] Sync clean `main` after merge.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.20.4` with dist-tag `latest`.
- [ ] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.20.4` and `latest: 0.20.4`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` succeeds from a fresh external directory.
- [ ] GitHub Release `v0.20.4` exists and is marked Latest.
- [ ] Source plan 129 is closed to `done/` with final public proof.

## Outcome

Candidate prepared; not merged, not published, not released, and not closed yet. The repair changes packaged example-path resolution and adds regression coverage so the zero-context demo can be proven after trusted publication.

## Follow-up

- Owner/merge gate: merge the repair PR only after local verification, CI, and latest-head Codex are clean.
- After merge: publish `open-scaffold@0.20.4` through trusted publishing, verify fresh isolated-cache `npx`, create GitHub Release `v0.20.4` as Latest, then close plan 129 with final evidence.
