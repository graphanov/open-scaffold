# Plan: 055-plan-linter

## Status

backlog — depends on 050 (npm publish) for `osc plan` subcommand availability. Complements 052 (wizard) and 053 (templates) by providing post-creation quality feedback. The linter catches structural and heuristic issues at plan creation time rather than waiting for verification at PR time.

## Context

`verify.sh --strict` checks plan structure at the verification gate — typically when a PR is opened or a slice is being closed. By then, the plan has already been used for implementation. A dedicated `osc plan validate <slug>` that runs at plan creation time catches problems early: missing sections, empty acceptance criteria, vague goals that can't be verified, status/stage mismatches, and `TODO:` markers that should have been filled. This is the plan-level equivalent of ESLint for JavaScript or ruff for Python — mechanical checks that give instant feedback with line numbers and fix suggestions. The linter is mechanical and heuristic, not semantic: it can tell you a section is empty, but it cannot tell you whether the acceptance criteria are correct for the goal.

## Goal

Add `osc plan validate <slug-or-path>` that performs mechanical and heuristic checks on a plan file, reports actionable issues with severity (error/warning/note), line number, and fix suggestion, and supports machine-parseable JSON output for CI integration.

## Constraints / Out of scope

- Checks are mechanical and heuristic, not semantic — the linter detects missing sections, empty AC, `TODO:` markers, and vague goals (heuristic word matching), but cannot judge whether the AC is correct or the goal is achievable.
- Must work for plans in any stage folder (`active/`, `backlog/`, `blocked/`, `done/`).
- Must output machine-parseable JSON with `--json` flag for CI/tool integration.
- Must NOT require network access — all checks run locally against the file.
- Does NOT validate that referenced files in `## Files to touch` actually exist — that's a separate `--check-files` flag (future enhancement).
- Does NOT auto-fix issues — the linter reports problems; the user fixes them. Auto-fix for simple issues (e.g., adding missing sections) is a future enhancement.

## Files to touch

- `src/validate-plan.ts` — new file: linter engine with rule registry, file parser, issue reporter. Rules: `required-sections` (all 7 sections present), `no-todos` (no `TODO:` markers), `non-empty-ac` (at least one non-empty acceptance criterion), `no-vague-goal` (heuristic: flags goals containing only "improve", "fix", "update" without specifics), `blocking-questions-tagged` (open questions about blockers should have `BLOCKING:` prefix), `status-stage-consistency` (plan's `## Status` must match the folder it's in — e.g., `## Status: active` in `backlog/` is an error), `heading-order` (headings must be in the canonical order), `no-empty-sections` (sections other than Open questions must not be empty).
- `src/cli.ts` — wire `validate` subcommand under `osc plan` with `--json`, `--strict` flags.
- `tests/plan-validate.test.ts` — test cases: perfect plan (0 issues), missing section (1 error), multiple TODOs (1 error per TODO), empty AC (1 warning), vague goal (1 warning), status/folder mismatch (1 error), edge cases (empty file, binary file, non-existent file).
- `tests/fixtures/` — create test plan fixtures: `plan-valid.md`, `plan-missing-section.md`, `plan-with-todos.md`, `plan-empty-ac.md`, `plan-vague-goal.md`, `plan-status-mismatch.md`.
- `docs/WORKFLOW.md` — mention `osc plan validate` as recommended step after `osc plan new` or `osc plan wizard`.

## Acceptance criteria

- [ ] `osc plan validate my-feature` checks: all 7 required sections present, no `TODO:` markers, acceptance criteria section not empty, goal section not consisting solely of vague words ("improve", "fix", "update" without specifics), open questions about blockers use `BLOCKING:` prefix, plan status matches stage folder.
- [ ] Output includes severity level (`error`, `warning`, `note`), line number, and a fix suggestion for each issue.
- [ ] `--json` outputs a JSON array of issue objects: `[{severity, line, rule, message, suggestion}]`.
- [ ] Exit code is 0 for clean, 1 for any error-level issues, 0 for warnings-only when `--strict` is NOT set. With `--strict`, exit code 1 for any warning or error.
- [ ] Works for plans in `active/`, `backlog/`, `blocked/`, and `done/` — resolves the slug to the appropriate stage folder.
- [ ] Detects plan status/folder mismatch: if `## Status` says `active` but the file is in `backlog/`, reports an error.
- [ ] `osc plan validate nonexistent-plan` prints clear error and exits non-zero.

## Verification steps

1. Create a perfect plan fixture and run `osc plan validate tests/fixtures/plan-valid.md`. Expected: exit 0, no output (or "0 issues found").
2. Run `osc plan validate tests/fixtures/plan-valid.md --json | jq '. | length'`. Expected: 0.
3. Create a plan with missing `## Acceptance criteria` section. Run `osc plan validate tests/fixtures/plan-missing-section.md`. Expected: exit 1, output includes error about missing section with line number hint.
4. Create a plan with `TODO: write AC`. Run `osc plan validate tests/fixtures/plan-with-todos.md`. Expected: error about TODO marker at the relevant line.
5. Create a plan with `## Goal: Improve the system`. Run `osc plan validate tests/fixtures/plan-vague-goal.md`. Expected: warning about vague goal.
6. Create a plan with `## Status: active` but placed in `backlog/`. Run `osc plan validate tests/fixtures/plan-status-mismatch.md`. Expected: error about status/stage mismatch.
7. Run `osc plan validate --json tests/fixtures/plan-with-todos.md | jq '.'
   `. Confirm valid JSON with `severity`, `line`, `rule`, `message`, `suggestion` fields.
8. Run `osc plan validate nonexistent.md`. Expected: non-zero exit, "file not found" message.

## Open questions

- Should the linter also check that `MISSION.md` is defined before validating a plan? The verify.sh chain already enforces this; duplicating it in the linter adds coupling. Keep it in verify.sh for now.
- What heuristic threshold qualifies a goal as "vague"? Current plan: flag goals that are fewer than 5 words OR consist entirely of stopwords and generic verbs ("improve", "fix", "update", "change", "make better", "refactor"). This will have false positives for genuinely concise goals — the severity should be `warning` not `error`.
- Should the linter check for MISSION.md alignment (e.g., plan goal contradicts a MISSION.md non-goal)? That crosses into semantic analysis and is out of scope for a mechanical linter.
- Should `osc plan validate` be run automatically as a git pre-commit hook? A `.husky/pre-commit` hook that runs `osc plan validate` on staged plan files would be ideal but requires opt-in setup (Husky dependency). Document the hook in `docs/WORKFLOW.md` and leave it as a user opt-in.
