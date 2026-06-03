# Hermes review handoff: Open Scaffold efficiency reset

## Review target

Worktree: `<isolated-worktree>`

Branch: `research/open-scaffold-efficiency-150`

Source repo left alone: `<source-repo>`

No commit, push, PR, merge, publish, or release was performed.

## Constraints honored

- Work was done in an isolated git worktree.
- No runtime spawning/control was added to core Open Scaffold.
- No 2000m-specific fields, paths, scorer contracts, or claims were added.
- No public proof claims were added.
- No claim was made that Open Scaffold makes models smarter.
- No claim was made that Open Scaffold has benchmark support.
- No dependencies were added.
- Efficiency is measured as workflow-control output overhead reduction, not model capability or final task quality.

## Executive summary

This patch makes `osc evolve analyze` produce and measure a smaller workflow-control packet.

The useful part: the new compact controller signal keeps required decision fields while cutting the analysis output from `2679` bytes to `916` bytes on the public evolution demo fixture, a measured `2.924672x` reduction.

The honest caveat: this does not prove Open Scaffold improves model intelligence, benchmark performance, productivity, token/cost, or correctness. It proves only that one controller-output surface can preserve required control fields with less report overhead on public-safe fixtures. The efficiency report is now explicitly diagnostic/experimental, with `11/12` strong public-summary targets and one marginal `1.56x` target.

## What changed in plain terms

Before, Open Scaffold analysis tended to behave like a ledger: useful signals existed, but they were surrounded by too much explanatory/report text.

After this patch, the analysis command can emit a compact "what should the controller do next?" packet. It keeps the action, reason, remaining failures, missing criteria, retry/plateau flags, token-cost receipt status, and handoff state in a smaller shape.

The patch also adds a diagnostic/experimental efficiency report so future narrow controller-output claims are computed by code instead of stated in prose.

## Files changed

- `src/evolution.ts`
  - Added compact controller-signal schema.
  - Added efficiency-report schema.
  - Added strict no-op retry routing to `inspect_scorer`.

- `src/evolution-efficiency.ts`
  - Isolated diagnostic/experimental efficiency-report machinery outside the core evolution loop implementation.
  - Added `measureEvolutionAnalysisEfficiency()`.
  - Added `renderEvolutionEfficiencyReport()`.
  - Added rendered-output required-field checks.
  - Added a 12-target diagnostic controller-output matrix with marginal-target classification.

- `src/cli.ts`
  - Added `osc evolve analyze <loop-dir> --compact`.
  - Added diagnostic/experimental `osc evolve analyze <loop-dir> --efficiency`.
  - Added JSON support for efficiency output.

- `tests/evolution.test.ts`
  - Tests compact output is materially smaller.
  - Tests required control fields are preserved.
  - Tests no-op retries route away from blind retry.
  - Tests missing current criteria are not hidden.
  - Tests private/unsafe refs do not leak.
  - Tests at least 10 additional 1.5x efficiency targets; current diagnostic count is 12, public-summary strong count is 11, and the `1.56x` row is marginal.

- `tests/cli-evolution.test.ts`
  - Tests CLI compact output.
  - Tests CLI efficiency JSON output.

- `tests/public-positioning.test.ts`
  - Locks benchmark-neutral language.
  - Requires docs to say Open Scaffold does not make models smarter and is not benchmark proof.
  - Requires diagnostic/experimental measured before/after artifacts for efficiency claims.

- `tests/section-parser.test.ts`
  - Updated pinned corpus hash after adding the active plan trace.

- `README.md`
  - Added benchmark-neutral positioning.
  - Added compact/efficiency command docs.

- `docs/EVOLUTION_LOOP.md`
  - Added compact controller signal docs.
  - Added diagnostic/experimental efficiency metrics and limitations.

- `docs/EVIDENCE_METHODOLOGY.md`
  - Added workflow-control efficiency measurement rules.

- `docs/FAQ.md`
  - Replaced unmeasured token/time-savings language with measured-artifact language.

- `.osc/plans/active/150-open-scaffold-efficiency-reset.md`
  - Active local plan trace for the worktree exercise.

## Efficiency definition used

Primary efficiency:

Same or better workflow-control decision quality with no more than `66.7%` of the prior token/context/evidence overhead.

Secondary efficiency:

