# Plan: 125-methodology-evidence-harness

## Status

done


## Context

An independent review (recorded in `docs/decisions/2026-05-28-pursue-methodology-evidence-harness.md`) confirmed that most prior improvement ideas already exist as roadmap items, but found one deliberately unclaimed gap: Open Scaffold asserts adoption value (faster session resume, fewer scope-drift loops, less context re-explanation) while `docs/FAQ.md` repeatedly states these are "not benchmarked," and `.osc/plans/backlog/114-work-usage-ledger-v1.md` explicitly excludes "productivity benchmark claims." `osc metrics` (done `059`) reports adoption descriptors but does not turn the value hypotheses into reproducible, honesty-bounded evidence. This plan builds the missing evidence layer without overclaiming.

## Goal

Add an `osc study` command plus a documented measurement protocol that derive honesty-bounded, source-labeled evidence about the methodology's effects from a repo's own Open Scaffold artifacts, and produce a first self-study on this repository that reports observed signals including null or negative results.

## Constraints / Out of scope

- No fabricated or estimated numbers: every reported figure is computed from committed artifacts and carries a `source` label; unknown values are emitted as `null`, never imputed.
- No causal claims: the self-study reports observed correlations and explicitly states it cannot isolate the methodology as the cause.
- No provider, model, or runtime benchmarking (that remains future work per Milestone 16 and the parking lot).
- No hosted dashboard, no telemetry, no network calls, no SaaS; `osc study` reads local git and `.osc/` only, like `git log`.
- Does not replace `osc metrics` (adoption descriptors) or `osc eval` (single-run AC evaluation); this layer composes their outputs into a value-evidence view.
- Does not introduce a marketing claim into README/MISSION; any public claim is a separate owner-gated decision after the self-study lands.

## Files to touch

- `docs/EVIDENCE_METHODOLOGY.md` — the measurement protocol: which FAQ hypotheses map to which observable signals, the honesty rules, the control model (scaffolded vs. unscaffolded), and the threats-to-validity section.
- `docs/AB_COMPARISON_PROTOCOL.md` — already drafted in this work (protocol-only, not run); link it from `docs/EVIDENCE_METHODOLOGY.md` and refine if needed.
- `src/study.ts` — signal extraction and the `open-scaffold.study.v1` schema (read-only over git history and `.osc/` artifacts).
- `src/cli.ts` — add `osc study [--json] [--since DATE] [--out PATH]` reusing existing `metrics.ts` and `evaluation.ts` readers.
- `tests/study.test.ts` — schema validation, null-handling, source-label coverage, and a fixture-repo aggregation test.
- `docs/EVIDENCE_SELF_STUDY.md` — the first honest, public-facing self-study over this repo's own history; regenerated from `osc study` output and stamped internally with the computed-at commit range and date.

## Implementation Architecture Coverage

- Strengthens: evaluation envelope and adoption-trust evidence; turns FAQ hypotheses into reproducible repo-derived signals.
- Audit envelope: git commit range, plan/amendment/evidence artifact paths, and the generated `study.json` and self-study note are the reconstruction set.
- Evaluation envelope: schema validation tests, a fixture-repo aggregation test, and a forbidden-imputation scan (assert no figure is emitted without a `source`); evaluator is `npm test` plus owner review of the self-study honesty section.
- Feedback routing: a hypothesis with no usable signal is reported as `signal: unavailable`, not a blocker; weak or negative findings are recorded in the self-study, not suppressed.
- Boundary: no causation claims, no provider/model benchmarking, no telemetry, no public marketing claim without a separate owner gate.

## Acceptance criteria

- [x] `docs/EVIDENCE_METHODOLOGY.md` maps at least three named `docs/FAQ.md` hypotheses to concrete, repo-observable signals and states explicit threats to validity and a no-causation disclaimer.
- [x] `open-scaffold.study.v1` schema requires `schemaVersion`, computed-at timestamp, commit range, and per-signal `value` plus `source` (one of `git`, `osc-artifact`, `metrics`, `unavailable`), with `value: null` permitted.
- [x] `osc study --json` emits stable machine-readable rows for a fixture repo and parses as valid JSON.
- [x] `osc study` markdown output renders each signal with its value, source label, and an "unavailable" row where no signal exists.
- [x] A test asserts no numeric figure can be emitted without a `source` label and that imputed/estimated values are rejected.
- [x] `docs/EVIDENCE_SELF_STUDY.md` reports the run over this repo, stamps the computed-at commit range and date inside the file, includes at least one null-or-negative observation, and contains an explicit "what this cannot prove" section.

## Verification steps

1. Run `npm test -- --run tests/study.test.ts` — expect all study tests green.
2. Run `osc study --json` against `tests/fixtures/` (or a temp scaffold) and pipe through a JSON parser — expect valid JSON with `source` on every figure.
3. Regenerate over this repo (`osc study --out /tmp/self-study.md`) and confirm the computed sections match the committed `docs/EVIDENCE_SELF_STUDY.md` — i.e., the study is reproducible from the tool, not hand-written.
4. Run `npm run build` — expect zero TypeScript errors.
5. Run `./verify.sh --strict` — expect all checks pass.

## Open questions

- Which FAQ hypotheses are cleanly observable from `.osc/` artifacts alone (e.g., amendment frequency, evidence-completeness over time, time-from-session-start-to-first-AC-passing-commit) versus which require optional `114` usage data and should degrade to `unavailable` when absent?
- Resolved (owner decision, 2026-05-28): the self-study lives at `docs/EVIDENCE_SELF_STUDY.md` (public-facing), not under `.osc/releases/`. It must be regenerated from `osc study`, stamp its computed-at commit range and date, and keep the "what this cannot prove" section prominent; any README/MISSION claim drawn from it remains a separate owner gate.
- Resolved (owner decision, 2026-05-28): the A/B comparison ships as protocol-only text now and is drafted at `docs/AB_COMPARISON_PROTOCOL.md`. `docs/EVIDENCE_METHODOLOGY.md` should link to it and state that running the comparison is out of scope for this plan; the observational self-study sets the baseline first.
