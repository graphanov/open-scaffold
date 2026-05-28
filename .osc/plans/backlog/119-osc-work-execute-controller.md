# Plan: 119-osc-work-execute-controller

## Status

backlog

## Context

The runtime adoption RALPLAN concluded that Open Scaffold will not become broadly adoptable if users must manually chain plan, run, dispatch, evidence, verify, and close commands forever. The same review rejected a native black-box runtime in core: Open Scaffold should own the `osc work` run-lifecycle controller, ledger, gates, receipts, evidence, and verification wiring while adapters own worker execution, provider auth, process spawning, sandbox translation, and runtime sessions.

## Goal

Design and ship a safe, provider-neutral `osc work` execution controller that can run an approved work package through an explicit adapter while preserving repo-native truth, bounded evidence, verification, and human approval gates.

## Constraints / Out of scope

- No native autonomous runtime in Open Scaffold core.
- No hidden spawning, local daemon MVP, hosted coordinator, auto-install, or provider SDK dependency in core.
- No provider lock-in: Codex/OMX may remain the first proof, but the controller contract must fit Claude Code, OpenHands, shell, human, and future adapters.
- No secrets by default; any credential access must be explicit, scoped, redacted, and adapter-owned.
- No commit, push, PR creation, merge, publish, release, deploy, or external-production authority without a human gate.
- No claim that a dispatch receipt proves task correctness; receipts prove handoff/execution facts only.
- No write-capable run outside an isolated worktree/branch and declared path scope.
- No runtime implementation code in the docs/ADR precursor slice; this backlog plan is the future implementation queue.

## Files to touch

- `docs/decisions/2026-05-28-runtime-control-loop-not-native-runtime.md` — record the strategic decision before implementation.
- `docs/RUNTIME_ADOPTION_WORKFLOW.md` — define the `osc work` execution-controller product shape and UX.
- `docs/SPAWNING_BOUNDARY.md` — tighten the boundary between controller-owned gates and adapter-owned spawning.
- `docs/AGENTIC_RUNTIME_LAYER.md` — align the agentic-runtime layer with controller-not-runtime wording.
- `docs/RUNTIME_BINDING_CONTRACT.md` — add the run-bound state, adapter manifest, and security gate contract.
- `docs/STABILITY.md` — mark non-dry-run `osc work` execution as future/experimental, not v1 stable.
- `ROADMAP.md` — promote this as the next post-v1 adoption workflow backlog slice.
- `docs/decisions/README.md` — index the decision for future agents.
- Future implementation files after the ADR is accepted: `src/cli.ts`, `src/work*.ts`, `src/dispatch*.ts`, `src/run*.ts`, `packages/*runtime*/`, and focused tests for controller/security behavior.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Freeze the public decision: controller yes, native runtime no. | None | A |
| T2 | Specify controller state and trigger model. | T1 | B |
| T3 | Specify adapter security floor and output manifest. | T1 | B |
| T4 | Implement the minimal `osc work --execute --allow-spawn` controller behind explicit gates. | T2, T3 | C |
| T5 | Add focused tests, fixtures, and strict verification. | T4 | D |
| T6 | Document UX, failure states, and human gates from first 60 seconds through postflight. | T2, T3 | C |

### Parallel groups

- **Group A** (decision first): T1 — freezes the boundary so implementation cannot drift into a native runtime.
- **Group B** (contract split): T2 and T3 — state model and adapter security can be drafted independently after the decision.
- **Group C** (implementation plus docs): T4 and T6 — controller mechanics and user-facing docs can proceed once state/security contracts exist.
- **Group D** (verification): T5 — depends on implemented controller behavior.

### Dependencies

- T4 must wait for T2/T3 because execution without state/security contracts is the exact failure mode this plan prevents.
- T5 must wait for T4 because tests should lock actual controller behavior, not aspirational docs.

### Delegation notes

- T2 and T3 are suitable for parallel architecture/security review lanes.
- T4 should have a single implementation owner because CLI/controller/dispatch wiring will share files.
- T5 should be owned by a separate verifier/test lane when possible.

## Implementation Architecture Coverage

- Strengthens: workflow design, adapter authority boundaries, evidence chain, audit trails, recovery/ownership, and adoption UX.
- Audit envelope: `.osc/runs/<run_id>/run.json`, `automation.json`, `automation-events.jsonl`, `dispatch-receipt.json`, `adapter-output-manifest.json`, bounded logs, evidence artifacts, verification output, and postflight summary.
- Evaluation envelope: plan acceptance criteria, declared verification commands, adapter output manifest, dispatch receipt, evidence paths, and explicit human gate decisions.
- Feedback routing: package validation failures become blockers or plan amendments; adapter failures return portable failure codes; verification failures create retry/fix plans; weak approvals remain weak and do not silently close work.
- Boundary: runtime execution, provider authentication, process spawning, sandbox translation, runtime-local sessions, credentials, raw transcripts, and live external-production side effects remain outside core.

## Acceptance criteria

- [ ] `osc work --execute --allow-spawn` refuses to run unless an executable plan/run package, explicit adapter, authority summary, and human approval are present.
- [ ] The controller creates run-bound state under `.osc/runs/<run_id>/` and does not store secrets, raw runtime transcripts, provider-local state, or unbounded logs.
- [ ] Adapter invocation uses an environment allowlist, timeout/kill behavior, bounded log capture, path containment, no symlink escape, and a structured adapter output manifest.
- [ ] Write-capable runs require an isolated worktree/branch and declared path scope.
- [ ] The adapter contract declares whether it spawned, what authority it used, where logs/evidence live, and which portable failure code applies when blocked.
- [ ] Dispatch receipts are documented and tested as handoff proof, not correctness proof.
- [ ] No commit, push, PR creation, merge, publish, release, deploy, or external-production side effect occurs without a human gate.
- [ ] The command remains provider-neutral: `--runtime codex` can be the first proof path, but the core controller does not import provider SDKs or assume OMX-only semantics.
- [ ] UX docs explain first-60-second dry run, first real gated run, stop states, and postflight choices in plain language.

## Verification steps

1. Run focused controller/security tests for adapter allowlists, timeout, bounded logs, path containment, worktree isolation, and human-gated external side effects.
2. Run `./verify.sh --strict` and confirm repository compliance passes.
3. Run `npm test` and confirm the package test suite passes, or document any scratch-environment contamination separately from product failures.
4. Run `npm run build` and confirm TypeScript/package build succeeds.
5. Run `git diff --check` and confirm no whitespace errors.
6. Manually review docs for forbidden implications: hidden spawning, daemon MVP, receipt-as-correctness, provider lock-in, or automatic commit/push/PR/merge/publish authority.

## Open questions

- Should the first implementation live in core CLI behind experimental flags or in an optional/lab package until the security floor is proven?
- What is the minimal adapter output manifest schema that is strict enough for safety without becoming provider-specific?
- Should retries always create new `run_id`s, or can a later controller support bounded sub-attempt IDs under one run after audit semantics are stronger?
- What operator UI is enough for approval gates before any dashboard or daemon exists?
