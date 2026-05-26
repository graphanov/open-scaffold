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
- `npm test -- tests/cli-start.test.ts` — pass; 1 file / 2 tests, including Codex/OMX prompt content, no fake `codex`/`omx` process spawn, no `.osc/runs` creation, no source-file mutation, and direct path support for a runtime-neutral prompt.
- CLI smoke: `npm run osc -- start 101-osc-start-codex-agent-entry --runtime codex` — pass; printed a no-spawn Codex/OMX handoff for the real active plan.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.
- `npm test` — pass; 41 files / 359 tests.
- `npm run build` — pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded.
- `git diff --check` — pass.
- `npm pack --dry-run --json` — pass; produced package candidate `open-scaffold-1.0.1.tgz`, 148 files, unpacked size 999.7 kB.
- `npm publish --dry-run` — pass; dry-run only, reported `+ open-scaffold@1.0.1`.

## Outcome

`osc start` now accepts a plan slug or direct plan path plus an explicit runtime (`codex`, `omx`, `plain`, `human`, or `custom`). The Codex path is intentionally framed as a Codex/OMX handoff while the direct adapter naming decision remains a follow-up. The command reads plan content, prints a prompt, and stops; it does not spawn agents, install runtimes, create `.osc/runs`, commit, push, open PRs, merge, publish, release, or deploy.

The public CLI surface changed, so this branch prepares package candidate version `1.0.1`. Merge, npm publish, and GitHub Release creation remain owner-gated.

## Follow-up

- Owner review/merge gate for the PR.
- If merged, verify npm/latest drift and publish `open-scaffold@1.0.1` only with explicit owner approval.
- Continue the staged runtime-adoption chain with plan 102: Codex/OMX adapter package hardening.
