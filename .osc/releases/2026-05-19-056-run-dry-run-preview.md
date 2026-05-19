# Release / Evidence Note: 056-run-dry-run-preview

## Summary

This slice adds `osc run <plan> --dry-run` so users can preview a run packet before creating durable `.osc/runs/` artifacts. The preview renders the `run.json` payload and package markdown in memory, supports JSON-only output for tools, reports non-executable blockers, and keeps Open Scaffold core non-spawning.

## Traceability

- Roadmap / issue / task: Open Scaffold backlog plan 056; Kanban task `t_e3c46180`.
- Plan: `.osc/plans/done/056-run-dry-run-preview.md`
- Run ID / run packet: N/A — this slice explicitly implements dry-run previews that do not create run packets.
- Branch / PR: branch `cli/run-dry-run-preview`; PR pending owner review.

## Verification

- `npm test -- tests/artifacts.test.ts tests/cli-run-dry-run.test.ts --run` — pass; 2 files / 11 tests.
- `npm run build` — pass; core TypeScript and `packages/runtime-omx` TypeScript builds succeeded for package candidate `0.4.6`.
- `npm test -- --run` — pass; 25 files / 215 tests.
- `git diff --check` — pass.
- Manual dry-run smoke against `.osc/plans/done/056-run-dry-run-preview.md` with `--runtime omx --workflow plan` — pass; emitted schema `open-scaffold.run.v1`, executable `true`, executor `omx-codex`, workflow `plan`, harness `$ralplan`, package prompt present.
- Dry-run no-write smoke — pass; `.osc/runs` entry count remained `14` before and after the preview.
- `./verify.sh --strict` — pass; 10 pass / 0 fail / 0 warn.
- `npm pack --dry-run --json` — pass; produced `open-scaffold-0.4.6.tgz`, 95 files, unpacked size 601,373 bytes.
- `npm publish --dry-run` — pass; dry-run only, reported `+ open-scaffold@0.4.6`.

## Outcome

`osc run` now accepts `--dry-run` and optional `--json`. Human output prints the generated `run.json`, package markdown, files-to-touch summary, blockers when present, and a no-write notice. JSON output emits `{ run, packageMarkdown, filesToTouch }` and exits non-zero when the package is not executable. Normal `osc run`, `delegate`, `review`, and `ultrareview` artifact creation behavior remains write-based and non-spawning.

The package candidate version is `0.4.6` because the public CLI surface changed. Merge, npm publish, and GitHub Release creation remain owner-gated.

## Follow-up

- Owner review/merge gate for the PR.
- If merged, verify npm/latest drift and publish `open-scaffold@0.4.6` only with explicit owner approval.