At least `1.5x` more useful controller signal per output/evidence byte.

This patch measures output bytes, evidence bytes, required field preservation, recommendation count, receipt completeness, retry prevention, and compact handoff size.
The efficiency report is diagnostic/experimental. Its rendered compact output must preserve required fields directly, not only in the in-memory signal.

## Metrics added

- Output bytes per useful decision field.
- Evidence bytes per action recommendation.
- Token/cost telemetry completeness.
- Blind retries prevented in fixtures.
- Next-action packet compactness.
- Analyze-input-to-actionable-recommendation steps.
- Required control fields present versus total report size.
- Additional full-to-compact controller-output targets.

## Main before/after result

Command:

```sh
npm run osc -- evolve analyze examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer --efficiency
```

Measured public fixture result:

| Metric | Before | After | Result |
| --- | ---: | ---: | ---: |
| Full output bytes | `2679` | `916` | `2.924672x` smaller |
| Bytes per useful decision field | `178.6` | `61.066667` | `2.924672x` better |
| Required control fields | `15/15` | `15/15` | preserved |
| Rendered compact required fields | — | `15/15` | preserved |
| Token/cost telemetry completeness | `0/3` | `0/3` | still missing receipts |
| Blind retries prevented in demo fixture | `0` | `0` | fixture is all-pass/stop |
| Additional diagnostic 1.5x targets | `12/12` | `12/12` | met diagnostically |
| Public-summary strong targets | — | `11/12` | one marginal target excluded from headline |

## Additional diagnostic 1.5x target matrix

All targets below are public-safe controller-output surfaces. They measure output compaction, not benchmark performance. The matrix is diagnostic; public-facing summary should use the strong-target count and label marginal rows.

| Target | Before bytes | After bytes | Ratio | Preserved | Classification | Public-summary counted |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `target.markdown.full_to_compact` | `2914` | `1006` | `2.89662x` | yes | strong | yes |
| `target.json.full_to_controller_signal` | `6305` | `1558` | `4.046855x` | yes | strong | yes |
| `target.terminal.control_section_to_usage_receipt` | `142` | `59` | `2.40678x` | yes | strong | yes |
| `target.terminal.sensitivity_to_acceptance` | `545` | `36` | `15.138889x` | yes | strong | yes |
| `target.terminal.previous_delta_to_plateau` | `367` | `60` | `6.116667x` | yes | strong | yes |
| `target.terminal.frontier_delta_to_resume` | `359` | `136` | `2.639706x` | yes | strong | yes |
| `target.terminal.packet_to_action_block` | `507` | `325` | `1.56x` | yes | marginal | no |
| `target.markdown.control_to_compact_bullets` | `420` | `145` | `2.896552x` | yes | strong | yes |
| `target.markdown.delta_tables_to_failures` | `798` | `28` | `28.5x` | yes | strong | yes |
| `target.markdown.packet_sections_to_compact_required` | `824` | `125` | `6.592x` | yes | strong | yes |
| `target.json.criteria_to_remaining_failures` | `1040` | `2` | `520x` | yes | strong | yes |
| `target.json_deltas_to_resume` | `1467` | `139` | `10.553957x` | yes | strong | yes |

## What this proves

- Compact controller output can preserve required control fields while using materially fewer bytes on the public demo fixture.
- The CLI can now generate measured before/after diagnostic efficiency artifacts.
- Missing token/cost receipts are surfaced instead of faked.
- No-op retry detection can route to inspection instead of another blind retry in tests.
- Documentation now avoids benchmark-proof and model-intelligence claims.

## What this does not prove

- It does not prove Open Scaffold makes Codex or any model smarter.
- It does not prove Open Scaffold wins benchmarks.
- It does not prove end-to-end productivity improves.
- It does not prove correctness improves.
- It does not prove token/cost savings in real runs, because token/cost receipts are still incomplete.
- It does not prove the 12 target matrix is product-wide; it is a local diagnostic controller-output measurement harness with one marginal row.

## Root-cause assessment

Useful:

- Plateau/no-op retry detection.
- Explicit next-action recommendation.
- Missing-current-criteria reporting.
- Handoff packet shape.
- Token/cost receipt checks, even though receipts are currently missing.
- Compact controller signal small enough to paste into a fresh context.

Ceremony:

