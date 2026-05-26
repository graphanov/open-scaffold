# Release / Evidence Note: 105-codex-runtime-adapter-package-release-sync

## Summary

Prepared the patch release-sync candidate for `open-scaffold@1.0.2` so npm/latest can catch up with PR #121's package-visible Codex runtime preset and `runtime-omx` adapter naming decision.

## Traceability

- Roadmap / issue / task: Milestone 16 / post-v1 Codex-first runtime adoption chain; release-sync follow-through after PR #121.
- Plan: `.osc/plans/active/105-codex-runtime-adapter-package-release-sync.md` until publication proof is complete.
- Run ID / run packet: N/A for release-sync candidate.
- Branch / Pull Request: pending.

## Verification

- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- `npm test` — PASS, 362 tests.
- `npm run build` — PASS.
- `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.2` (149 files, unpacked 1008030 bytes).
- `git diff --check` — PASS.
- Pending PR gates: CI green and latest-head Codex review clean.
- Pending publication gates: trusted publishing workflow success, npm registry verification, fresh isolated-cache `npx open-scaffold@latest runtimes list` includes `codex`, and GitHub Release `v1.0.2` marked Latest.

## Outcome

Release-sync candidate is prepared but not yet published. No runtime behavior beyond PR #121 is added here; `@open-scaffold/runtime-omx` remains private/repo-source only.

## Follow-up

- Open PR for version/changelog/evidence candidate.
- After merge, dispatch trusted publishing for `1.0.2`, verify npm/latest and fresh `npx`, then create/update GitHub Release `v1.0.2` as Latest.
- Close this plan only after public package and release surfaces are verified.
