# Release / Evidence Note: 101-osc-start-codex-agent-entry

## Summary

This slice adds `osc start <plan> --runtime codex` as a no-spawn agent-entry command. It renders an existing Open Scaffold plan into a paste-ready Codex/OMX handoff prompt with acceptance criteria, verification commands, evidence expectations, and approval boundaries, without launching a runtime or writing `.osc/runs` artifacts.

## Traceability

- Roadmap / issue / task: Open Scaffold backlog plan 101 from the post-v1 Codex-first runtime adoption chain.
- Plan: `.osc/plans/done/101-osc-start-codex-agent-entry.md`
- Run ID / run packet: N/A — `osc start` explicitly renders text and does not create run packets.
- Branch / PR: branch `cli/osc-start-codex-entry`; PR https://github.com/graphanov/open-scaffold/pull/119.

## Verification

- RED check: `npm test -- tests/cli-start.test.ts` failed before implementation because `osc start` was an unknown command; 2 tests failed as expected.
- `npm test -- tests/cli-start.test.ts` — pass; 1 file / 3 tests, including Codex/OMX prompt content, no fake `codex`/`omx` process spawn, no `.osc/runs` creation, no source-file mutation, direct path support for real plan files, and rejection of direct markdown paths outside `.osc/plans/{active,backlog,blocked,done}`.
- CLI smoke: `npm run osc -- start 101-osc-start-codex-agent-entry --runtime codex` — pass; printed a no-spawn Codex/OMX handoff for the real active plan.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.
- `npm test` — pass; 41 files / 360 tests.
- `npm run build` — pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `git diff --check` — pass.
- `npm pack --dry-run --json` — pass; produced package candidate `open-scaffold-1.0.1.tgz`, 148 files, unpacked size 1.0 MB.
- `npm publish --dry-run` — pass; dry-run only, reported `+ open-scaffold@1.0.1`.
- Trusted publishing run https://github.com/graphanov/open-scaffold/actions/runs/26444343837 — success; published from `main` commit `60d6c19de6ab352b6c284a0f88573a5032dd9b0d`.
- `npm view open-scaffold version dist-tags --json --prefer-online` — `1.0.1` with `latest` -> `1.0.1`.
- Registry tarball smoke from `open-scaffold@latest` — package version `1.0.1`; packaged CLI help contains `osc start <plan-slug-or-path>`; packaged `start` command is recognized.
- GitHub Release https://github.com/graphanov/open-scaffold/releases/tag/v1.0.1 — created and marked Latest.

## Outcome

`osc start` now accepts a plan slug or direct plan path plus an explicit runtime (`codex`, `omx`, `plain`, `human`, or `custom`). The Codex path is intentionally framed as a Codex/OMX handoff while the direct adapter naming decision remains a follow-up. The command reads plan content, prints a prompt, and stops; it does not spawn agents, install runtimes, create `.osc/runs`, commit, push, open PRs, merge, publish, release, or deploy.

The public CLI surface changed, so version `1.0.1` was published through GitHub Actions trusted publishing and GitHub Release `v1.0.1` is the current Latest release. A Codex P2 review finding on PR #119 tightened direct-path handling so `osc start` rejects markdown files outside the scaffold plan directories before parsing them.

## Follow-up

- Continue the staged runtime-adoption chain with plan 102: Codex/OMX adapter package hardening.
