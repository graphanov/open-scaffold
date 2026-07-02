# Release / Evidence Note: 176-prepare-open-scaffold-0350-release-sync

## Summary

Prepared the `open-scaffold@0.35.0` release-sync candidate for the first-run setup package surface on current `origin/main`. This note records draft-PR preparation evidence only; it does not claim merge, npm publication, tag creation, GitHub Release creation, workflow dispatch, or owner approval for those follow-through actions.

## Traceability

- Roadmap / issue / task: https://github.com/graphanov/open-scaffold/issues/246.
- Plan: `.osc/plans/active/176-prepare-open-scaffold-0350-release-sync.md` while this prep PR is in progress; expected final path `.osc/plans/done/176-prepare-open-scaffold-0350-release-sync.md` after closeout.
- Release delta after the `0.34.0` release-sync: #242, #243, #245, and #247.
- Source PRs:
  - #242 - https://github.com/graphanov/open-scaffold/pull/242
  - #243 - https://github.com/graphanov/open-scaffold/pull/243
  - #245 - https://github.com/graphanov/open-scaffold/pull/245
  - #247 - https://github.com/graphanov/open-scaffold/pull/247
- Previous package line: `open-scaffold@0.34.0`.
- Branch / PR: branch `forge/issue-246-prepare-open-scaffold-npm-github-release`; draft PR https://github.com/graphanov/open-scaffold/pull/248.

## Verification

- PR overlap check before publication: `gh pr list --repo graphanov/open-scaffold --state open --json number,title,headRefName,isDraft,url --limit 20` - PASS: `[]`.
- `git fetch origin main` plus branch refresh to current `origin/main` - PASS: branch rebased/refreshed to `eb81bc2` (`Fix macOS brownfield preview target test (#247)`) before final verification.
- `npm run osc -- plan new 176-prepare-open-scaffold-0350-release-sync --stage active` - PASS: plan skeleton created by the repo-native CLI.
- `npm run osc -- evidence new 176-prepare-open-scaffold-0350-release-sync` - PASS: evidence skeleton created by the repo-native CLI.
- `npm version 0.35.0 --no-git-tag-version` - PASS: package metadata bumped without tag creation.
- Version alignment command - PASS: `package.json`, package-lock root, and package-lock `packages[""]` all read `0.35.0`.
- `npm view open-scaffold dist-tags --json` - PASS: `latest` is currently `0.34.0`.
- `npm view open-scaffold@0.35.0 version --json` - EXPECTED ABSENT: npm returned `E404`; `0.35.0` has not been published.
- `gh release view v0.35.0 --repo graphanov/open-scaffold --json tagName,url,isDraft,isPrerelease,publishedAt` - EXPECTED ABSENT: release not found.
- `gh release view 0.35.0 --repo graphanov/open-scaffold --json tagName,url,isDraft,isPrerelease,publishedAt` - EXPECTED ABSENT: release not found.
- `npm run osc -- plan validate 176-prepare-open-scaffold-0350-release-sync --strict` - PASS: 0 issues found.
- `git diff --check` - PASS.
- Live-corpus hash proof - PASS: Codex verified that excluding the new `176` plan/evidence returned the previous pinned hashes exactly (`a2f1bd25...` and `f0bff2ac...`); including the new release-prep records produced `d8d87779...` and `b128def2...` with no plan issues, no scaffold failures, and no new release warnings.
- `npm test -- --run tests/section-parser.test.ts` - PASS: 1 file / 7 tests.
- `./verify.sh --strict` - PASS: 9 pass / 0 fail / 1 warn (`Plan immutability check skipped` because the checker did not see this linked worktree as a full git repository).
- `npm test -- --run` - PASS: 51 files / 631 tests.
- `npm run build` - PASS: `build:core` and `build:runtime-omx` completed.
- `npm pack --dry-run --json` - PASS for `open-scaffold@0.35.0`, tarball `open-scaffold-0.35.0.tgz`, 228 files, 409611 bytes packed, 1881893 bytes unpacked, shasum `3ecd00bb5302b3b88545338d539512a42627d680`.
- `npm publish` and `npm publish --dry-run` - NOT RUN in final host verification; package publication and publish rehearsal remain owner-gated follow-through after review/merge.

## Outcome

Release-sync preparation is locally complete for `open-scaffold@0.35.0`: package metadata is aligned, release-prep plan/evidence records exist, changelog has a `v0.35.0` candidate entry, verification passes on the host, and no owner-gated release side effects were performed.

Owner-gated follow-through remains out of scope for this prep PR: merge, npm publishing, npm `latest` movement, tag creation, GitHub Release creation/Latest movement, workflow dispatch, settings, secrets, and post-publish smoke.

## Follow-up

- Keep PR #248 in draft/review until reviewer/Codex feedback is clean.
- After merge and owner gate: perform trusted publishing for `expected-version=0.35.0`, verify npm and GitHub Release availability, and record post-publish proof in a separate owner-gated follow-through record.
