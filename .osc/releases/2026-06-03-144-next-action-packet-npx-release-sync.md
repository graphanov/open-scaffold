# Release / Evidence Note: 144 next-action packet npx release sync

## Summary

Published `open-scaffold@0.30.1` as the owner-approved package/release sync for the `osc evolve analyze` next-action packet work from PRs #175 and #176.

The package-visible change is workflow-neutral handoff guidance: `osc evolve analyze` can emit a compact next-action packet for a fresh human, agent, or coordinator after context loss. Open Scaffold remains repo-native and no-spawn by default. This release does not claim benchmark support, model improvement, score improvement, workflow support, compliance certification, runtime correctness, or production readiness.

## Traceability

- Release-sync plan: `.osc/plans/done/144-next-action-packet-npx-release-sync.md`.
- Source feature PR: https://github.com/graphanov/open-scaffold/pull/175.
- Source closeout PR: https://github.com/graphanov/open-scaffold/pull/176.
- Release-sync branch / PR: https://github.com/graphanov/open-scaffold/pull/177.
- Release-sync merge commit: `55021ca8a88d3d8a5a2aebbaa248a98ca5db9976`.
- Main CI for release commit: https://github.com/graphanov/open-scaffold/actions/runs/26901024436.
- Trusted publishing workflow: https://github.com/graphanov/open-scaffold/actions/runs/26901169778.
- npm package: https://www.npmjs.com/package/open-scaffold/v/0.30.1 with dist-tag `latest`.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.30.1.
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
- [x] `./verify.sh --strict` — PASS with expected active-release-plan warning: 9 pass / 0 fail / 1 warn while this release-sync plan remained active before public proof.
- [x] Candidate plan validation — PASS: `npm run osc -- plan validate .osc/plans/active/144-next-action-packet-npx-release-sync.md --strict` reported 0 issues.
- [x] `npm pack --dry-run --json` payload inspection — PASS for `open-scaffold@0.30.1`; entry count 231; includes `dist/cli.js`, `dist/evolution.js`, `README.md`, `docs/EVOLUTION_LOOP.md`, and package metadata.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.30.1` with tag `latest`.
- [x] Release candidate PR #177 CI and latest-head Codex/thread gate — PASS: CI green, Codex latest-head clean comment after final push, no inline findings, and review threads total/unresolved = 0.

Post-merge/publication gates after owner-approved follow-through:

- [x] Sync clean `main` after release PR merge — PASS: `main` fast-forwarded to `55021ca8a88d3d8a5a2aebbaa248a98ca5db9976`.
- [x] Main CI for release commit — PASS: run `26901024436` succeeded.
- [x] Post-merge local gates — PASS: `git diff --check`, `npm test -- tests/section-parser.test.ts --run`, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `./verify.sh --strict`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [x] Trusted publishing workflow published `open-scaffold@0.30.1` with dist-tag `latest` — PASS: run `26901169778` succeeded.
- [x] `npm view open-scaffold version dist-tags --json --prefer-online` — PASS: `0.30.1`, `latest: 0.30.1`.
- [x] `npm view open-scaffold@0.30.1 version dist.tarball dist.integrity --json --prefer-online` — PASS: `0.30.1`, tarball `https://registry.npmjs.org/open-scaffold/-/open-scaffold-0.30.1.tgz`.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest --help` from an external temp directory — PASS.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest evolve analyze <loop> --format json` — PASS: `nextActionPacket.schema = open-scaffold.evolution-next-action-packet.v1`, `recommendedAction = redesign`.
- [x] Fresh isolated-cache markdown output — PASS: contained `## Next action packet`.
- [x] GitHub Release `v0.30.1` exists, targets `55021ca8a88d3d8a5a2aebbaa248a98ca5db9976`, and is marked Latest — PASS.
- [x] This plan is closed to `done` with final public proof — PASS in this closeout branch.

## Outcome

Completed. PR #177 merged the release-sync update, trusted publishing succeeded, npm `open-scaffold@latest` resolves to `0.30.1`, fresh isolated-cache `npx` proves the package-visible next-action packet surface from outside the repository, GitHub Release `v0.30.1` is Latest, and plan `144-next-action-packet-npx-release-sync` is closed to `done` by the closeout branch.

## Follow-up

- After the closeout branch merges, the release-sync plan should no longer appear in `.osc/plans/active/`.
- Next product work can proceed from the remaining backlog only after this closeout lands and trunk verification remains clean.
