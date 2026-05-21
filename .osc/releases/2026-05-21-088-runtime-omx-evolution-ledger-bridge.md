# Release / Evidence Note: 088-runtime-omx-evolution-ledger-bridge

## Summary

Bridged `packages/runtime-omx` outputs into the `osc evolve record` ledger path without adding hidden runtime execution. `osc evolve record` now accepts dispatch receipts and repeatable adapter evidence refs, validates receipt/run identity and repo-local boundaries before mutation, and records curated refs into attempts/frontier evidence. `open-scaffold-runtime-omx --evolution-loop ...` prints the exact core recording command instead of mutating `.osc/evolution/` itself.

## Traceability

- Roadmap / issue / task: Open Scaffold plan `088-runtime-omx-evolution-ledger-bridge`; Kanban `t_fd291bf4`.
- Plan: `.osc/plans/done/088-runtime-omx-evolution-ledger-bridge.md` after close in this branch.
- Run ID / run packet: N/A — implemented directly by Hermes against the plan; no external runtime was spawned.
- Branch / PR: `runtime/omx-evolution-ledger-bridge`; https://github.com/graphanov/open-scaffold/pull/80.

## Verification

- `npm test -- tests/evolution.test.ts tests/cli-evolution.test.ts packages/runtime-omx/tests/cli.test.ts` — 3 files / 24 tests passed after the RED phase failed for the missing receipt/evidence bridge and runtime command hint.
- `npm test -- tests/evolution.test.ts tests/cli-evolution.test.ts packages/runtime-omx/tests/cli.test.ts packages/runtime-omx/tests/validation.test.ts` — 4 files / 38 tests passed.
- `npm test -- packages/runtime-omx/tests/cli.test.ts tests/evolution.test.ts tests/cli-evolution.test.ts` — 3 files / 25 tests passed after the Codex flag-guard fix.
- `npm run build:runtime-omx` — TypeScript runtime package build passed.
- `npm run test:runtime-omx` — 5 runtime test files / 46 tests passed.
- `npm test` — 31 test files / 272 tests passed.
- `npm run build` — core and runtime-omx builds passed.
- `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- `npm run osc -- verify` — passed with one pre-existing warning for backlog plan `062-glass-cockpit-webhooks` run-id release-summary drift.
- `git diff --check` — passed.
- Boundary scan — non-test added lines contain no hidden-spawn, model-ranking, compliance-certification, automatic-approval, full-OMX-support, or private-ref claims; the only private-path string is a test fixture proving rejection/no persistence.

## Outcome

The branch adds adapter-output inputs to `osc evolve record`, runtime-omx command-hint output for explicit ledger recording from a consistent repo-root path base, regression coverage for mismatched receipt `run_id`, private/internal ref rejection, and subdirectory-relative CLI paths, plus docs describing the no-hidden-spawn flow:

```text
osc evolve init
-> osc run --runtime omx
-> open-scaffold-runtime-omx
-> osc evolve record --receipt ... --evidence ...
-> osc evolve check
```

Out of scope remains hidden `osc run` spawning, automatic frontier promotion, model ranking, compliance certification, release approval, and broad OMX workflow support beyond `$ralplan`.

## Follow-up

- Open PR and run latest-head Codex review loop before asking for owner merge approval.
- Codex round 1 raised a P2 runtime-omx CLI guard issue for `--decision` / `--score` / `--rationale` without `--evolution-loop`; fixed by failing before artifact writes and adding a regression test.
- Keep npm publish and GitHub Release creation owner-gated if this slice later changes package/public-surface versioning.
