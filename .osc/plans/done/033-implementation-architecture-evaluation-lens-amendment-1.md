# Amendment 1: 033-implementation-architecture-evaluation-lens

## Parent

033-implementation-architecture-evaluation-lens

## Date

2026-05-17

## Learning

Owner review of PR #39 found that the initial six-component map was too conservative around evaluation and audit trails. The map correctly avoided claiming domain correctness, model benchmarking, runtime enforcement, legal compliance, or external ledger ownership, but it could be read as if evaluation methodology and audit-envelope standards mostly belong outside Open Scaffold core.

The improved architecture distinction is: Open Scaffold core should own the portable evaluation loop contract, feedback-routing method, audit envelope shape, artifact-digest vocabulary, and optional anchor-receipt standard. Humans, CI, domain systems, runtime adapters, external evaluators, and ledger/notary providers supply judgment, execution evidence, or external anchoring.

## New direction

PR #39 is rescoped from a small implementation-architecture concept page into an architecture-direction slice for Open Scaffold core standards around:

- audit envelopes for reconstructing what was planned, run, evidenced, reviewed, approved, and carried forward;
- evaluation envelopes for mapping acceptance criteria to evidence, evaluator source, feedback, verdict, confidence, and next action;
- a closed evaluation loop that feeds user/reviewer feedback into retry, amendment, next-slice, roadmap, blocker, or close decisions;
- clear core/adapters/system-of-record/human boundaries that avoid unsupported compliance, runtime, or model-benchmark claims.

This amendment does not authorize `osc eval` implementation, runtime spawning, model/task-fit benchmarking, provider SDK integration, Hedera/hashgraph anchoring, legal audit certification, or automated compliance judgment in PR #39. Those remain follow-up slices behind explicit plans.

## Impact on acceptance criteria

The parent acceptance criteria are expanded for PR #39 as follows:

- The implementation-architecture wiki page must define audit envelope, evaluation envelope, closed evaluation loop, and feedback-based improvement direction, not only list the six components.
- `docs/SLICE_CLOSE_PROTOCOL.md` must describe evaluation envelopes as acceptance-criteria-to-evidence-to-decision records and preserve the distinction between postflight and approval.
- `docs/RUNTIME_BINDING_CONTRACT.md` must state what runtime bindings/adapters return into audit/evaluation envelopes without making core responsible for spawning, credentials, runtime auth, or final approval.
- `docs/TASK_RUN_MODEL.md` must name evaluation and audit envelope identity as post-run/postflight records separate from the run attempt itself.
- `.osc/plans/handoff-template.md` must prompt future plans for audit envelope, evaluation envelope, feedback routing, and boundary when implementation architecture coverage matters.
- `ROADMAP.md`, the release/evidence note, wiki index, and wiki log must be reconciled with this architecture direction.
- A follow-up backlog plan must capture schema-backed evaluation-envelope / `osc eval` mechanics so PR #39 stays docs/protocol-only.
