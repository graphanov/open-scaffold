# November maintainer and dependency checks

## Summary

The scheduled reminder identified an expired trial. Replaying the detector on November 12 also found a delivered fix whose closeout had never reached main. The contributor PR and the two dependency PRs had separate work that could proceed.

## Traceability

- Plan: `.osc/plans/done/213-november-bot-follow-up.md`
- Stale plans: [reminder #280](https://github.com/graphanov/open-scaffold/issues/280) and [its scheduled run](https://github.com/graphanov/open-scaffold/actions/runs/42682331622).
- Dependency proposals: [#326](https://github.com/graphanov/open-scaffold/pull/326) and [#323](https://github.com/graphanov/open-scaffold/pull/323).
- The hostname change was pushed to the contributor’s branch. [Commit on #327](https://github.com/graphanov/open-scaffold/pull/327/commits/4b7e2786e883078f33f8abb1f2c390c573196d3b)
- Run packet: N/A. The owner assigned this follow-up directly.

## Verification

**October records.** Running the repository’s scheduled detection step with its 30-day threshold on public main `11d8efc` found plans 184 and 205 on November 12. The October trial had three of five criteria checked. Its continuation was paused when inspected. Moving 184 to `blocked/` changed only the folder and status value. [Trial disposition](2026-11-12-184-john-six-day-maintainer.md)

PR #322 was merged, issue #310 was closed, and the reviewed source and merge have the same Git tree. The original plan-205 closeout had also been independently verified in October. Restoring that record on its original base produced the exact verified tree `f324d30f5b9c79f75ee046917e14b395e025d426`. The scheduled detector found zero stale plans after these two corrections. Plan 205’s strict evidence-chain check passed. [Delivered repair](https://github.com/graphanov/open-scaffold/pull/322) · [Plan 205 evidence](2026-10-09-205-evidence-chain-json-drain.md)

**Dependency checks.** All cases used the official macOS arm64 Node 20.19.0 distribution, SHA-256 `c016cd1975a264a29dc1b07c6fbe60d5df0a0c2beb4113c0450e3d998d1a0d9c`, with npm 10.8.2. Each candidate had a fresh checkout and dependency installation.

| Candidate | Result |
| --- | --- |
| #326, `e5d9558` | `npm ci --engine-strict`, strict scaffold verification, the build, all 1,322 tests and CLI verification passed. The lockfile contains `@vitest/mocker@4.1.12`, the first patched version for both advisories. [First advisory](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) · [Second advisory](https://github.com/advisories/GHSA-xp26-3454-mjgp) |
| #323, `b0b08a9` | The same install exited 1 with `EBADENGINE`. Vitest 5.0.3 requires Node 22.12 or a later supported line. |
| Isolated `@types/node@26.6.5` update | The lockfile changes only the Node type definitions. An engine-strict install, strict verification, build, all 1,322 tests and CLI verification passed on main and with the patch applied over #326. The root development group now requests minor and patch updates together. Dependabot can still propose major versions separately. [Split commit](https://github.com/graphanov/open-scaffold/commit/2fde295c60fa7142cf0f846714f6cc3ff50a609e) · [Dependabot grouping rules](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#update-types-groups) |

**Contributor PR.** The generated-file test now checks each complete URL hostname before permitting a documentation example. All five focused tests passed, as did all five applicable GitHub checks. The addressed review thread was resolved. [CI](https://github.com/graphanov/open-scaffold/actions/runs/43186469234) · [Hostname review](https://github.com/graphanov/open-scaffold/pull/327#discussion_r4514942690)

The maintenance branch also passed `./verify.sh --strict` (nine passes, 18 historical warnings), `npm run build`, all 1,322 tests and `npm run osc -- verify`.

## Outcome

The trial is parked and its two unfinished criteria remain visible. The child fix is recorded as delivered. The dependency results support the Vitest 4 patch and the separate Node types update. The exact-version test remains with the contributor. [Outstanding review on #327](https://github.com/graphanov/open-scaffold/pull/327#discussion_r4424331990)

approval.status: approved
approval.rationale: Codex closed this owner-assigned maintenance review after verifying the record changes, the contributor-branch fix and the dependency results. The owner retains each merge decision.

## Follow-up

The owner decides merges. The scheduled reminder reads the default branch and will reconcile the issue after the record correction lands. Recheck the final contributor revision when its version test changes.
