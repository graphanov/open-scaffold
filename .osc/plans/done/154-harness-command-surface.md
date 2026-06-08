# Plan: 154-harness-command-surface

## Status

done

## Context

John Lomein proved useful as a prototype for controlled AI work packages, human gates, feedback learning, compact handoffs, and proof harnesses, but its meme command surface and broad benchmark claims do not belong in Open Scaffold. Open Scaffold needs a serious, transport-agnostic harness foundation that keeps the repo as truth while exposing a small human command grammar for chat, plugin, CLI, and future control-room surfaces.

## Goal

Add an Open Scaffold harness foundation with `$interview`, `$plan`, `$work`, and `$team` as the primary user-facing command surface, plus backend CLI/test/proof artifacts that preserve feedback, evidence, gates, and strict proof boundaries.

## Constraints / Out of scope

- Do not import John Lomein meme branding, commands, personas, or `.lomein/` runtime residue into public Open Scaffold surfaces.
- Do not claim Open Scaffold broadly beats naked Codex; source prototype evidence stays prototype evidence until Open Scaffold reproduction clears proof gates.
- Do not build a desktop app in this slice; only add the command/event/status foundation a future app can consume.
- Do not make Open Scaffold core depend on Codex UI, OMX internals, Hermes, or any specific transport.
- Do not merge PRs, publish npm, create GitHub Releases, rewrite history, or force-push.

## Files to touch

- `src/cli.ts` — expose backend commands such as `osc harness`, `osc feedback`, and `osc bench` for CI/tests/repro.
- `src/harness.ts` — parse and route `$interview`, `$plan`, `$work`, `$team` independent of transport.
- `src/harness-artifacts.ts` — write run/work package artifacts, events, statuses, human gates, worker lanes, and postflight files safely.
- `src/feedback.ts` — record/analyze feedback, generate repair hypotheses, and persist/load accepted improvements.
- `src/handoff.ts` — compile bounded handoff packets with required sections and a hard character budget.
- `src/bench.ts` — run simulated benchmark and handoff-lab fixtures plus strict proof gate checks.
- `src/path-safety.ts` — reject traversal and symlink descendant artifact writes under `.osc` output paths.
- `src/schema-registry.ts` — register new `osc.*`/`open-scaffold.*` harness schemas.
- `tests/harness.test.ts`, `tests/feedback.test.ts`, `tests/handoff.test.ts`, `tests/bench.test.ts`, `tests/path-safety.test.ts`, `tests/cli-harness.test.ts` — TDD coverage for the new contracts.
- `README.md`, `docs/HARNESS_COMMANDS.md`, `docs/HARNESS_ARCHITECTURE.md`, `docs/FEEDBACK_IMPROVEMENT_LOOP.md`, `docs/HANDOFF_COMPILER.md`, `docs/HARNESS_REPRODUCIBILITY.md`, `docs/CONTROL_ROOM_FOUNDATION.md`, `docs/JOHN_LOMEIN_MIGRATION.md`, `docs/JOHN_LOMEIN_MIGRATION_ROADMAP.md`, `docs/COMMAND_MATURITY.md` — plain-language product, architecture, feedback, handoff, benchmark, future control-room, migration, follow-up PR chain, and command maturity docs.
- `.osc/plans/backlog/155-controlled-runtime-parity.md`, `.osc/plans/backlog/156-feedback-handoff-improvement-parity.md`, `.osc/plans/backlog/157-reproduction-proof-parity.md`, `.osc/plans/backlog/158-team-control-room-adapter-parity.md`, `.osc/plans/backlog/159-harness-release-readiness.md` — follow-up backlog plans that carry the rest of the migration after PR #192.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Inspect Open Scaffold and John Lomein source surfaces, then define the first-PR contract. | None | A |
| T2 | Add failing tests for command routing, backend CLI, artifacts, human gates, feedback, improvement inheritance, handoff compiler, benchmark proof, and path safety. | T1 | B |
| T3 | Implement the harness router, event/status model, safe artifact writers, feedback/improvement primitives, handoff compiler, and simulated benchmark/handoff lab. | T2 | C |
| T4 | Update README and docs with plain-language harness framing and strict proof boundaries. | T2 | C |
| T5 | Run verification, simulated reproduction, handoff lab, scans, and independent review; fix only verified issues. | T3, T4 | D |
| T6 | Commit, push, and open the PR after all scoped gates are green. | T5 | E |

### Parallel groups

- **Group A** (discovery): T1 confirms existing conventions before code changes.
- **Group B** (TDD red): T2 defines behavior first.
- **Group C** (implementation/docs): T3 and T4 can proceed together after tests specify contracts, but shared help text/doc wording must be reconciled before verification.
- **Group D** (verification): T5 is sequential because failures must be root-caused before repair.
- **Group E** (publication): T6 happens only after scoped changes are verified.

