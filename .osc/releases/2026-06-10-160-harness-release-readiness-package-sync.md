# Release / Evidence Note: 160-harness-release-readiness-package-sync

## Summary

Release-sync evidence for publishing the merged harness release-readiness work as `open-scaffold@0.31.1`.

The package-visible change is small and deliberate: public docs now explain current harness maturity more plainly, and the shipped CLI includes top-level help parity for `osc feedback --help` and `osc bench --help`. This release remains pre-1.0 hardening. It does not claim full live runtime stability, cost/token proof, broad benchmark dominance, compliance certification, production readiness, or a mature 1.0 contract.

## Traceability

- Roadmap / issue / task: harness migration release-readiness package sync after the final harness docs/readiness PR and plan closeout.
- Source plans: `.osc/plans/done/154-harness-command-surface.md`, `.osc/plans/done/155-controlled-runtime-parity.md`, `.osc/plans/done/156-feedback-handoff-improvement-parity.md`, `.osc/plans/done/157-reproduction-proof-parity.md`, `.osc/plans/done/158-team-control-room-adapter-parity.md`, and `.osc/plans/done/159-harness-release-readiness.md`.
- Source PRs: #192, #194, #195, #196, #197, #198, #199, and #200 in `graphanov/open-scaffold`.
- Release-sync plan: `.osc/plans/active/160-harness-release-readiness-package-sync.md` before public proof; move to `done/` after publication proof.
- Run ID / run packet: N/A for this scoped package/release sync.
- Branch / PR: `release/0.31.1-harness-readiness-sync` / https://github.com/graphanov/open-scaffold/pull/201.

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git switch main && git pull --ff-only origin main` — PASS: local `main` up to date after PR #200 merge at `ea1ecd6ddde7fc38b5d0988033ad5f0e7f6cee04`.
- `git status --short --branch` — PASS: clean `main...origin/main` before candidate branch.
- `node -p "require('./package.json').version"` — PASS: `0.31.0` before candidate bump.
- `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before candidate bump: `0.31.0`, `latest: 0.31.0`.
- `gh release list --repo graphanov/open-scaffold --limit 3` — PASS before candidate bump: `v0.31.0 — Framework cleanup shrink release` is Latest.

Candidate gates before PR-ready:

- [x] Version alignment — PASS: `0.31.1 / 0.31.1 / 0.31.1` for `package.json`, `package-lock.json`, and lockfile root package version.
- [x] `npm ci` — PASS: installed 88 packages; npm audit found 0 vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm test -- --run tests/section-parser.test.ts` — PASS: 1 file / 7 tests after intentional live-corpus hash updates.
- [x] `npm test -- --run` — PASS: 52 files / 553 tests.
- [x] `npm run build` — PASS: core TypeScript build and runtime-omx build.
- [x] `npm run osc -- doctor --check secret-scan` — PASS: `PASS secret-scan: no obvious token/webhook strings found.`
- [x] `npm pack --dry-run --json` payload inspection after rebuilding — PASS for `open-scaffold@0.31.1`; entry count 236; no `__pycache__`/`.pyc` files; required CLI/docs files present.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.31.1` with tag `latest`.
- [ ] Release candidate PR CI and review/thread gate.

Post-merge/publication gates after owner-approved follow-through:

- [ ] Sync clean `main` after release PR merge.
- [ ] Main CI for release commit.
- [ ] Post-merge local publish gates.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.31.1` with dist-tag `latest`.
- [ ] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.31.1`, `latest: 0.31.1`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` from an external temp directory passes.
- [ ] Fresh isolated-cache smokes for `osc feedback --help` and `osc bench --help` pass from the published package.
- [ ] GitHub Release `v0.31.1` exists, targets the merged `origin/main` release commit, and is marked Latest.
- [ ] This plan is closed to `done` with final public proof.

## Outcome

Pending. This branch prepares the candidate package/release truth. Public npm and GitHub Release proof must be recorded after the release-sync PR merges and trusted publishing completes.

## Follow-up

- After publish and GitHub Release creation, update this note, `docs/CHANGELOG.md`, and `docs/VERSION_TRUTH.md` from candidate/pending to published/latest, then close plan `160-harness-release-readiness-package-sync`.
