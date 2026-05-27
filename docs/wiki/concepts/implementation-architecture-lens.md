---
title: Implementation Architecture Lens
created: 2026-05-17
updated: 2026-05-17
type: concept
tags: [open-scaffold, workflow, evidence, governance, public-boundary]
sources: [docs/RUNTIME_BINDING_CONTRACT.md, docs/SPAWNING_BOUNDARY.md, docs/SLICE_CLOSE_PROTOCOL.md, docs/REFERENCE_TRUTH.md, ROADMAP.md]
confidence: medium
contested: false
---

# Implementation Architecture Lens

The implementation architecture lens explains where Open Scaffold belongs in real AI-assisted work: it is the repo-native protocol layer that makes intent, execution packages, evidence, feedback, approval, and follow-up reconstructable.

Many AI projects fail outside the model call. They fail when work has no owner, no source of truth, no authority boundary, no evaluation loop, no audit trail, or no recovery path after an agent session disappears.

## Architecture stance

Open Scaffold core should own the **envelope standards** for audit, evaluation, feedback routing, and slice improvement.

```text
Open Scaffold core defines the package, evidence, evaluation, audit, and routing contracts.
Coordinators and runtime adapters execute outside core and return artifacts/evidence into those contracts.
Systems of record own runtime data access, business authority, and production action logs.
Humans keep explicit approval gates for taste, risk, publication, and merge.
```

That means evaluation and audit trails are not simply "outside core." Core owns the portable loop and record shape. External tools, domain systems, and humans supply the judgment, execution, anchoring, and final authority.

For runtime lane labels and public/private reference wording, use `docs/REFERENCE_TRUTH.md`. For execution boundaries, use `docs/RUNTIME_BINDING_CONTRACT.md` and `docs/SPAWNING_BOUNDARY.md`.

## Six-component map

| Component | Open Scaffold coverage | What Open Scaffold provides | What stays outside core |
|---|---|---|---|
| Workflow design | owned | Mission, roadmap, plans, acceptance criteria, handoff templates, run packets, and close protocol make work explicit before execution. | Domain-specific process design, stakeholder policy, and organization-specific operating procedures. |
| Data access | out of scope / system-of-record-owned | Documentation boundaries and run-packet scope can state which data must not be touched. | Runtime row/field permissions, data warehouse access, secrets, customer data controls, and system-of-record authorization. |
| Authority | partial / adapter-owned | Commit policy, approval gates, allowed paths, human-in-the-loop expectations, and plan constraints make authority visible. | Runtime sandbox enforcement, credential delegation, business-action approval, production rollback authority, and provider-specific permission models. |
| Evaluation / feedback / improvement | owned for loop contract; external for domain judgment | Acceptance criteria, evaluation-envelope shape, evidence requirements, user/reviewer feedback capture, approval taxonomy, correction routing, and next-slice inheritance. | Domain/business-rule evaluators, model benchmarks, production-quality scoring, automated compliance judgment, and final taste/risk decisions. |
| Audit trails | owned for repo work and envelope standards | Git history, plans, amendments, run packets, evidence notes, release notes, PR links, artifact digests, local audit manifests, and audit-envelope vocabulary. Parent links, Merkle roots, and external-anchor receipt shapes are future extension points. | External ledger submission, provider SDKs, key custody, legal audit certification, runtime event capture from external systems, raw private/runtime log anchoring, and compliance attestation. |
| Recovery / ownership | owned for project continuation | Agent-readable mission, roadmap, active plans, task/run identity, evidence, evaluation records, audit envelopes, and handoff files let a human or agent resume work without vanished chat context. | Runtime session replay, live process recovery, production incident reversal, and business transaction compensation. |

## Audit envelope

An audit envelope is the reconstructable record around a slice or run. It does not need to contain every raw log. It needs to identify the durable artifacts that prove what happened and what was decided.

A minimal audit envelope should reference:

- intent: mission, roadmap item, plan, spec, or issue;
- identity: `task_id`, `run_id`, `question_id` where applicable;
- scope: allowed paths, non-goals, branch/worktree, and commit policy;
- authority: who may edit, commit, push, merge, approve, or publish;
- execution binding: runtime lane, adapter/coordinator, session/worktree metadata when available;
- artifacts: changed files, generated outputs, promoted logs, screenshots, or review reports;
- evidence: verification commands, acceptance-gate evidence, PR/release note, and reviewer comments;
- decision: `approved`, `weak_approved`, `rejected`, or `blocked`;
- exclusions: secrets, customer data, raw private runtime transcripts, and external system audit logs unless deliberately promoted and safe.

The first structure-only implementation is local and vendor-neutral: `osc audit init` / `osc audit check` can generate a JSON `open-scaffold.audit-envelope.v1` manifest for a plan or run packet plus explicitly supplied curated artifacts, then verify repo-relative paths and sha256 digest consistency. That proves byte-level local artifact integrity only. It does not certify correctness, compliance, approval, runtime execution, model quality, or external anchoring.

