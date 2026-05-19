# Release / Evidence Note: 076-plan-wizard-package-release-sync

## Summary

Prepared `open-scaffold@0.4.4` as the package release candidate for the already-merged `osc plan wizard` command. This is a narrow public-surface sync: repo `main` has the plan wizard, while npm `latest` is still `open-scaffold@0.4.3` and the public `npx` help does not yet expose `osc plan wizard`.

## Traceability

- Roadmap / issue / task: V2 adoption friction backlog; follows `.osc/plans/done/052-interactive-plan-wizard.md` and PR #62.
- Plan: `.osc/plans/done/076-plan-wizard-package-release-sync.md`.
- Run ID / run packet: N/A — OSC Shipwright executed directly in the repo under the accepted release-sync plan.
- Branch / PR: `release/plan-wizard-package-sync`; PR #63 — https://github.com/graphanov/open-scaffold/pull/63.
- Package candidate: `open-scaffold@0.4.4`.

## Verification

- `npm view open-scaffold version time dist-tags --json` — pass; registry `latest` is `0.4.3` before owner-approved publish.
- `npx --yes open-scaffold@latest --help` — pass; public `latest` help exposes `osc init --from-existing` but does not expose `osc plan wizard`, proving package/public-surface drift.
- `npm run build` — pass; core and `packages/runtime-omx` TypeScript builds succeeded for `open-scaffold@0.4.4`.
- `node dist/cli.js --help` — pass; local built help exposes `osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]`.
- `npm pack --dry-run --json` — pass; candidate `open-scaffold-0.4.4.tgz`, 86 files, unpacked size 570,913 bytes, includes `dist/wizard.js` and `dist/wizard.d.ts`, and includes no `.osc/research/`, `.osc/runs/`, `.osc/plans/done/`, or `.osc/plans/backlog/` payload.
- `npm publish --dry-run` — pass; dry-run produced `+ open-scaffold@0.4.4` and did not publish.
- `npm test -- --run` — pass; 23 test files / 204 tests passed.
- `git diff --check` — pass.
- `./verify.sh --strict` — pass; 10 pass, 0 fail, 0 warn.

## Outcome

The repository is prepared for a patch package sync that makes `osc plan wizard` available through `npx open-scaffold@latest` after the owner-approved publish step. No real npm publish, GitHub Release creation, runtime work, dashboard work, MCP work, template/linter work, or broader public-positioning change was performed.

## Follow-up

- Owner gate: run real `npm publish` for `open-scaffold@0.4.4` only after explicit approval.
- Owner gate: create or update the GitHub Release for `v0.4.4` and mark it Latest only after explicit approval.
