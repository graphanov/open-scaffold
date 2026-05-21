# Release / Evidence Note: 089-runtime-omx-evolution-ledger-package-sync

## Summary

Prepared the package/release sync for the runtime OMX evolution ledger bridge that merged in PR #80. The root package candidate is `open-scaffold@0.4.10`, carrying the already-merged `osc evolve record --receipt/--evidence` bridge and the public evolution/runtime-binding docs to npm users without adding hidden spawning or new runtime authority.

## Traceability

- Roadmap / issue / task: Open Scaffold plan `089-runtime-omx-evolution-ledger-package-sync`; Kanban `t_b3b28c80`.
- Preceding implementation: PR #80, `088-runtime-omx-evolution-ledger-bridge`, merge commit `7c04c125fc261d7de95c1019067b2356885db758`.
- Plan: `.osc/plans/active/089-runtime-omx-evolution-ledger-package-sync.md` until the owner-gated publish/release follow-through is complete.
- Run ID / run packet: N/A — release sync executed directly by Hermes against the plan; no external runtime was spawned.
- Branch / PR: `release/runtime-omx-evolution-ledger-sync`; https://github.com/graphanov/open-scaffold/pull/81.
- Package candidate: `open-scaffold@0.4.10`.

## Verification

- `npm view open-scaffold version dist-tags time --json` before this slice — npm latest was `0.4.9`, matching GitHub Release `v0.4.9` and missing PR #80's post-0.4.9 bridge.
- `npm view open-scaffold@0.4.10 version` — returned npm `E404`; `open-scaffold@0.4.10` was not already published before the publish gate.
- `npx --yes open-scaffold@latest evolve --help` before publish — showed the pre-PR #80 public `record` surface without `--receipt` / repeatable `--evidence`.
- `npm version 0.4.10 --no-git-tag-version` — updated root `package.json` and `package-lock.json` to `0.4.10`.
- `node dist/cli.js evolve --help` after build — local candidate help includes `--receipt <dispatch-receipt.json>` and repeatable `--evidence <path>`.
- `git diff --check` — passed.
- `./verify.sh --strict` — passed with no warnings after keeping plan 089 active for the remaining owner-gated publish/release follow-through.
- `npm test -- --run` — 31 test files / 272 tests passed.
- `npm run build` — core and runtime-omx builds passed.
- `npm pack --dry-run --json` — produced `open-scaffold-0.4.10.tgz`, 102 files, unpacked size `697950`; included `dist/cli.js`, `dist/evolution.js`, `docs/EVOLUTION_LOOP.md`, and `docs/RUNTIME_BINDING_CONTRACT.md`; excluded `.osc-dev/`, `.osc/research/`, `.osc/runs/`, `.git/`, `node_modules/`, `02_Active_Projects/`, `.hermes/`, and runtime source paths such as `packages/runtime-omx/src/`.
- `npm publish --dry-run` — passed for `open-scaffold@0.4.10` with `latest` tag dry-run; no real publish performed.
- Local `npm whoami` currently returns `E401`, but real publication should use the existing GitHub Actions trusted-publishing workflow rather than local npm token auth.
- PR CI/Codex — pending after PR creation.
- Post-merge trusted publishing, npm registry verification, fresh `npx`, and GitHub Release `v0.4.10` — owner-gated until the version-bump PR is approved and merged.

## Outcome

The release-sync branch bumps the root package candidate to `0.4.10` and records the package/public-surface gate for the PR #80 runtime OMX evolution ledger bridge. Plan 089 remains active until the owner-gated merge, trusted publish, fresh `npx` smoke, and GitHub Release follow-through are complete. The intended public outcome after owner merge/publish/release gates is:

```text
npm latest: open-scaffold@0.4.10
GitHub Latest: v0.4.10 — Runtime OMX evolution ledger bridge
fresh npx: exposes the evolved osc evolve record receipt/evidence surface
```

This does not add hidden spawning, automatic frontier promotion, model ranking, compliance certification, or broad OMX workflow support. It only prepares publication of the already-merged bridge through public package and release surfaces.

## Follow-up

- Open the version-bump PR and run the latest-head Codex loop before merge approval.
- After owner merge approval, fast-forward `main`, dispatch `.github/workflows/publish-npm.yml` with `expected-version=0.4.10` and `npm-tag=latest`, then verify npm registry and fresh `npx` behavior.
- After npm verification, create GitHub Release `v0.4.10` targeting the merged `origin/main` commit and mark it Latest, if owner approval covers the release gate.
