# Release / Evidence Note: first-run adoption hardening

## Summary

Open Scaffold's first-run path was hardened so the npm package and generated starter projects are cleaner for new adopters.

## Traceability

- Plan: `.osc/plans/done/038-first-run-adoption-hardening.md`
- Branch: `product/first-run-adoption-hardening`
- Package: `open-scaffold@0.4.1`
- npm: https://www.npmjs.com/package/open-scaffold/v/0.4.1
- Kanban: `t_028271b0`

## Verification

- `npm run build` → pass
- `npm test` → 14 files / 124 tests passed
- `npm pack --dry-run --json` → 82 files, forbidden product-history payload count `0`
- `node dist/cli.js init --tier standard --target <tmp>` plus leakage grep → pass
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn
- `git diff --check` → pass
- `npm publish --dry-run` → pass
- `npm publish --access public --ignore-scripts` → published `open-scaffold@0.4.1` from a prebuilt local dist
- `/tmp` smoke: `npx --yes --prefer-online open-scaffold@0.4.1 init --tier min --target <tmp>` → generated `MISSION.md` and `.osc/plans/handoff-template.md`

## Outcome

- The package is published on npm as `open-scaffold@0.4.1`.
- Public docs can truthfully show `npx open-scaffold init --tier min --target <repo>` as the normal first-run path.
- Generated standard-tier root docs are downstream-neutral rather than Open Scaffold product-repo copies.
- The npm payload excludes `.osc/plans/{active,backlog,done,blocked}` product history and dated `.osc/releases/2026-*` notes.

## Follow-up

Open a GitHub PR for the repo changes so GitHub main catches up with the already-published npm package. Merge remains owner-gated.
