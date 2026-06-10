# GitHub Workflow

Open Scaffold treats GitHub as the public/versioned implementation layer: issues describe work, branches carry attempts, pull requests expose diffs, CI and reviewers gate quality, and releases record what shipped.

GitHub is not the only possible task system, but a mature Open Scaffold project should be able to trace meaningful work through GitHub without relying on chat history or runtime logs.

## Canonical chain

```text
ROADMAP.md item or product idea
  -> GitHub Issue or private task_id
  -> .osc plan/spec/package
  -> .osc run_id packet
  -> branch or worktree
  -> Pull Request
  -> CI + Codex review + human approval
  -> merge
  -> release note / evidence / roadmap update
```

Small fixes may skip some links. Substantial or semi-autonomous work should make the chain explicit.

## Source-of-truth boundaries

- `ROADMAP.md`: direction and invariants.
- GitHub Issue: public work request, discussion, and external reference.
- Task system / Kanban: live operational lifecycle when a coordinator owns one.
- `.osc/plans/`: executable slice contract and amendments.
- `.osc/runs/<run_id>/run.json`: one execution attempt, executor choice, bindings, evidence paths, and package-quality status.
- Branch/worktree: implementation surface for the attempt.
- Pull Request: review/publication surface for code changes.
- CI/Codex/human review: quality gates.
- Release note/evidence: durable outcome, either in GitHub Releases or a scaffold-native note such as `.osc/releases/<date>-<slug>.md`.

Do not treat a Discord thread, runtime transcript, or terminal session as sufficient recovery state.

## Issue shape

A GitHub Issue should be precise enough to become a task or plan:

```text
Roadmap item:
Objective:
Why now:
Acceptance criteria:
Non-goals:
Suggested execution lane:
Needs deep-interview/spec clarification:
Expected evidence:
```

If the issue is ambiguous, route it to clarification, deep-interview, or spec generation before implementation.

## From issue/task to run packet

When a coordinator decides to execute work, create a run packet that binds task state to execution:

```bash
osc run .osc/plans/active/<plan>.md \
  --task-id ISSUE-42 \
  --issue 42 \
  --executor omx-codex \
  --harness-skill '$ralplan' \
  --operator-surface discord \
  --repo /path/to/repo \
  --branch feat/<slug>
```

