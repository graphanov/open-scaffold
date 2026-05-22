# 090 — Evolution compare CLI

Date: 2026-05-22
Plan: `.osc/plans/done/090-evolution-compare.md`
Branch: `feat/evolve-compare-visible-loop`
Package candidate: `open-scaffold@0.4.12`

## Summary

Added a read-only `osc evolve compare <loop-dir>` command that renders two evolution attempts side by side so reviewers can understand a frontier decision without manually opening `attempts.jsonl` and `frontier.json`.

This slice implements the first execution step from the private author-notes action map: make the evolution loop visible before adding more runtime adapters or new top-level product surfaces.

## Traceability

- Plan: `.osc/plans/done/090-evolution-compare.md`
- Changelog stamp: `MISSION.md` entry for `090-evolution-compare`
- Private decision support: ignored `.osc/research/2026-05-22-author-notes-action-map.md`
- Tests: `tests/evolution.test.ts`, `tests/cli-evolution.test.ts`
- Candidate package: `open-scaffold@0.4.12`

## Outcome

Open Scaffold now has a visible comparison surface for recorded evolution loops. A maintainer can compare the previous frontier attempt against the current frontier in terminal, markdown, or JSON form, including score delta, decision/rationale, evidence membership, evaluation presence, boundary differences, and frontier history.

## What changed

- `src/evolution.ts`
  - Added compare data loading for `loop.json`, `attempts.jsonl`, and `frontier.json`.
  - Added default previous-frontier vs current-frontier target resolution.
  - Added explicit `--a` / `--b` target support for attempt IDs, run IDs, and `frontier`.
  - Added terminal, markdown, and JSON renderers.
  - Added single-attempt success messaging instead of treating “nothing to compare yet” as an error.
- `src/cli.ts`
  - Added `osc evolve compare <loop-dir>` CLI parsing.
  - Added `--format terminal|markdown|json` and `--out <path>`.
  - Updated CLI help.
- `tests/evolution.test.ts`
  - Added unit coverage for default comparison, markdown/json/terminal rendering, unknown target errors, and single-attempt loops.
- `tests/cli-evolution.test.ts`
  - Added CLI coverage for markdown export.
- `README.md`
  - Repositioned the “What you get” section to lead with the evolution ledger.
  - Added `osc evolve compare` to the repeated-attempt workflow.
- `package.json` / `package-lock.json`
  - Bumped package candidate to `0.4.12` for the new public CLI command.

## Boundary

This command is read-only. It does not:

- spawn runtimes;
- rerun attempts;
- rank models;
- certify compliance;
- approve releases;
- mutate loop files;
- add runtime dependencies.

Future report/replay/diff-evidence/static-site/adapter/importer work remains out of scope for this slice.

## Verification

### TDD RED

Targeted tests were written first and failed before implementation:

```text
npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts
```

Expected RED failures observed:

```text
compareEvolutionLoop is not a function
Usage: osc evolve init ... | osc evolve check <loop-dir>
```

### Targeted GREEN

```text
npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts
```

Result:

```text
Test Files  2 passed (2)
Tests       22 passed (22)
```

### Codex review fix round

Codex reviewed PR #87 at head `4cc533f56742f58dd0e752e8d3550711a198b23c` and found two valid issues:

1. Default compare should not fall back to the last two non-frontier attempts when no previous-frontier/current-frontier comparison exists.
2. Markdown output should not label side B as `current frontier` unless side B is actually the current frontier.

Fixes added:

- Regression: two rejected/retry attempts without a promoted frontier now return a successful “No previous frontier/current frontier comparison is recorded yet.” message instead of inventing a comparison.
- Regression: explicit `--a frontier --b <non-frontier>` markdown labels A as current and B as non-current.
- Renderer history markers now distinguish `A`, `B`, and `current` independently.

Post-fix targeted result:

```text
npm test -- --run tests/evolution.test.ts -> 1 file / 14 tests passed
npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts -> 2 files / 22 tests passed
```

### Full test suite

```text
npm test -- --run
```

Result:

```text
Test Files  32 passed (32)
Tests       286 passed (286)
```

### Build

```text
npm run build
```

Result:

```text
build:core        pass
build:runtime-omx pass
```

### Manual smoke

Created a temporary min scaffold, created a plan, wrote two run packets, initialized an evolution loop, recorded two promoted attempts, and rendered terminal/markdown/json compare outputs with `node dist/cli.js evolve compare`.

Key observed terminal output:

```text
Evolution Loop: compare-demo
Strategy: greedy
Attempts: 2 recorded
Comparing: A -> attempt-a (promote)
           B -> attempt-b (promote)
Score: A=0.62 | B=0.94 | Δ=+0.32 ▲
Only in A: docs/evidence/attempt-a-proof.md
Only in B: docs/evidence/attempt-b-proof.md
Frontier history
  attempt-a -> promote (0.62) ← A
  attempt-b -> promote (0.94) ← B/current
```

Markdown and JSON exports were parsed/checked successfully:

```text
manual smoke ok
```

## Remaining gates

- PR creation and Codex latest-head review loop.
- Merge remains owner-gated.
- npm publish and GitHub Release `v0.4.12` remain separate owner-gated post-merge public-surface actions.

## Final branch verification

```text
git diff --check -> pass
./verify.sh --strict -> 10 pass, 0 fail, 0 warn after release-note section patch
npm pack --dry-run --json -> open-scaffold-0.4.12.tgz, 106 files, no .osc/research payload
npm publish --dry-run -> + open-scaffold@0.4.12
```