# Plan: 126-pr-native-evidence-surface

## Status

backlog

## Context

Open Scaffold's value to reviewers is that intent, acceptance criteria, evidence, and approval state live in the repo. Today a reviewer must open `.osc/` files to see that context; it is not surfaced where review actually happens — the pull request. The glass cockpit and Discord posts (done `062`, `096`) target an operator surface, and CI templates exist (done `063`), but the review surface itself does not yet carry the plan + acceptance-criteria delta + evidence summary automatically. This plan adds a read-only PR-native summary, staying inside the existing "operator surfaces mirror, they are not canonical" boundary.

## Goal

Provide an `osc pr-summary <plan-slug> [--format markdown]` renderer that emits a reviewer-ready summary (plan goal, acceptance-criteria checklist state, evidence-note status, open questions) plus an optional GitHub Action that posts/updates it as a single PR comment.

## Constraints / Out of scope

- Read-only suggestion surface only: this must never become a write-capable execution trigger (per the `2026-05-28` control-loop ADR's trigger model).
- No new canonical state: the PR comment mirrors `.osc/` artifacts; it is not a source of truth.
- No required GitHub-specific dependency in core: the summary is a renderer over existing read helpers; the GitHub Action is a thin optional wrapper, like the existing CI templates.
- Verify before building: confirm this is not already covered by `docs/GITHUB_WORKFLOW.md`, the `063` CI templates, or glass-cockpit webhooks; if substantially covered, downgrade this plan to a docs/wiring task instead of new code.

## Files to touch

- `docs/GITHUB_WORKFLOW.md` — document the PR-summary surface and its read-only boundary (verify current contents first).
- `src/cli.ts` — add `osc pr-summary` reusing `scaffold.ts` plan/evidence readers and `plan-validate.ts`.
- `.github/workflows/` (template only) — an optional, opt-in workflow that runs `osc pr-summary` and upserts one PR comment.
- `tests/cli-pr-summary.test.ts` — renderer output and idempotency tests.

## Implementation Architecture Coverage

- Strengthens: reviewability and audit-trail visibility at the review surface.
- Audit envelope: plan slug, AC state, evidence-note path, and the rendered summary text.
- Evaluation envelope: snapshot tests of the rendered markdown plus an idempotency test (re-running updates one comment, never duplicates).
- Feedback routing: a missing or invalid plan renders an explicit "no plan found / plan invalid" summary rather than failing the PR check.
- Boundary: read-only mirror; no commit/merge authority; no canonical state; GitHub wrapper stays optional.

## Acceptance criteria

- [ ] Pre-work check recorded: a one-line note in the PR/commit stating whether `docs/GITHUB_WORKFLOW.md` / `063` / webhooks already cover this, with the decision to proceed or downgrade.
- [ ] `osc pr-summary <slug>` renders goal, AC checklist with checked/unchecked state, evidence-note presence, and open questions.
- [ ] The renderer reuses existing plan/evidence readers and `plan-validate` rather than re-parsing plans independently.
- [ ] The optional GitHub Action is opt-in, runs read-only, and upserts exactly one PR comment on re-run.
- [ ] Tests prove idempotent comment content (no duplication) and a graceful "no/invalid plan" path.

## Verification steps

1. Run `npm test -- --run tests/cli-pr-summary.test.ts` — expect green.
2. Run `osc pr-summary <a-done-plan-slug> --format markdown` and confirm AC state matches the plan file.
3. Run the workflow locally (act or manual invocation) twice against a fixture and confirm a single comment body, updated not duplicated.
4. Run `npm run build` and `./verify.sh --strict` — expect pass.

## Open questions

- Is any of this already delivered by the glass cockpit webhooks or CI templates, such that this should become a wiring/docs task rather than new code?
- Should the summary be posted by a GitHub Action, surfaced via the existing webhook path, or both, to avoid duplicating the operator-surface mechanism?