Generic Open Scaffold writes the package and does not spawn the runtime. A coordinator or adapter consumes the package and launches OMC, OMX, a plain agent, or a human lane. OMC/OMX are runtime lanes or adapter candidates, not Open Scaffold core dependencies; see [`ADAPTERS.md#reference-labels-for-named-tools`](ADAPTERS.md#reference-labels-for-named-tools). Use `--issue`/`--pr` for typed GitHub bindings and repeat `--source-ref` for additional freeform references.

## Branch and PR policy

Use one branch per meaningful implementation attempt or coherent slice.

Recommended branch names:

```text
feat/<short-slice>
fix/<short-bug>
docs/<short-topic>
chore/<short-maintenance>
```

Open the PR with traceability back to the task/run chain. The PR body should include:

- Task ID or issue link.
- Run ID and run packet path.
- Plan/spec path.
- Executor lane and harness skill, if any.
- Verification commands and results.
- Evidence paths.
- Review gates: CI, Codex review, human approval.

## CI guardrails

Open Scaffold projects should keep repository truth mechanically checked in GitHub, not only in local agent sessions. The default workflow set is documented in [`docs/CI.md`](CI.md):

- `ci.yml` runs build, tests, strict scaffold verification, and CLI verification.
- `plan-validate.yml` validates changed `.osc/plans/**/*.md` files on PRs.
- `evidence-validate.yml` runs strict evidence checks for `.osc/releases/**/*.md` changes.
- `stale-plans.yml` runs weekly and opens a GitHub Issue for stale active plans instead of mutating plan state automatically.
- `publish-npm.yml` is the only active npm publish path and uses manual trusted publishing. Version tags and GitHub Releases are release markers only; publication, release, and deployment remain owner gates.
- `pr-summary.yml` is an optional, opt-in, read-only mirror that renders a plan summary onto its PR as a single comment. It is disabled by default and is not a quality gate; see [PR summary mirror](#pr-summary-mirror-optional).

CI failures should be resolved before merge unless the failure is explicitly classified as external infrastructure. CI does not replace Codex review or human approval.

## PR summary mirror (optional)

`osc pr-summary <plan-slug> [--format markdown|json]` renders a reviewer-ready summary of a plan from the `.osc/` artifacts already in the repository:

- the plan goal and stage,
- the acceptance-criteria checklist with checked/unchecked state and a count,
- evidence-note presence, approval status, path, and whether it is still a TODO skeleton,
- plan-validation results (reusing `osc plan validate`, not a second parser),
- open questions.

The command is read-only and reuses the same plan, evidence, and validation readers the rest of the CLI uses, so the summary cannot drift from canonical state. For a missing or unsafe plan slug it still exits `0` and renders an explicit "no plan found" body rather than failing, so it is safe to wire into a PR check.

`pr-summary.yml` is an optional workflow that mirrors this rendering onto a pull request as exactly one comment:

- **Opt-in.** It does nothing unless the repository variable `OSC_PR_SUMMARY` is set to `true`. The plan to summarize comes from `OSC_PR_SUMMARY_PLAN` (or the `plan` input on a manual `workflow_dispatch` run).
- **Read-only.** It requests `contents: read` and only writes a PR comment via `pull-requests: write`. It never edits plan, evidence, or release files.
- **Idempotent.** The rendered markdown carries a hidden marker on its first line; the workflow finds the one comment bearing that marker and updates it in place, so re-runs update a single comment instead of posting duplicates. The render is deterministic (no wall-clock timestamp), so an unchanged plan produces an identical body.

This PR comment is an operator-surface mirror, the same class of surface as the build-in-public events below. It is **not canonical state**: the `.osc/` plan and evidence files remain the source of truth, and nothing reads the comment back. If the mirror is disabled or fails, the canonical chain is unaffected.

## Codex review connector

If the ChatGPT/Codex GitHub connector is enabled for the repository, Codex review is triggered by the connector, not necessarily by assigning a normal GitHub user as a reviewer. If the connector is not installed for the repo, mark Codex review as intentionally skipped in the PR and record the rationale.

Known triggers:

```text
- Open a pull request for review.
- Mark a draft PR as ready for review.
- Comment: @codex review
```

If Codex has suggestions, it comments on the PR. If it has no suggestions, it may react with a thumbs-up. Codex can also be asked to answer questions or update the PR, for example:

```text
@codex address that feedback
```

Document whether the review ran in the PR checklist. If it does not auto-trigger after setup, comment `@codex review` and wait for the connector response.

## PR gates before merge

Do not merge meaningful work until these are satisfied or explicitly waived:

```text
[ ] Task/issue link present
[ ] Run packet present when execution was delegated
[ ] Plan/spec path present for non-trivial work
[ ] Verification commands run and results recorded
[ ] CI green or failures classified as external/infrastructure
[ ] Codex review triggered or intentionally skipped
[ ] Human approval captured where required
[ ] Evidence/release-note path updated when relevant
```

## Build-in-public / private cockpit mode

Discord, Slack, Telegram, and GitHub comments may expose the PR loop to humans:

```text
PR opened -> status post
CI failed -> blocker post
Codex review commented -> review post
Human approval needed -> approval request
Merged -> release/evidence receipt
```

These are operator-surface events. They should link back to GitHub issue/PR numbers, `task_id`, `run_id`, and evidence paths rather than becoming the canonical state themselves.

## Failure handling

- If a PR has no task/issue/run trace, add it before review.
- If Codex review does not appear, comment `@codex review` once after connector setup time.
- If CI fails, classify whether it is code, test, or external integration/access before changing code.
- If review requires changes, either amend the same branch or create a new run packet for a substantial retry.
- If a runtime session produced useful output but no PR, promote artifacts into `.osc/runs/` and explain why no PR was opened.

## Structural PR review with Open Scaffold

`osc pr check` gives reviewers a compact structural read of a PR's work record:

```bash
osc pr check <plan-slug>
osc pr check <plan-slug> --format json
osc pr check <plan-slug> --online-github
```

Reviewers should look for:

- plan path and stage;
- acceptance criteria and checked/unchecked state;
- evidence note presence and whether it is still a skeleton;
- run-packet references when execution was delegated;
- close-decision fields, including approval status and rationale;
- verification commands and results.

The GitHub template is `.github/workflows/open-scaffold-pr-check.yml`. It keeps fork PR checks read-only and makes comment mutation opt-in via `OSC_PR_CHECK_COMMENT=true`.