- Long markdown analysis sections that restate ledger facts.
- Repeated acceptance/delta/report text around a single controller decision.
- Evidence volume without clear action impact.
- Report text that looks authoritative but does not add control signal.

Costs too many tokens:

- Full analysis rendering.
- Verbose markdown packet sections.
- Delta tables when the actionable result is just stop/inspect/redesign/continue.

Still unmeasured:

- Real token savings across live runs.
- Real cost savings across live runs.
- Whether compact handoffs improve recovery.
- Whether no-op retry prevention reduces wall-clock time.
- Whether stop/redesign thresholds improve human decision quality.

What must become true for Open Scaffold to be valuable:

- It must prevent blind retries in real workflows, not only fixtures.
- It must produce reliable token/cost receipts.
- It must make stop/inspect/redesign/continue decisions faster and cheaper than ad hoc prompting.
- It must keep reports compact by default where control, not explanation, is the product.
- It must keep proof separate from score and never treat evidence volume as success.

## Verification run

All verification was run inside `<isolated-worktree>`.

```sh
git diff --check
npm run build
npm test
./verify.sh --strict
```

Result:

- `git diff --check`: pass.
- `npm run build`: pass.
- `npm test`: pass, `56` files and `636` tests.
- `./verify.sh --strict`: pass, `9` pass, `0` fail, `1` warn.

The strict verify warning was:

```text
Plan immutability check skipped (not a git repository or git not available).
```

## Current status

Expected worktree status:

```text
## research/open-scaffold-efficiency-150...origin/main
 M README.md
 M docs/EVIDENCE_METHODOLOGY.md
 M docs/EVOLUTION_LOOP.md
 M docs/FAQ.md
 M src/cli.ts
 M src/evolution.ts
?? src/evolution-efficiency.ts
 M tests/cli-evolution.test.ts
 M tests/evolution.test.ts
 M tests/public-positioning.test.ts
 M tests/section-parser.test.ts
?? .osc/plans/active/150-open-scaffold-efficiency-reset.md
?? .osc/specs/150-efficiency-reset-hermes-review.md
```

## Hermes recommendation applied

Hermes recommended `accept with scope reduction` and this worktree now reflects that:

1. `--compact` remains product-facing controller output.
2. `--efficiency` is explicitly diagnostic/experimental, not a polished public proof surface.
3. The 12-target matrix is diagnostic; public summary counts `11/12` strong targets and labels `target.terminal.packet_to_action_block` as marginal.
4. Missing token/cost telemetry blocks token/cost savings claims and remains a prominent warning.
5. Efficiency-report machinery was isolated into `src/evolution-efficiency.ts` instead of growing `src/evolution.ts` further.
6. The active plan trace remains in the diff as the scaffold-native work record.
7. Public docs remain blunt about "not smarter, not benchmark proof" and now call the efficiency report diagnostic/experimental.
8. No-op retry routing remains `inspect_scorer` as the boundary-safe first action; `redesign` remains reserved for plateau plus non-moving/impossible failures.

## Recommended Hermes checks

Run these from the worktree:

```sh
cd <isolated-worktree>
git status --short --branch
git diff --stat
git diff -- src/evolution.ts src/evolution-efficiency.ts src/cli.ts tests/evolution.test.ts tests/cli-evolution.test.ts
npm run osc -- evolve analyze examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer --efficiency
npm run osc -- evolve analyze examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer --compact
git diff --check
npm run build
npm test
./verify.sh --strict
```

Also verify the source repo was not edited:

```sh
cd <source-repo>
git status --short --branch
```

## Decision options

Accept with scope reduction:

- Current recommended path. Keep the compact signal, keep diagnostic efficiency measurement, but do not headline raw `12/12` target count as product proof.

Request more measurement:

- Appropriate if token/cost receipts must exist before any efficiency language lands.

Reject:

- Appropriate if Hermes decides this is still too much scaffolding and the right move is deletion/compaction without new report machinery.

## Bottom line

The patch achieves a measured `2.924672x` controller-output reduction on the public fixture, finds `12/12` diagnostic local `>=1.5x` targets, and exposes `11/12` as strong public-summary targets after excluding one marginal `1.56x` row.

That is enough to review as an Open Scaffold workflow-control efficiency improvement.

It is not enough to claim benchmark support, model improvement, real cost reduction, or real-world productivity improvement.
