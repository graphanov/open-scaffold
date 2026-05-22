# 092 — Evolution loop visibility v1

Date: 2026-05-22
Plan: `.osc/plans/done/092-evolution-loop-visibility-v1.md`
Branch: `docs/evolution-loop-visibility-v1`
Package state: repo `package.json` remains `0.4.12`; npm/GitHub Release publication is a separate owner gate.

## Summary

Made the already-shipped evolution loop easier to understand and review by adding a public-safe compare walkthrough and enriching `osc evolve compare` output with acceptance-criteria deltas from linked evaluation envelopes.

This slice keeps Open Scaffold core as a recorder/renderer. It does not execute attempts, spawn runtimes, rank models, certify compliance, or approve releases.

## Traceability

- Plan: `.osc/plans/done/092-evolution-loop-visibility-v1.md`
- Changelog stamp: `MISSION.md` entry for `092-evolution-loop-visibility-v1`
- Prior enabling slices:
  - `.osc/plans/done/087-closed-evolution-loop-contract.md`
  - `.osc/plans/done/090-evolution-compare.md`
  - `.osc/plans/done/091-readme-work-record-evolution-ledger.md`
- Private planning support stayed private and was not copied into public docs.

## Outcome

A reviewer can now compare attempts and see acceptance-criteria movement directly in the rendered output:

```text
AC2: A=fail | B=pass ▲ — Frontier promotion is explicit.
```

Markdown output includes a PR-ready section:

```markdown
## Acceptance criteria delta

| Criterion | A | B |
|---|---|---|
| AC2 — Frontier promotion is explicit. | ✗ fail | ✓ pass ▲ |
```

The new walkthrough at `docs/examples/evolution-loop-compare.md` shows the same flow without private context:

```text
one task -> attempt A -> attempt B -> osc evolve compare -> frontier rationale
```

## What changed

- `src/evolution.ts`
  - Reads linked `open-scaffold.evaluation.v1` envelopes during compare.
  - Builds a union of acceptance-criteria ids across A/B attempts.
  - Renders criteria deltas in terminal and markdown output.
  - Preserves read-only compare behavior; `loop.json`, `attempts.jsonl`, and `frontier.json` are not mutated by compare.
- `tests/evolution.test.ts`
  - Adds unit coverage for criteria delta rendering.
  - Adds one-side-missing evaluation coverage.
- `tests/cli-evolution.test.ts`
  - Verifies markdown `--out` includes the criteria delta table.
- `docs/examples/evolution-loop-compare.md`
  - Adds a public-safe walkthrough for the evolution-ledger wedge.
- `docs/EVOLUTION_LOOP.md`, `docs/examples/README.md`, `docs/EXAMPLES.md`, `README.md`
  - Add short pointers to the walkthrough without broad README repositioning.
- `.osc/plans/done/092-evolution-loop-visibility-v1.md`
  - Captures scope, acceptance criteria, and verification plan.
- `MISSION.md`
  - Stamped the close entry through `osc close`.

## Boundary

This slice does not:

- publish raw private notes;
- add runtime adapters;
- add native spawning;
- add new top-level CLI commands;
- implement `osc evolve report`, replay, HTML, range, code diff, or evidence diff;
- publish npm;
- create or edit GitHub Releases;
- approve merge/release decisions.

## Verification

### RED/GREEN targeted tests

A failing test pass was run first after adding criteria-delta expectations:

```text
npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts
```

Initial RED result:

```text
2 failed files
3 failed tests
Expected: ## Acceptance criteria delta
```

After implementation:

```text
Test Files  2 passed (2)
Tests       24 passed (24)
```

### Required verification gates

```text
git diff --check
```

Result: pass.

```text
npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts
```

Result:

```text
Test Files  2 passed (2)
Tests       24 passed (24)
```

```text
npm test -- --run
```

Result:

```text
Test Files  32 passed (32)
Tests       288 passed (288)
```

```text
npm run build
```

Result:

```text
build:core        pass
build:runtime-omx pass
```

```text
./verify.sh --strict
```

Result:

```text
10 pass, 0 fail, 0 warn
```

### Manual smoke

Created a temporary loop with two attempts and evaluation envelopes, then ran:

```text
./node_modules/.bin/tsx src/cli.ts evolve compare <tmp-loop-dir> --format terminal
./node_modules/.bin/tsx src/cli.ts evolve compare <tmp-loop-dir> --format markdown --out /tmp/osc-smoke-compare.md
./node_modules/.bin/tsx src/cli.ts evolve compare <tmp-loop-dir> --format json
```

Observed:

```text
Acceptance criteria delta
  AC2: A=fail | B=pass ▲ — Frontier promotion is explicit.

## Acceptance criteria delta
| AC2 — Frontier promotion is explicit. | ✗ fail | ✓ pass ▲ |

json smoke ok
compare-read-only: pass
```

Note: the JSON smoke used the direct local CLI (`./node_modules/.bin/tsx src/cli.ts`) so npm script banner output would not pollute machine-readable JSON redirection.

## Remaining gates

- Open/push PR if desired; merge remains owner-gated.
- If merged and treated as a package-visible CLI/docs slice, npm trusted publishing and GitHub Latest Release alignment remain separate owner gates.
- Do not resume Control Room automation from this slice.
