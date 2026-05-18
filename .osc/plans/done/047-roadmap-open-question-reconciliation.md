# Plan: 047-roadmap-open-question-reconciliation

## Status

done

## Context

Open Scaffold's visible implementation backlog is now effectively exhausted after PR #52. Active plans are empty, Kanban is idle, open PRs are empty, and the only remaining backlog plans are broad hypotheses: `030-agent-runtime-selection-vision` and `031-agentic-orchestration-model-lab-vision`.

Many completed plans still contain historical `## Open questions` bullets. Some were answered by later PRs, some remain useful but speculative, and some may have catalyzed new roadmap direction. Leaving those questions scattered in done plans risks either forgetting useful signals or resurrecting stale questions as fake backlog.

## Goal

Produce one reviewable roadmap/open-question reconciliation that classifies historical open questions, cites shipped answers where they exist, and recommends the next small set of product/backlog decisions without editing committed done plans.

## Constraints / Out of scope

- Do not edit committed done plans to answer historical questions.
- Do not implement product features in this slice.
- Do not create one backlog plan per old question.
- Do not promote broad runtime/model-lab/compliance claims into roadmap, mission, README, or package docs without owner approval.
- Do not close or supersede `030` / `031` unless the reconciliation evidence proves they are no longer useful as backlog items.
- Keep private owner context out of public artifacts.

## Files to touch

- `docs/decisions/2026-05-18-open-question-reconciliation.md` — public reconciliation artifact with source inventory, classification counts, citations, and next-slice recommendation.
- `.osc/plans/backlog/*.md` — optional compact follow-up plans only for still-unanswered concrete work with testable acceptance criteria.
- `ROADMAP.md` — optional owner-approved wording only if the reconciliation catalyzes a product-direction change.
- `.osc/releases/2026-05-18-047-roadmap-open-question-reconciliation.md` — release/evidence note when the reconciliation PR is ready to close.
- `.osc/plans/done/047-roadmap-open-question-reconciliation.md` — final plan location after `./close.sh`.

## Acceptance criteria

- [x] The reconciliation inventories active, backlog, blocked, and done plan files; `.osc/releases`; `ROADMAP.md`; relevant `docs/wiki/concepts/*`; GitHub PR state; and Kanban state at a named cutoff commit.
- [x] Every current backlog plan is classified as keep, amend later, supersede, or convert into concrete follow-up work.
- [x] Historical `## Open questions` are grouped into the buckets: `answered_by_shipped_pr_or_doc`, `still_unanswered_concrete`, `still_unanswered_speculative`, `catalyzed_product_direction`, and `superseded_or_not_useful`.
- [x] Shipped answers cite concrete PRs, docs, tests, package code, or release/evidence notes.
- [x] New backlog output is compact: at most four concrete follow-up plans, each with observable acceptance criteria.
- [x] Speculative items are routed to parking lot, wiki, or decision note rather than near-term backlog.
- [x] Product-direction changes are separated as owner gates instead of silently edited into mission/roadmap claims.
- [x] The final recommendation names exactly one next Open Scaffold slice after reconciliation.

## Verification steps

1. `git status --short --branch` — branch is `roadmap/open-question-reconciliation` and only scoped reconciliation files are changed.
2. `./verify.sh --strict` — expected pass with 0 warnings before PR.
3. `npm run osc -- verify` — expected pass with 0 warnings.
4. `git diff --check` — expected no whitespace errors.
5. Review the reconciliation artifact manually against this plan's acceptance criteria.

## Open questions

- Should `030-agent-runtime-selection-vision` and `031-agentic-orchestration-model-lab-vision` remain backlog hypotheses after the reconciliation, or be superseded by narrower concrete plans?
- Which, if any, open question should become the immediate next implementation slice after this reconciliation?
- Should the reconciliation cadence become a public Open Scaffold convention or remain a Hermes roadmap-steward operating rule for this repo?