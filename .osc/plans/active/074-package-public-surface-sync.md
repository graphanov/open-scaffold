# Plan: 074-package-public-surface-sync

## Status

active


## Context

Plan 050 reconciled a stale claim that Open Scaffold was unpublished. Live evidence shows `open-scaffold@0.4.1` exists on npm and `npx open-scaffold@latest init --tier min --target <tmp>` works.

The same reconciliation found narrower public-surface drift that should not be hidden inside the initial-publish plan:

- npm `latest` still exposes the older CLI help surface and does not include current `main` lifecycle helpers such as `osc plan new`, `osc plan move`, `osc amend`, `osc evidence new`, and `osc close`.
- npm package metadata was incomplete before plan 050 reconciliation (`repository`, `homepage`, and `keywords` were absent from the published metadata).
- `npm pack --dry-run --json` shows the root package does not include `packages/runtime-omx/`, while multiple shipped docs reference that repo path.
- Publishing a new package version remains an explicit owner gate and should not happen as an incidental docs or plan cleanup side effect.

## Goal

Make the public install/package surface truthful again: decide the next version/publish action, ensure npm metadata and README/docs match the package users actually receive, and make the runtime package distribution story explicit before any owner-approved publish.

## Constraints / Out of scope

- Do not run `npm publish` without explicit owner approval.
- Do not merge or create a GitHub Release without owner approval.
- Do not change the OMO/OMX runtime roadmap or add new runtime behavior in this plan.
- Do not implement brownfield init, plan wizard/linter, docs compression, dashboards, task database, evidence-chain verifier, or registry behavior.
- Keep this focused on package metadata, shipped docs, tarball contents, and release/public-surface truth.

## Files to touch

- `package.json` — version/release metadata and `files` allow-list decisions, if needed.
- `README.md` — only if first-run/package wording needs to match the public package.
- `docs/RUNTIME_*`, `docs/AGENTIC_RUNTIME_LAYER.md`, `docs/SPAWNING_BOUNDARY.md`, and/or package docs — only where runtime package path references need package-distribution clarification.
- `packages/runtime-omx/` package metadata/docs — only if the chosen distribution contract needs a local package metadata/readme patch.
- `.osc/releases/` — release/package evidence note for the final owner-approved sync.

## Acceptance criteria

- [ ] `npm view open-scaffold version time dist-tags --json` is compared against local `package.json` and the intended release version.
- [ ] `npx --yes open-scaffold@latest --help` is compared against `node dist/cli.js --help`, and any remaining command-surface drift is either fixed by an owner-approved publish or explicitly documented as pending.
- [ ] `npm view open-scaffold --json` metadata has repository, homepage, bugs, license, description, and keywords after the next publish.
- [ ] `npm pack --dry-run --json` confirms no private/dogfood payload ships and records an explicit package footprint budget or rationale.
- [ ] Shipped docs do not imply that `packages/runtime-omx/` is available inside the root `open-scaffold` npm payload unless that path is actually included or clearly labeled as a repo/GitHub path.
- [ ] The runtime package distribution contract is explicit: root-package-included, separately published package, or repo-only example for now.
- [ ] No npm publish is performed until the owner approves the exact version and command.

## Verification steps

1. `npm view open-scaffold version time dist-tags --json` — registry state captured.
2. `npm view open-scaffold --json` — metadata captured and checked.
3. `npx --yes open-scaffold@latest --help` — latest public CLI surface captured.
4. `npm run build` — local package builds.
5. `node dist/cli.js --help` — local CLI surface captured.
6. `npm pack --dry-run --json` — tarball file list captured and private/dogfood prefixes checked.
7. `npx --yes open-scaffold@latest init --tier min --target <tmp>` — public first-run smoke succeeds.
8. `git diff --check`, `./verify.sh --strict`, and `npm test -- --run` — repo gates pass before PR.

## Open questions

- Should the next package release be a patch (`0.4.2`) for metadata/command-surface sync, or a minor (`0.5.0`) if runtime package distribution wording changes materially?
- Should `packages/runtime-omx/` be included in the root package, published separately, or kept as a GitHub-only repo example until a dedicated runtime-package release plan?
- Should the GitHub Release marked Latest move with the next package publish, or should repo-native release/evidence notes remain sufficient until a larger user-facing release?
