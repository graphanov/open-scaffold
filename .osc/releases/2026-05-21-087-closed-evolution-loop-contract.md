# Release / Evidence Note: 087-closed-evolution-loop-contract

## Summary

Added the contract-first `osc evolve` surface for multi-attempt improvement loops: `loop.json`, `attempts.jsonl`, and `frontier.json` under `.osc/evolution/<loop_id>/`. The slice connects run packets, evaluation envelopes, audit roles, and OMX-oriented agentic runtime packages without making Open Scaffold core spawn runtimes or rank models.

## Traceability

- Roadmap / issue / task: Open Scaffold plan `087-closed-evolution-loop-contract`; Kanban `t_ba998516`.
- Plan: `.osc/plans/done/087-closed-evolution-loop-contract.md` after close in this branch.
- Run ID / run packet: N/A — implemented directly by Hermes against the plan; no external runtime was spawned.
- Branch / PR: `spec/closed-evolution-loop-contract`; https://github.com/graphanov/open-scaffold/pull/79.

## Verification

- `npm test -- tests/evolution.test.ts tests/cli-evolution.test.ts` — 12 tests passed; RED phase failed first before implementation.
- `npm test -- tests/evolution.test.ts tests/cli-evolution.test.ts tests/audit.test.ts` — 30 tests passed.
- `npm test` — 31 files / 266 tests passed.
- `npm run build` — core and runtime-omx builds passed.
- `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- `git diff --check` — passed.

## Outcome

The branch ships a new core CLI contract (`osc evolve init|record|check`), deterministic renderer/validator/recorder logic, CLI tests, audit-role support for evolution artifacts, docs, roadmap/wiki updates, and a package version bump to `0.4.9`. Out of scope remains real runtime spawning, strategy execution, model benchmarking/ranking, compliance certification, and merge/publish approval.

## Follow-up

- PR opened for review and Codex latest-head loop: https://github.com/graphanov/open-scaffold/pull/79.
- Codex round 1 raised a P2 subdirectory relative-path issue for `osc evolve`; fixed by resolving user-supplied paths from the caller CWD before rebasing to the scaffold root and adding a subdirectory regression test.
- Codex round 2 raised a P1 partial-write recovery issue for promoted attempts when `frontier.json` is corrupt; fixed by validating frontier before appending the attempt and adding a regression test that preserves retryability.
- Codex round 3 raised a P2 mismatched evaluation/run linkage issue; fixed by rejecting evaluation envelopes whose `subject.run_id` conflicts with the run packet and adding a no-append/no-frontier-mutation regression test.
- Owner guidance on `oh-my-darwin` references applied: repository text now frames it only as public inspiration adapted specifically into an Open Scaffold-owned contract.
- After merge, publish/package release remains owner-gated like other npm/public-surface changes.
- Next likely product slice: connect `packages/runtime-omx/` attempts to the evolution ledger so OMX can be the first serious agentic runtime engine path.

### Collected 2026-05-21T08:12:59.429Z

#### Verification

- Command: `./verify.sh --standard`
- Exit code: 0
```text
open-scaffold compliance check (--standard)

  PASS  Mission defined
  PASS  Plan file(s) found (99 in .osc/plans/)
  PASS  Amendment numbering is sequential (no gaps)
  PASS  Changelog entries match amendment files
  PASS  Release/evidence notes have required local structure
  PASS  Active plan stale-state heuristic clean

  ─────────────────────────────────
  6 pass, 0 fail, 0 warn
```

#### Git context

- Branch: spec/closed-evolution-loop-contract

- Recent commits:
```text
12402b8 Reconcile runtime selection vision (#78)
fdee2bd Fix init help flags (#77)
e9bcda8 Add runtime profile list JSON output (#76)
23d1760 Fix macOS tmp brownfield init (#75)
73e41cb Add doctor auto-fix CLI (#74)
```

- Changed files:
```text
Staged changes:
(none)

Working tree changes:
M	README.md
M	ROADMAP.md
M	docs/OPEN_SCAFFOLD_SYSTEM.md
M	docs/SLICE_CLOSE_PROTOCOL.md
M	docs/WORKFLOW.md
M	docs/wiki/concepts/agentic-orchestration.md
M	docs/wiki/index.md
M	docs/wiki/log.md
M	package-lock.json
M	package.json
M	src/audit.ts
M	src/cli.ts
M	tests/audit.test.ts

Untracked files:
.osc/plans/active/087-closed-evolution-loop-contract.md
.osc/releases/2026-05-21-087-closed-evolution-loop-contract.md
docs/EVOLUTION_LOOP.md
src/evolution.ts
tests/cli-evolution.test.ts
tests/evolution.test.ts
```

#### PR / CI status

- PR/CI checks skipped by default — pass `--ci` to enable `gh` calls.

- CI environment:
```text
No CI environment variables detected.
```

#### Collection notes

- PR/CI checks skipped by default — pass --ci to enable gh calls
