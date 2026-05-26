# Release / Evidence Note: 106-dispatch-adapter-glue-package-sync

## Summary

Prepared and published `open-scaffold@1.0.3` as the package/public-surface sync for PR #125's `osc dispatch` adapter glue and GitHub Actions checkout resilience. The Actions checkout pattern now keeps private-repo compatibility through authenticated fetches while falling back to public unauthenticated refs when repository-token Git fetches are unavailable. npm `latest`, fresh isolated-cache `npx`, and GitHub Latest Release now match the integrated `main` dispatch adapter glue surface.

## Traceability

- Roadmap / issue / task: Milestone 19 — Post-v1 Codex-first runtime adoption chain; package-sync follow-through after PR #125.
- Plan: `.osc/plans/done/106-dispatch-adapter-glue-package-sync.md`.
- Run ID / run packet: N/A for release-sync.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/125.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/126.
- Workflow checkout hardening Pull Request: https://github.com/graphanov/open-scaffold/pull/127.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26452718895.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v1.0.3.

## Verification

- `npm view open-scaffold version dist-tags --json` — PRECHECK: npm/latest remained `1.0.2` before this release-sync candidate.
- Fresh `npx --yes open-scaffold@latest --help` — PRECHECK: no `osc dispatch` command before this release-sync candidate was published.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- `npm test` — PASS, 42 files / 372 tests.
- `npm run build` — PASS.
- `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.3` (151 files, unpacked 1023178 bytes before PR #127; 151 files, unpacked 1023209 bytes after PR #127).
- `npm run osc -- --help | grep -F 'osc dispatch <run-json> --adapter <adapter-id>'` — PASS.
- `git diff --check` — PASS.
- PR #126 CI / latest-head Codex review — PASS.
- PR #127 CI / latest-head Codex review — PASS; final clean Codex comment at 2026-05-26T13:54:22Z and unresolved review threads = 0 after fixed outdated threads were resolved.
- Main push CI after PR #127 — PASS: https://github.com/graphanov/open-scaffold/actions/runs/26452601331.
- Trusted publishing workflow — PASS: https://github.com/graphanov/open-scaffold/actions/runs/26452718895.
- Post-publish `npm view open-scaffold version dist-tags --json` — PASS: `version` = `1.0.3`, `latest` = `1.0.3`.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` dispatch command smoke — PASS: help includes `osc dispatch <run-json> --adapter <adapter-id>`.
- Fresh isolated-cache `npx --yes open-scaffold@1.0.3 --version` — PASS: `1.0.3`.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PASS: `v1.0.3 — Dispatch adapter glue` is Latest and targets `cc7ed253d2a6df0105730213993d1e6adce7932d`.

## Outcome

Complete. `open-scaffold@1.0.3`, npm `latest`, fresh isolated-cache `npx`, and GitHub Latest Release now expose the dispatch adapter glue surface and the hardened workflow checkout posture. The release-sync plan can move to `done/`; the next Codex-first runtime adoption slice is `104-osc-work-dry-run-target`.

## Follow-up

- After this package surface is aligned, continue with `104-osc-work-dry-run-target` as the next Codex-first runtime adoption slice.
