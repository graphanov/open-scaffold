# Release / Evidence Note: 089-runtime-omx-evolution-ledger-package-sync

## Summary

Published and verified `open-scaffold@0.4.10` so the runtime OMX evolution ledger bridge from PR #80 is available through npm `latest`, fresh `npx`, and GitHub Release Latest. The published package exposes the explicit `osc evolve record --receipt ... --evidence ...` surface without adding hidden spawning or new runtime authority.

## Traceability

- Roadmap / issue / task: Open Scaffold plan `089-runtime-omx-evolution-ledger-package-sync`; Kanban `t_b3b28c80`.
- Preceding implementation: PR #80, `088-runtime-omx-evolution-ledger-bridge`, merge commit `7c04c125fc261d7de95c1019067b2356885db758`.
- Package sync PR: https://github.com/graphanov/open-scaffold/pull/81, merge commit `a0cfa235217cbb6162c9901226f279d981514bdd`.
- Plan: `.osc/plans/done/089-runtime-omx-evolution-ledger-package-sync.md` after close.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26233194606.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.10.
- Package: `open-scaffold@0.4.10` with npm `latest` dist-tag.
- Run ID / run packet: N/A — release sync executed directly by Hermes against the plan; no external runtime was spawned.

## Verification

- `npm view open-scaffold version dist-tags time --json` before this slice — npm latest was `0.4.9`, matching GitHub Release `v0.4.9` and missing PR #80's post-0.4.9 bridge.
- `npm view open-scaffold@0.4.10 version` before publish — returned npm `E404`; `open-scaffold@0.4.10` was not already published before the publish gate.
- `npx --yes open-scaffold@latest evolve --help` before publish — showed the pre-PR #80 public `record` surface without `--receipt` / repeatable `--evidence`.
- `npm version 0.4.10 --no-git-tag-version` — updated root `package.json` and `package-lock.json` to `0.4.10` in PR #81.
- `node dist/cli.js evolve --help` after build — local candidate help included `--receipt <dispatch-receipt.json>` and repeatable `--evidence <path>`.
- `git diff --check` — passed before publish and again during closeout.
- `./verify.sh --strict` — 10 pass, 0 fail, 0 warn before publish and again during closeout after final evidence updates.
- `npm test -- --run` — 31 test files / 272 tests passed on merged `main` before publish.
- `npm run build` — core and runtime-omx builds passed.
- `npm pack --dry-run --json` — produced `open-scaffold-0.4.10.tgz`, 102 files, unpacked size `697950`; included `dist/cli.js`, `dist/evolution.js`, `docs/EVOLUTION_LOOP.md`, and `docs/RUNTIME_BINDING_CONTRACT.md`; excluded `.osc-dev/`, `.osc/research/`, `.osc/runs/`, `.git/`, `node_modules/`, `02_Active_Projects/`, `.hermes/`, and runtime source paths such as `packages/runtime-omx/src/`.
- `npm publish --dry-run` — passed for `open-scaffold@0.4.10` with `latest` tag dry-run; no local token publish was used.
- PR #81 CI — success.
- PR #81 Codex — round 1 P1 fixed by keeping plan 089 active until publish/release follow-through; latest-head follow-up said no major issues; unresolved review threads `0`.
- Trusted publishing workflow `26233194606` — success on `main` for `a0cfa235217cbb6162c9901226f279d981514bdd`.
- `npm view open-scaffold version dist-tags repository homepage bugs keywords --json --prefer-online` after publish — `version: 0.4.10`, `dist-tags.latest: 0.4.10`, expected metadata present.
- Fresh isolated-cache `npx --yes open-scaffold@latest evolve --help` — shows `--receipt <dispatch-receipt.json>` and repeatable `--evidence <path>`.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` — root help shows the evolved `osc evolve record` usage.
- Fresh isolated-cache `npx --yes open-scaffold@latest init --tier min --target <tmp>` — succeeded and generated the expected min scaffold files.
- GitHub Release `v0.4.10` — created on target commit `a0cfa235217cbb6162c9901226f279d981514bdd` and shown as Latest.

## Outcome

`open-scaffold@0.4.10` is now the npm `latest` package and GitHub Release `v0.4.10 — Runtime OMX evolution ledger bridge` is marked Latest. Fresh `npx` exposes the evolved `osc evolve record` receipt/evidence surface:

```text
osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text>
```

This release does not add hidden spawning, automatic frontier promotion, model ranking, compliance certification, release approval automation, or broad OMX workflow support. It publishes the already-reviewed runtime OMX ledger bridge through public package and release surfaces.

## Follow-up

- Closeout branch/PR records this final npm/release evidence and moves plan 089 from `active/` to `done/`.
- After the closeout PR is merged, no remaining 089 follow-up is expected beyond normal roadmap selection.
