# Plan: 056-run-dry-run-preview

## Status

done — implemented in this slice. `osc run <plan> --dry-run` now previews run packets without writing `.osc/runs/` artifacts.

## Context

`osc run <plan>` creates a real run packet under `.osc/runs/<run_id>/` containing `run.json` (metadata, executor lane, harness skill, workflow), `package.md` (the prompt/instruction text for the executor), and associated files. Once created, the run is part of the project's evidence trail — it has a `run_id`, it appears in status dashboards, and downstream tools may act on it. Users and reviewers need a way to see exactly what would be generated without creating anything: a dry run that validates the plan, generates the full package in-memory, prints it to stdout, and reports what an executor would do. This is the `terraform plan` or `kubectl apply --dry-run=client` equivalent for Open Scaffold runs — a preview that builds confidence before execution.

## Goal

Add `osc run <plan> --dry-run` that validates the plan, generates the complete `run.json` and `package.md` in memory, prints them to stdout with a human-readable summary, and exits without creating any files in `.osc/runs/`.

## Constraints / Out of scope

- Must NOT create `.osc/runs/` directories, `run.json`, `package.md`, or any other files. The dry run is read-only.
- Must validate the plan and report blockers as if creating a real run — if `packageQuality.executable` would be `false`, the dry run must report the blocking issues and exit non-zero.
- Must show which files would be touched (from the plan's `## Files to touch` section) and the executor lane, harness skill, and workflow that would be used.
- Does NOT validate that files listed in `## Files to touch` actually exist — that is the linter's domain or a future `--check-files` flag.
- Does NOT invoke the executor or simulate execution — it shows the packet that would be sent, not the result of sending it.
- The output format (`--json` for programmatic consumers, human-readable summary for terminal) must be stable and documented.

## Files to touch

- `src/artifacts.ts` — add `dryRun: boolean` mode to the run artifact generation pipeline. In dry-run mode, build `run.json` and `package.md` in memory, then return them instead of writing to disk. The `generateRunArtifacts()` function gains a `mode: 'write' | 'dry-run'` parameter.
- `src/cli.ts` — wire `--dry-run` flag on `osc run` subcommand with optional `--json` flag for machine-parseable output. Update help text.
- `tests/artifacts.test.ts` — add test cases: dry-run on valid plan (verify JSON output, no files created), dry-run on plan with missing AC (verify exit 1, blocking issues reported), dry-run on non-existent plan (verify error), dry-run output schema validation.
- `docs/WORKFLOW.md` — mention `osc run --dry-run` as the recommended pre-execution check, before `osc run` without the flag.

## Acceptance criteria

- [ ] `osc run .osc/plans/active/my-feature.md --dry-run` prints the complete `run.json` that would be generated to stdout, followed by a human-readable summary.
- [ ] The summary includes: "Would create run <run_id> in .osc/runs/... with executor <executor>, workflow <workflow>, harness skill <skill>".
- [ ] The summary lists files that would be touched, extracted from the plan's `## Files to touch` section.
- [ ] Does NOT create any files or directories under `.osc/runs/` — verified by `ls .osc/runs/` before and after.
- [ ] Reports blockers if `packageQuality.executable` would be `false` (missing acceptance criteria, blocking open questions, undefined mission).
- [ ] Exit code 1 if the plan is not executable; exit code 0 if the dry run would succeed.
- [ ] `--json` flag outputs only the JSON (no summary), suitable for piping to `jq` or other tools.
- [ ] Works with `--runtime <name>` and `--workflow <name>` overrides, reflected in the generated `run.json`.

## Verification steps

1. Create a valid plan with acceptance criteria. Run `osc run .osc/plans/active/test-plan.md --dry-run --runtime omx --workflow plan`. Verify stdout contains valid `run.json` with `executor: "omx-codex"`, `workflow: "plan"`, and a `harnessSkill` field.
2. Verify no files created: `ls .osc/runs/` before and after the command — list must be identical.
3. Run `osc run .osc/plans/active/test-plan.md --dry-run --json | jq '.'` — verify valid JSON with expected fields (`runId`, `planSlug`, `executor`, `workflow`, `harnessSkill`, `packageMarkdown`, `filesToTouch`, `packageQuality`).
4. Create a plan with empty acceptance criteria. Run `osc run .osc/plans/active/bad-plan.md --dry-run`. Expected: exit 1, message about `packageQuality.executable: false`, details on missing AC.
5. Run `osc run nonexistent-plan.md --dry-run`. Expected: non-zero exit, "plan not found" message.
6. Run `osc run .osc/plans/active/test-plan.md --dry-run --runtime omc --workflow code-review`. Verify `run.json` reflects `executor: "omc-claude"` and `workflow: "code-review"`.

## Open questions

- Should the dry-run output include an estimated token count or cost estimate for the executor? That would require model-specific pricing data and is out of scope, but a character count of the generated `package.md` would be a cheap proxy.
- Should `osc run --dry-run` be the default behavior, requiring `--execute` or `--write` to actually create the run? Changing defaults would break existing workflows; keep `--dry-run` as an opt-in flag and document it as the recommended first step.
- Should the dry-run also validate that the executor/harness skill is available? Currently the run packet just names the executor; validation would require checking that the named harness is installed, which crosses into environment dependency checking.
- Should `--dry-run` be available on `osc amend` and `osc close` as well? Those commands are simpler and less destructive, but dry-run consistency across all lifecycle commands is desirable. Defer to future plans.
