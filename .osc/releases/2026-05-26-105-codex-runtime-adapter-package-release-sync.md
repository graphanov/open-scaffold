# Release / Evidence Note: 105-codex-runtime-adapter-package-release-sync

## Summary

Published `open-scaffold@1.0.2` so npm/latest, fresh `npx`, and GitHub Latest Release now include PR #121's package-visible Codex runtime preset and `runtime-omx` adapter naming decision.

## Traceability

- Roadmap / issue / task: Milestone 16 / post-v1 Codex-first runtime adoption chain; release-sync follow-through after PR #121.
- Plan: `.osc/plans/done/105-codex-runtime-adapter-package-release-sync.md`.
- Run ID / run packet: N/A for release-sync.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/122.
- Evidence closeout Pull Request: https://github.com/graphanov/open-scaffold/pull/124.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26447284708.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v1.0.2.

## Verification

- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- `npm test` — PASS, 362 tests.
- `npm run build` — PASS.
- `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.2` (149 files, unpacked 1008030 bytes).
- `git diff --check` — PASS.
- PR #122 CI — PASS.
- PR #122 latest-head Codex review — PASS, no major issues and zero unresolved current review threads.
- Trusted publishing workflow — PASS for `open-scaffold@1.0.2`.
- `npm view open-scaffold version dist-tags --json` — PASS: `version = 1.0.2`, `latest = 1.0.2`.
- Fresh isolated-cache `npx --yes open-scaffold@latest runtimes list` — PASS; output includes `codex\tbuiltin\tomx-codex\tadapter-candidate\tCodex via OMX / oh-my-codex`.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PASS; `v1.0.2 — Codex runtime preset package sync` is Latest.

## Outcome

`open-scaffold@1.0.2` is published and GitHub Release `v1.0.2` is Latest. npm/latest now matches `main` for the Codex runtime preset surface. No runtime behavior beyond PR #121 was added; `@open-scaffold/runtime-omx` remains private/repo-source only.

## Follow-up

- Continue the Codex-first runtime adoption chain with the next scoped slice: `103-osc-dispatch-adapter-glue` or `104-osc-work-dry-run-target`, based on whether adapter glue or user-facing dry-run UX should come first.
