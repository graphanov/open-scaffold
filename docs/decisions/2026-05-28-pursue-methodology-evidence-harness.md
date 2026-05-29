# Pursue a methodology evidence harness; most other review ideas already exist

Date: 2026-05-28
Status: accepted direction; implementation in `.osc/plans/done/125-methodology-evidence-harness.md` and `.osc/plans/backlog/126-pr-native-evidence-surface.md`

## Verdict

An external review of the repository (clone, build, full test run, end-to-end CLI exercise, source read) produced a list of candidate improvements. On checking each against the actual roadmap and `.osc/plans/`, most were already scoped or done. One gap was real and deliberately unclaimed: there is no honesty-bounded, reproducible evidence layer for the methodology's value claims. The decision is to build that evidence layer and to surface plan/evidence context at the review surface, while explicitly not re-opening already-scoped work.

## What the review confirmed already exists

| Candidate idea | Existing coverage | Action |
|---|---|---|
| Gated `osc work` execution | Backlog `119-osc-work-execute-controller`, Milestone 19, `2026-05-28-runtime-control-loop-not-native-runtime.md`, `docs/SPAWNING_BOUNDARY.md` | None; do not duplicate |
| Runtime adapters / second reference adapter | Backlog `112`, `070`, `113`; done `041`, `042`, `043`, `102` | None; in progress |
| MCP server | Done `060`; harness MCP bridge in parking lot | None / parked |
| Active-plan staleness signal | Done `006`; `verify.sh` Check 10 | None |
| `close` blocking on incomplete evidence | Intentional: `scaffold.ts` documents that `closePlan` never blocks on evidence readiness; `osc metrics` reports evidence completeness | None; working as designed |
| Domain plan templates | Done `053` (code-oriented template library) | Optional minor follow-up only |
| Usage / cost accounting | Backlog `114-work-usage-ledger-v1` | None; adjacent, see below |

## The gap

`docs/FAQ.md` states in multiple places that time, cost, and quality benefits are "not benchmarked" and should be treated as hypotheses. `.osc/plans/backlog/114-work-usage-ledger-v1.md` explicitly lists "no productivity benchmark claims" as a boundary. `osc metrics` (done `059`) reports adoption descriptors (cycle time, evidence completeness) but does not convert the value hypotheses into reproducible, source-labeled evidence. So the project's own stated credibility weakness — unproven value — has no plan addressing it.

## Why an evidence harness, done conservatively, is the right answer

The product's distinguishing posture is honesty (no fake benchmarks, source-labeled data, a "when not to use this" section). A value-evidence layer must inherit that posture or it damages the brand it intends to support. The accepted shape is therefore:

- a measurement protocol (`docs/EVIDENCE_METHODOLOGY.md`) mapping named FAQ hypotheses to repo-observable signals, with explicit threats to validity;
- an `osc study` command that computes only source-labeled signals from committed git and `.osc/` artifacts, emitting `null`/`unavailable` rather than imputing;
- a first self-study over this repository's own history that reports whatever it finds, including null or negative results, with an explicit "what this cannot prove" section.

No causal claim, no provider/model benchmarking, no telemetry, and no README/MISSION marketing claim without a separate owner gate.

## Architecture options considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Do nothing; keep "not benchmarked" | Zero risk of overclaim | Leaves the stated adoption bottleneck unaddressed | Reject |
| Marketing benchmark with headline numbers | Persuasive | Violates the honesty posture; numbers rot; invites distrust | Reject strongly |
| Source-labeled observational `osc study` + honest self-study | Inherits the honesty posture; reproducible; repo-native | Cannot prove causation; signals are indirect | Choose |
| Full controlled A/B study now | Strongest causal evidence | Heavy; needs matched cohorts; premature before a baseline exists | Defer to protocol-only text in `125`'s open questions |
| Extend `114` usage ledger to make value claims | Reuses planned work | `114` deliberately excludes productivity claims; mixing scopes weakens both | Reject; keep `125` separate and let it consume `114` data as `unavailable` when absent |

## Boundaries this decision preserves

`osc study` is read-only over local git and `.osc/` and makes no network calls. It does not replace `osc metrics` or `osc eval`; it composes their outputs into a value-evidence view. The self-study is evidence, not a published claim; any public statement is a separate, later, owner-gated decision. The PR-native summary (`125`) is a read-only mirror surface and must never become a write-capable trigger, consistent with the control-loop ADR's trigger model.

## Considered and deferred

- Non-code domain plan templates (research/writing/design variants of `053`): low cost, low urgency; open as a small follow-up if demand appears.
- Editor (VS Code / JetBrains) extensions for plan authoring and validation: genuinely net-new but expands surface area against the "core stays thin" posture; defer unless adoption evidence justifies it.

## Provenance

This decision originates from an external analysis session conducted in a chat interface. Per the project's own thesis, the findings were committed to the repository rather than left in chat history. The operational continuation path is recorded in `CLAUDE_CODE_HANDOFF.md` at the repository root.