Future tamper-evident versions can add envelope self-digests, parent links, Merkle batch roots, and external-anchor receipts. Core can define that portable shape. External notaries or ledger systems remain optional adapters.

## Evaluation envelope

An evaluation envelope is the post-run record that compares evidence and feedback against acceptance criteria.

A minimal evaluation envelope should capture:

- acceptance criterion ID or quoted criterion;
- status: `pass`, `partial`, `fail`, `blocked`, or `not_evaluated`;
- evaluator source: human, CI, reviewer, adapter, custom domain check, or external evaluator;
- evidence path or link;
- verification command or manual review basis;
- user/reviewer feedback attached to the criterion;
- confidence and known gaps;
- approval strength;
- next action: close, retry, amend, create next slice, open issue, update roadmap, or block.

Evaluator output is evidence. It is not automatic authority. Product approval, merge, release, compliance, and business-risk decisions stay explicit.

## Closed evaluation loop

Open Scaffold's closed loop is:

```text
plan/spec
  -> run packet
  -> execution lane
  -> audit/evaluation evidence
  -> postflight decision
  -> feedback routing
  -> amendment, retry, next slice, roadmap update, blocker, or close
```

A `run_id` is one attempt. A retry is a new run, not a rewrite. A postflight is not approval. A weak approval is not proof of product quality. Those distinctions let future slices inherit the truth rather than laundering uncertainty into durable product claims.

## Feedback-based improvement

Feedback improves the scaffold only when it is routed to the layer that needs it next.

| Finding | Durable destination |
|---|---|
| Acceptance criterion failed | fix/retry run, correction PR, or follow-up plan |
| Scope changed | plan amendment |
| Evaluation criteria changed | amendment or next plan |
| Runtime/adapter failed | runtime binding/adapters backlog or blocker note |
| Repeated evidence gap | validation/CLI backlog |
| Product direction changed | roadmap/decision update |
| Weak approval | evidence receipt plus next-slice inheritance caution |
| External audit/integrity need emerged | audit-envelope or anchor-adapter follow-up plan |

## How to use the lens in plans

For future plans, answer these briefly when the slice affects architecture, evidence, runtime boundaries, authority, or adoption trust:

1. Which implementation-architecture component does this slice strengthen?
2. What audit envelope is needed to reconstruct what happened?
3. What evaluation envelope will decide whether the result is acceptable?
4. Where should feedback or failure route next?
5. Which runtime, adapter, system-of-record, or human responsibility remains outside this slice?

Example:

```text
Implementation Architecture Coverage:
- Strengthens: evaluation, audit trails.
- Audit envelope: plan, run packet, PR, release note, verification output, Codex review.
- Evaluation envelope: AC1-AC4 pass/fail/partial with human feedback and evidence links.
- Feedback routing: failed ACs become retry or amendment; weak approval carries caution into next slice.
- Boundary: no model benchmarking, compliance certification, runtime enforcement, or external ledger integration.
```

## Non-claims

This lens does not claim that Open Scaffold:

- owns runtime data permissions;
- evaluates domain-specific business correctness automatically;
- launches or supervises live agents in core;
- certifies regulated compliance;
- provides legal audit sufficiency;
- is a trustless ledger;
- anchors raw private/runtime logs, customer data, or secrets;
- requires Hedera/hashgraph, Sigstore, or any external ledger/notary provider in core;
- reverses production business actions;
- recommends models or runtimes from benchmark evidence.

Those may become adapter, evaluator, runtime, ledger-anchor, or future-product work only after explicit evidence and approval.

## Follow-up candidates

Structured evaluation mechanics start with `osc eval init` and `osc eval check`: generate a JSON evaluation envelope, check that every acceptance criterion has evidence/status/rationale/evaluator coverage, and require a correction route for non-pass outcomes. This still does not automatically certify domain correctness, benchmark models, or replace human/product approval.

Local audit manifest mechanics start with `osc audit init` and `osc audit check`: generate a JSON audit-envelope digest manifest for curated local artifacts, then check repo-relative paths and sha256 digest consistency. This still does not certify compliance, approve release/merge, prove domain correctness, spawn runtimes, benchmark models, or anchor evidence externally.

Future audit work can define envelope self-digests, parent links, optional Merkle batch roots, and optional external-anchor receipt shapes. Hedera Consensus Service, Sigstore/Rekor, RFC3161 timestamping, Git signed tags, or other ledgers/notaries belong in optional adapters, not Open Scaffold core.

Related: [[source-of-truth-first-development]], [[evidence-first-development]], [[human-in-the-loop-governance]], [[run-packets]], [[agentic-orchestration]].