### Dependencies

- T2 depends on T1 because the backend CLI shape must fit existing `osc` conventions.
- T3 depends on T2 because production code should be written against failing tests.
- T5 depends on T3 and T4 because verification must check real implementation and public wording together.

### Delegation notes

- Code review can be delegated after the diff exists, but implementation remains scoped to this branch.
- Live Codex reproduction is not required for this first PR unless budget/runtime remain safe after simulated and handoff-lab proof.

## Implementation Architecture Coverage

- Strengthens: command routing, controlled work packages, evidence receipts, human gates, feedback learning, benchmark proof discipline, and future control-room status contracts.
- Audit envelope: this plan, generated `.osc/runs/<run-id>/` smoke artifacts, `.osc/bench/<suite-id>/` local reproduction outputs, PR branch/commit, and verification logs.
- Evaluation envelope: Vitest tests, build, `verify.sh --strict`, CLI smokes for each `$command`, simulated benchmark aggregate/report, handoff-lab aggregate/report, diff hygiene, secret scan, and independent review.
- Feedback routing: failed/rejected work creates feedback records and repair hypotheses; accepted improvements persist under `.osc/improvements/applied/` and are loaded by later runs.
- Boundary: no native long-running runtime spawn, no desktop UI, no broad dominance claim, no merge/publish/release authority.

## Acceptance criteria

- [ ] Top-level help and docs present `$interview`, `$plan`, `$work`, and `$team` as the primary harness command surface while labeling `osc` subcommands as backend/CI/repro plumbing.
- [ ] A transport-agnostic command router parses and executes `$interview`, `$plan`, `$work`, and `$team` from a single backend CLI command without depending on Codex, Hermes, or desktop UI.
- [ ] `$interview` creates a bounded clarification/work-package draft and opens a human gate when required context is missing.
- [ ] `$plan` creates or amends a repo-native plan artifact without silently bypassing Open Scaffold plan conventions.
- [ ] `$work` creates a bounded controlled run/work package with events, status, evidence links, human gate support, postflight stub, and feedback files under `.osc/runs/<run-id>/`.
- [ ] Human-gate answers satisfy the gate and resume/continue the run as task input, not approval.
- [ ] `$team` creates or simulates multiple coordinated worker lanes with one shared evidence/postflight record.
- [ ] Feedback recording/analyzing supports human, tests, reviewer, benchmark, runtime, Codex, and Hermes sources; failed/rejected runs create repair hypotheses.
- [ ] Accepted improvements persist and future runs can inherit relevant accepted lessons.
- [ ] Handoff compiler enforces required sections and character budget.
- [ ] Simulated benchmark and handoff-lab commands produce aggregate/report artifacts, include quality/tokens/duration/rounds, run all explicitly selected ablation fixtures, and refuse broad claims when confounds remain.
- [ ] Artifact writers reject path traversal and symlink descendant escapes, including symlinked output root, method/lane roots, child artifact parents, and final symlink targets.
- [ ] Public docs contain no absolute local paths and keep John Lomein only as prototype provenance in migration notes.
- [ ] The migration roadmap records where PR #192 stops, which follow-up PR slots carry the remaining runtime/reproduction work, and which owner gates remain before merge, publish, release, or broad proof claims.

## Verification steps

1. Run targeted red tests before implementation and confirm they fail for missing harness behavior.
2. Run `npm test` and expect all Vitest suites to pass.
3. Run `npm run build` and expect TypeScript output to compile.
4. Run `./verify.sh --strict` and expect `0` exit.
5. Run `npm run osc -- --help` and confirm the four `$commands` are visible as primary harness UX.
6. Run harness CLI smokes for `$interview`, `$plan`, `$work`, and `$team` against a temporary scaffold and confirm artifacts/events/statuses are written under `.osc`.
7. Run `npm run osc -- bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke` and confirm aggregate/report are written without broad overclaim.
8. Run `npm run osc -- bench handoff-lab --out .osc/bench/handoff-lab-15` and confirm 15 candidates are evaluated and a budget-passing packet is reported.
9. Run `git diff --check` and a staged path/count-only secret scan.
10. Run an independent review focused on four-command UX clarity, Open Scaffold boundary, feedback preservation, path safety, proof overclaims, docs clarity, and desktop/control-room scope.

## Open questions

None. Live targeted Codex reproduction is optional and should be attempted only if simulated and handoff-lab reproduction are meaningful and budget/runtime remain safe.
