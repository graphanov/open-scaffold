# Plan: 153-scaffold-vs-naked-proof-harness

## Status

done

## Context

The project currently has honest diagnostic evidence for evolution-loop controller efficiency, but its own docs still say scaffolded-vs-unscaffolded claims lack a live control arm. Daniel asked for proof against naked Codex, or framework changes until the proof surface exists.

## Goal

Add a bounded, source-labeled proof harness that can compare Open Scaffold against a naked Codex/control arm for quality, tokens, speed, and evolution-loop learning without making universal or fabricated claims.

## Constraints / Out of scope

- Do not claim Open Scaffold is universally better for every task or model.
- Do not spawn runtimes from core; the proof harness evaluates committed receipts and source-labeled artifacts.
- Do not publish, merge, release, or update npm from this slice.
- Do not commit raw private Codex logs, secrets, local home paths, or uncontrolled transcripts.

## Files to touch

- `src/proof.ts` — implement source-labeled proof comparison and rendering.
- `src/cli.ts` — expose `osc prove compare|check`.
- `tests/proof.test.ts` — cover RED/GREEN proof harness behavior.
- `docs/PROOF_HARNESS.md` — document what the proof does and does not establish.
- `README.md`, `docs/EVOLUTION_LOOP.md`, `docs/EVIDENCE_METHODOLOGY.md`, `docs/COMMAND_MATURITY.md` — link the new bounded proof surface honestly.
- `examples/proof/scaffold-vs-naked-codex/` — checked-in public-safe example manifest/receipts.
- `.osc/releases/2026-06-08-153-scaffold-vs-naked-proof-harness.md` — evidence note for this slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|-------------|----------------|
| T1 | Add failing tests for proof comparison, source refs, and CLI output. | None | A |
| T2 | Implement proof model/CLI to satisfy tests. | T1 | B |
| T3 | Run live/synthetic evidence generation and commit sanitized example receipts. | T2 | C |
| T4 | Document bounded claims and update public positioning tests. | T2, T3 | D |
| T5 | Run verification, secret scan, independent review, and PR workflow. | T1-T4 | E |

### Parallel groups

- **Group A**: test contract only.
- **Group B**: implementation after RED.
- **Group C/D**: evidence and docs may overlap once CLI behavior exists.
- **Group E**: final gated verification.

### Dependencies

- T2 depends on T1 because production code must follow failing tests.
- T3 depends on T2 because examples should be generated/checked by the CLI.
- T5 depends on all prior tasks.

### Delegation notes

- Use local Hermes tools for code and tests; optionally use a read-only/review subagent before commit.
- If live Codex runs fail or token receipts are unavailable, record that as a blocker/gap instead of inventing metrics.

## Implementation Architecture Coverage

- Strengthens: evaluation, proof boundary, adoption trust, recovery/ownership.
- Audit envelope: this plan, proof manifest, proof receipts, release/evidence note, PR checks.
- Evaluation envelope: Vitest proof tests, CLI proof output, local verification commands, source-ref checks, secret scan.
- Feedback routing: invalid/universal-claim pressure becomes warnings/caveats in the proof report and docs.
- Boundary: no runtime spawning, no universal benchmark claim, no model ranking product, no npm/public release.

## Acceptance criteria

- [ ] `osc prove compare <manifest>` renders a report with scaffolded/control quality, token, speed, and evolution-loop deltas plus explicit caveats.
- [ ] `osc prove check <manifest>` fails if required metrics or source refs are missing and passes on the checked-in example.
- [ ] The checked-in example contains public-safe source-labeled receipts/results showing a bounded Open Scaffold improvement over a naked Codex/control arm on at least quality plus one efficiency metric, or explicitly records why the proof failed.
- [ ] Public docs stop saying the comparison is only text-only/not run without pointing to the new bounded proof harness and its limitations.
- [ ] Local verification (`./verify.sh --strict`, `npm test -- --run`, `npm run build`, secret scan) passes before PR.

## Verification steps

1. `npm test -- --run tests/proof.test.ts`
2. `npm run osc -- prove check examples/proof/scaffold-vs-naked-codex/manifest.json`
3. `npm run osc -- prove compare examples/proof/scaffold-vs-naked-codex/manifest.json --format markdown --out /tmp/scaffold-vs-naked-proof.md`
4. `./verify.sh --strict`
5. `npm test -- --run`
6. `npm run build`
7. `npm run osc -- doctor --check secret-scan`

## Open questions

- Live Codex evidence may be noisy/stochastic; the harness must separate bounded receipts from universal proof.
- If a naked Codex arm wins a metric, the result must remain visible and the docs must not spin it.
