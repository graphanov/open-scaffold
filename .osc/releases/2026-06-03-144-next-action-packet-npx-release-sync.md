# Release / Evidence Note: 144 next-action packet npx release sync

## Summary

Prepares `open-scaffold@0.30.1` as the owner-approved package/release sync for the `osc evolve analyze` next-action packet work from PRs #175 and #176.

The package-visible change is workflow-neutral handoff guidance: `osc evolve analyze` can emit a compact next-action packet for a fresh human, agent, or coordinator after context loss. Open Scaffold remains repo-native and no-spawn by default. This release does not claim benchmark support, model improvement, score improvement, workflow support, compliance certification, runtime correctness, or production readiness.

## Traceability

- Release-sync plan: `.osc/plans/active/144-next-action-packet-npx-release-sync.md` while candidate/publication gates are not complete.
- Source feature PR: https://github.com/graphanov/open-scaffold/pull/175.
- Source closeout PR: https://github.com/graphanov/open-scaffold/pull/176.
- Release-sync branch: `release/0.30.1-next-action-packet`.
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/177.
- Trusted publishing workflow: not run yet for `0.30.1`.
- npm package: not published yet for `open-scaffold@0.30.1`.
- GitHub Release: not created yet for `v0.30.1`.
- Run ID / run packet: N/A for this scoped package/release sync.

## Verification

Baseline live-truth inspection before release-sync edits:

- `git status --short --branch` — PASS: clean `main...origin/main` after PR #176 merge.
- `git fetch --prune origin` — PASS.
- `node -p "require('./package.json').version"` — PASS: `0.30.0` before candidate bump.
- `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before publish: `0.30.0`, `latest: 0.30.0`.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PASS before publish: `v0.30.0 — Blueprint security and adoption release` was Latest.
- `gh pr list --repo graphanov/open-scaffold --state open` — PASS before candidate branch: none after PR #176 merged.

Candidate gates before PR-ready:

- [x] Version alignment — PASS: `0.30.1 / 0.30.1 / 0.30.1` for `package.json`, `package-lock.json`, and lockfile root package version.
- [x] `npm ci` — PASS: installed 88 packages; npm audit found 0 vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] Focused evolution/package tests: `npm test -- tests/evolution.test.ts tests/cli-evolution.test.ts tests/package-payload.test.ts tests/section-parser.test.ts --run` — PASS: 4 files / 57 tests.
- [x] `npm test -- --run` — PASS: 56 files / 633 tests.
- [x] `npm run build` — PASS: core TypeScript build and runtime-omx build.
- [x] `npm run osc -- doctor --check secret-scan` — PASS: `Doctor: no issues found.`
- [x] `./verify.sh --strict` — PASS with expected active-release-plan warning: 9 pass / 0 fail / 1 warn while this release-sync plan remains active before public proof.
- [x] Candidate plan validation — PASS: `npm run osc -- plan validate .osc/plans/active/144-next-action-packet-npx-release-sync.md --strict` reported 0 issues.
- [x] `npm pack --dry-run --json` payload inspection — PASS for `open-scaffold@0.30.1`; entry count 231; includes `dist/cli.js`, `dist/evolution.js`, `README.md`, `docs/EVOLUTION_LOOP.md`, and package metadata.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.30.1` with tag `latest`.
- [x] Release candidate PR created for final gate: https://github.com/graphanov/open-scaffold/pull/177. Final merge readiness is determined from the PR conversation/checks after the last push, not from this committed evidence note.

Post-merge/publication gates after owner-approved follow-through:

- [ ] Sync clean `main` after release PR merge.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.30.1` with dist-tag `latest`.
- [ ] `npm view open-scaffold version dist-tags --json --prefer-online` confirms `0.30.1`, `latest: 0.30.1`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` from an external temp directory passes.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest evolve analyze <loop> --format json` proves `nextActionPacket.schema = open-scaffold.evolution-next-action-packet.v1`.
- [ ] Fresh isolated-cache markdown output contains `## Next action packet`.
- [ ] GitHub Release `v0.30.1` exists, targets the merged `main` commit, and is marked Latest.
- [ ] This plan is closed to `done` with final public proof.

## Outcome

Not complete. This candidate evidence note must not be read as publication proof until the trusted-publishing, fresh `npx`, GitHub Release, and closeout gates above are checked off with real command output.

## Follow-up

- Keep this release-sync plan active until npm/latest, fresh `npx`, GitHub Release Latest, and closeout evidence are real.
- Do not start a new product slice until this release/public-surface train is either completed or explicitly parked with a blocker.
