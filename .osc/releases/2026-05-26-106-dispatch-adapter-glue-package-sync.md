# Release / Evidence Note: 106-dispatch-adapter-glue-package-sync

## Summary

Prepared `open-scaffold@1.0.3` as the package/public-surface sync candidate for PR #125's `osc dispatch` adapter glue and PR validation checkout resilience. npm/latest and GitHub Latest Release publication are pending trusted-publishing follow-through after this candidate is integrated.

## Traceability

- Roadmap / issue / task: Milestone 19 — Post-v1 Codex-first runtime adoption chain; package-sync follow-through after PR #125.
- Plan: `.osc/plans/active/106-dispatch-adapter-glue-package-sync.md`.
- Run ID / run packet: N/A for release-sync.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/125.
- Release-sync Pull Request: pending.
- Trusted publishing run: pending.
- GitHub Release: pending.

## Verification

- `npm view open-scaffold version dist-tags --json` — PRECHECK: npm/latest remains `1.0.2` before this release-sync candidate.
- Fresh `npx --yes open-scaffold@latest --help` — PRECHECK: no `osc dispatch` command before this release-sync candidate is published.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- `npm test` — PASS, 42 files / 372 tests.
- `npm run build` — PASS.
- `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.3` (151 files, unpacked 1023178 bytes).
- `npm run osc -- --help | grep -F 'osc dispatch <run-json> --adapter <adapter-id>'` — PASS.
- `git diff --check` — PASS.
- PR CI / latest-head Codex review — pending.
- Trusted publishing workflow — pending.
- Post-publish `npm view open-scaffold version dist-tags --json` — pending.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` dispatch command smoke — pending.
- `gh release list --repo graphanov/open-scaffold --limit 5` — pending.

## Outcome

Pending. This candidate should close only after npm `latest`, fresh `npx`, and GitHub Latest Release match the `main` dispatch adapter glue surface.

## Follow-up

- After this package surface is aligned, continue with `104-osc-work-dry-run-target` as the next Codex-first runtime adoption slice.
