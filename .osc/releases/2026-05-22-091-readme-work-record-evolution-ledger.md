# 091 — README work record + evolution ledger positioning

Date: 2026-05-22
Plan: `.osc/plans/done/091-readme-work-record-evolution-ledger.md`
Branch: `docs/readme-work-record-evolution-ledger`
Package state: repo `package.json` is `0.4.12`; npm latest was observed as `0.4.11` before this docs slice.

## Summary

Rewrote the README front door around a simpler Oh-My-Codex-inspired structure: clear identity, default flow, simple mental model, then advanced boundaries.

The README now leads with Open Scaffold as a repo-native work record and evolution ledger for AI-assisted software. It keeps the existing handoff/evidence proposition while making the evolution loop visible through compact ASCII diagrams.

## Traceability

- Plan: `.osc/plans/done/091-readme-work-record-evolution-ledger.md`
- Changelog stamp: `MISSION.md` entry for `091-readme-work-record-evolution-ledger`
- Prior enabling slice: PR #87 / `.osc/plans/done/090-evolution-compare.md`
- Private decision support: ignored `.osc/research/2026-05-22-author-notes-action-map.md`
- Style inspiration: `Yeachan-Heo/oh-my-codex` README shape — clear identity, default flow, simple mental model

## Outcome

The README now explains Open Scaffold in plain terms before internal ontology:

```text
work record + evolution ledger
control + clarity + reviewability + handoff + improvement loops
agent/runtime does the work; Open Scaffold records the work
```

It includes:

- a compact “basic loop” ASCII diagram from goal to durable repo record;
- a compact evolution-loop ASCII diagram from multiple attempts to `evolve compare` to frontier;
- a default flow for init, mission, plan, verify/evidence/close, and optional handoff package;
- a simple mental model that preserves human approval and runtime-neutral boundaries.

## What changed

- `README.md`
  - Replaced the protocol-heavy opening with a direct work-record/evolution-ledger explanation.
  - Added `reviewability` as the first-touch proof word instead of leading with audit/compliance language.
  - Added two text diagrams for the basic work loop and repeated-attempt evolution loop.
  - Preserved required first-run install and lifecycle helper commands, including local `osc`, `npx open-scaffold`, and shell fallbacks.
  - Reduced README size from 14,481 bytes to 8,995 bytes.
- `.osc/plans/done/091-readme-work-record-evolution-ledger.md`
  - Captured scope, acceptance criteria, and verification plan.
- `MISSION.md`
  - Stamped the close entry through `osc close`.

## Boundary

This is a documentation/positioning slice only. It does not:

- add CLI behavior;
- change runtime behavior;
- spawn agents;
- rank models;
- certify compliance;
- approve merges/releases;
- publish npm or create a GitHub Release.

The existing `0.4.12` npm/GitHub Release public-surface gate remains separate and owner-gated.

## Verification

### README size

```text
wc -c README.md
8995 README.md
```

### README first-touch jargon scan

```text
grep -nEi "glass cockpit|operator surface|runtime binding|dispatch receipt|harness skill|slice close|task bridge|evaluation envelope|audit envelope|run packet|substrate|governance|orchestration layer" README.md || true
```

Result: no README hits.

### Plan validation

```text
node dist/cli.js plan validate 091-readme-work-record-evolution-ledger --strict
0 issues found
```

### Strict verification

```text
./verify.sh --strict
10 pass, 0 fail, 0 warn
```

### Test suite

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

### Whitespace

```text
git diff --check
```

Result: pass.

## Remaining gates

- Open PR and run the normal review loop.
- Merge remains owner-gated.
- The `open-scaffold@0.4.12` npm publish and GitHub Release alignment from the prior command-surface slice remain a separate owner-gated public-surface action.
