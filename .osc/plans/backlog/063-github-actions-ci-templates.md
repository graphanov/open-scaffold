# Plan: 063-github-actions-ci-templates

## Status

backlog

## Context

The repo ships one CI workflow (`.github/workflows/ci.yml` — build and test). Scaffold users get zero automated guardrails beyond that single check. The scaffold's own design emphasizes mechanical verification, but the verification isn't running automatically. Four specialized CI workflows would turn the scaffold's verification principles into always-on automated gates: plan validation on every PR, stale plan detection on a schedule, evidence note validation on release changes, and npm publish on version tags. These templates serve dual purpose: they dogfood the scaffold on itself (proving the system works) and they serve as copy-paste templates for any downstream scaffold project.

## Goal

Ship 4 production-grade GitHub Actions workflow templates plus a CI strategy guide, so scaffold projects get automated plan validation, stale plan detection, evidence verification, and npm publishing from day one.

## Constraints / Out of scope

- Workflows use only built-in GitHub Actions (`actions/checkout`, `actions/setup-node`) plus the project's own `osc` CLI (via `npx open-scaffold` or local build).
- No unpublished third-party actions. No Docker container actions in v1.
- Workflows target `ubuntu-latest` only in v1. macOS/Windows runners are deferred.
- Workflows must function with full git history available (`fetch-depth: 0` for plan immutability checks).
- Stale plan workflow opens a GitHub Issue, not just logs — issues are the task bridge for most scaffold users.
- NPM publish workflow only triggers on version tags (`v*`), not on every merge to main.
- CI strategy doc (`docs/CI.md`) explains what each workflow does, when to use it, and how to customize it for private repos or different package registries.

## Files to touch

- `.github/workflows/plan-validate.yml` — new: on PR, runs `osc plan validate` on changed plans, fails if issues found
- `.github/workflows/stale-plans.yml` — new: on schedule (weekly), detects plans in `active/` older than 30 days, opens GitHub Issue listing stale plans
- `.github/workflows/evidence-validate.yml` — new: on PR touching `.osc/releases/`, runs `osc verify --strict` evidence checks
- `.github/workflows/npm-publish.yml` — new: on tag push matching `v*`, runs build+test, publishes to npm
- `docs/CI.md` — new file: CI strategy guide explaining each workflow, configuration, customization for private registries, and local testing with `act`
- `docs/GITHUB_WORKFLOW.md` — add CI section referencing the new templates

## Acceptance criteria

- [ ] `plan-validate.yml`: triggers on PRs that touch `.osc/plans/**/*.md` files. Checks out full history. Runs `osc plan validate <each-changed-plan>`. Fails PR if any plan has errors (missing sections, TODOs, empty AC). Passes if only warnings.
- [ ] `stale-plans.yml`: triggers on `schedule: cron(0 9 * * 1)` (Monday 9am UTC) and `workflow_dispatch` (manual trigger). Scans `.osc/plans/active/` for plans with mtime >30 days. If stale plans found, opens a GitHub Issue titled "Stale active plans — week of YYYY-MM-DD" with plan names, last modified dates, and suggestion to move to `blocked/` or `done/`. If no stale plans, workflow passes silently (no issue).
- [ ] `evidence-validate.yml`: triggers on PRs touching `.osc/releases/**/*.md`. Runs `./verify.sh --strict`. Validates that evidence notes have all required sections (Summary, Traceability, Verification, Outcome). Fails if evidence note says "pending" while citing merged PR or closed issue (stale evidence detection).
- [ ] `npm-publish.yml`: triggers on tag push matching `v*`. Runs `npm ci && npm run build && npm test`. If all pass, runs `npm publish`. Uses `NPM_TOKEN` secret. Does NOT run on regular pushes or PRs.
- [ ] All workflows are valid YAML (pass `actionlint` or manual syntax check).
- [ ] `docs/CI.md` explains: what each workflow does, how to enable/disable, how to customize stale days threshold, how to test locally with `act`, and how to adapt for private npm registries.
- [ ] Existing `.github/workflows/ci.yml` continues to work alongside new workflows (no conflicts).
- [ ] Workflows are tested: at minimum, dry-run validation via `act` or manual YAML schema check. Ideally, push a test branch and verify at least `plan-validate.yml` runs in CI.

## Verification steps

1. **YAML validity:** Run each workflow through a YAML linter or `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/plan-validate.yml'))"` for each file.
2. **Plan validate test:** Create a branch with a deliberately broken plan (missing ## Goal section). Push a PR. Verify CI fails with specific error message pointing to the plan and missing section.
3. **Plan validate good test:** Create a branch with a valid plan. Push PR. Verify CI passes.
4. **Stale plans test:** Temporarily set stale threshold to 1 day. Create an active plan and `touch -t 202601010000` to make it appear old. Run the workflow (via `workflow_dispatch` or `act`). Verify issue is created with the plan name and age.
5. **Evidence validate test:** Create a branch touching `.osc/releases/` with an evidence note that says "pending" but also "PR #10 merged". Push PR. Verify CI warns about stale evidence.
6. **NPM publish test:** Create a test tag (`v0.0.0-test`). Push. Verify workflow triggers, runs build/test, and attempts publish (will fail on auth if NPM_TOKEN not set, but verify it reaches that step).
7. **Integration:** Run `./verify.sh --standard` after adding workflows. Verify passes (workflows are .github/, not plans).

## Open questions

- Should `stale-plans.yml` automatically move stale plans to `blocked/` instead of just opening an issue? Decision: no — auto-mutation of plan state from CI is too aggressive. Opening an issue is the right level of automation; the human decides.
- Should the npm publish workflow also create a GitHub Release with auto-generated release notes? This would be a natural enhancement. Keep v1 minimal (publish only) and add release creation in a follow-up.
- Should workflows be opt-in (in a `templates/` directory) or active by default (in `.github/workflows/`)? Active by default — they're harmless if the repo doesn't have plans/evidence yet (they'll just pass with zero findings), and they provide immediate value when plans are created.
