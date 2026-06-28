# Release / Evidence Note: 175-ambient-capture-trust-package-sync

## Summary

Prepared the `open-scaffold@0.34.0` release-sync candidate for the ambient capture trust/setup package surface now on `origin/main`. This note records draft-PR preparation evidence only; it does not claim merge, npm publication, tag creation, GitHub Release creation, or owner approval for those follow-through actions.

## Traceability

- Roadmap / issue / task: https://github.com/graphanov/open-scaffold/issues/239.
- Plan: `.osc/plans/active/175-ambient-capture-trust-package-sync.md` while this prep PR is in progress; expected final path `.osc/plans/done/175-ambient-capture-trust-package-sync.md` after closeout.
- Release delta from `v0.33.0` to current `origin/main`: #229, #230, #232, #236, #237, and #238.
- Source PRs:
  - #229 — https://github.com/graphanov/open-scaffold/pull/229
  - #230 — https://github.com/graphanov/open-scaffold/pull/230
  - #232 — https://github.com/graphanov/open-scaffold/pull/232
  - #236 — https://github.com/graphanov/open-scaffold/pull/236
  - #237 — https://github.com/graphanov/open-scaffold/pull/237
  - #238 — https://github.com/graphanov/open-scaffold/pull/238
- Previous release: https://github.com/graphanov/open-scaffold/releases/tag/v0.33.0.
- npm current latest before owner publishing: https://www.npmjs.com/package/open-scaffold/v/0.33.0.
- Run ID / run packet: N/A; this release-prep slice was implemented directly from issue #239's approved design and critique.
- Branch / PR: intended branch `forge/issue-239-release-open-scaffold-ambient-capture-trust-package`; draft PR not opened from this workspace because branch creation/commit publication is blocked by environment permissions.

## Verification

- `npm run osc -- resume` — PASS: handoff packet compiled; unrelated active plan `163-proof-harness-v2` noted.
- `./verify.sh --quick --quiet` — PASS before content edits.
- GitHub connector PR overlap search for issue #239, title, release scope, and branch — PASS: no open overlapping PR returned before edits.
- `git fetch --prune origin` — PASS; local `HEAD` and `origin/main` both at `46fe3f405076cc02001e9d73447109fbcddadfcb` before edits.
- `git log --oneline v0.33.0..origin/main` — PASS: release delta observed as #229, #230, #232, #236, #237, and #238.
- `npm version 0.34.0 --no-git-tag-version` — PASS: package metadata bumped without tag creation.
- Version alignment command — PASS: `package.json`, package-lock root, and package-lock `packages[""]` all read `0.34.0`.
- `npm view open-scaffold dist-tags --json` — BLOCKED in this workspace: `ENOTFOUND registry.npmjs.org`.
- `npm view open-scaffold@0.34.0 version --json` — BLOCKED in this workspace: `ENOTFOUND registry.npmjs.org`.
- `git show-ref --verify refs/tags/v0.34.0` — PASS negative local tag check: no local `v0.34.0` tag ref.
- `gh release view v0.34.0 --repo graphanov/open-scaffold` — BLOCKED in this workspace: `gh` could not connect to `api.github.com`.
- `git diff --check` — PASS.
- `./verify.sh --strict` — PASS before live-corpus hash refresh: 10 pass / 0 fail / 0 warn.
- `npm test -- --run tests/section-parser.test.ts` — EXPECTED FAIL before live-corpus hash refresh: only the pinned plan hash changed after adding the new release-prep plan/evidence corpus (`received a2f1bd25dae3e5eeebfed71332f0dd9334b00d87a4dcd97c7fdce1b799c3c3b4`).
- `npm run build` — PASS.
- `npm pack --dry-run --json` — initial run BLOCKED by the Hermes profile npm cache (`EPERM` under `.npm/_cacache/tmp`); rerun with `npm_config_cache=/private/tmp/open-scaffold-npm-cache` PASS for `open-scaffold@0.34.0`, tarball `open-scaffold-0.34.0.tgz`, 228 files, 406175 bytes packed, 1868312 bytes unpacked, shasum `40c386f49cf4440011723af94bf63d477e410cf2`.
- `npm_config_cache=/private/tmp/open-scaffold-npm-cache npm publish --dry-run --tag latest` — PASS dry-run only; npm reported `+ open-scaffold@0.34.0`. No real publish was performed.
- `npm test -- --run tests/section-parser.test.ts` after live-corpus hash refresh — PASS: 1 file / 7 tests.
- `./verify.sh --strict && npm test -- --run` after live-corpus hash refresh — PARTIAL / BLOCKED BY SANDBOX: strict verification passed again (10 pass / 0 fail / 0 warn), then full Vitest failed because this sandbox forbids local IPC/listen operations used by `node_modules/.bin/tsx` subprocesses and cockpit loopback tests (`listen EPERM` on `/var/.../tsx-501/*.pipe` and `127.0.0.1`). Observed test summary under that environment: 51 files, 30 passed / 21 failed; 625 tests, 458 passed / 167 failed; failures were dominated by subprocess/loopback listener setup, not assertion deltas in the release-prep files.
- `TSX_DISABLE_CACHE=1 node_modules/.bin/tsx src/cli.ts verify --help` — BLOCKED by same `listen EPERM` pipe failure.
- `node --import tsx src/cli.ts verify --help` — PASS: CLI help rendered.
- `node dist/cli.js --version` — PASS: `0.34.0`.
- `node dist/cli.js verify --help` — PASS: compiled CLI help rendered.
- Draft PR body generation with `$HERMES_HOME/scripts/john_lomein_comment_templates.py pr-draft-body` — PASS: generated public-safe Summary, Scope, Out-of-scope, Verification, Risk, Linked issue, and Authority boundary sections with an explicit keep-open explanation for issue #239.
- GitHub connector `_create_branch` for `forge/issue-239-release-open-scaffold-ambient-capture-trust-package` from `main` — BLOCKED: connector call was canceled by the environment before branch mutation.
- `git switch -c forge/issue-239-release-open-scaffold-ambient-capture-trust-package` — BLOCKED: local `.git/refs/...lock` cannot be created (`Operation not permitted`).
- `git push -u origin forge/issue-239-release-open-scaffold-ambient-capture-trust-package` — BLOCKED: local branch/refspec does not exist after the branch-create failure.

## Outcome

Draft release-sync preparation is complete locally for `open-scaffold@0.34.0`, but branch/commit/PR publication is blocked in this managed workspace by read-only local git metadata and canceled GitHub connector branch mutation. Owner-gated follow-through remains out of scope for automation: merge, npm trusted publishing, npm `latest` movement, tag creation, GitHub Release creation/Latest movement, and post-publish smoke must happen only after explicit owner approval.

## Follow-up

- Before draft PR: publish these prepared local changes to `forge/issue-239-release-open-scaffold-ambient-capture-trust-package` from an environment with git metadata write access or working GitHub connector mutation, then open the draft PR with the generated public-safe body.
- After merge and owner gate: dispatch trusted publishing for `expected-version=0.34.0`, verify npm `latest`, create GitHub Release `v0.34.0`, and record post-publish smoke evidence.
