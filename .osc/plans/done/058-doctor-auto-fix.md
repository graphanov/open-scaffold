# Plan: 058-doctor-auto-fix

## Status

active


## Context

`osc doctor` currently diagnoses scaffold health issues — stale plans sitting in active/ while marked backlog, broken paired views where CLAUDE.md and AGENTS.md have drifted apart, missing changelog entries in MISSION.md for existing amendment files, and missing .osc/releases/README.md — but it only reports problems. The user must manually open each file and fix the alignment, which is tedious and error-prone. Many of these issues are mechanical: a plan's `## Status` line says "backlog" but the file lives in `active/`; an amendment file exists at `.osc/plans/active/050-npm-publish-amendment-1.md` but MISSION.md's `## Changelog` has no entry for it; CLAUDE.md has a `## Project facts` section that AGENTS.md lacks. These are deterministic repair operations — the system can fix them faster and more reliably than a human. Auto-fix reduces the maintenance burden of scaffold hygiene and makes `osc doctor` feel like a tool rather than a nag.

## Goal

Add `osc doctor [--fix] [--dry-run]` that can automatically repair common scaffold issues: misaligned plan status, missing changelog entries for existing amendment files, broken paired-view drift between CLAUDE.md and AGENTS.md, stale active plans (move to blocked/ with annotation), and missing `.osc/releases/README.md` — without ever modifying plan goals, acceptance criteria, or constraints.

## Constraints / Out of scope

- Auto-fix only for mechanically-detectable issues. Ambiguous problems (e.g., "should this plan be in done/ or superseded/?") are reported but never auto-resolved.
- Never modifies plan content beyond `## Status` alignment and stage folder movement. Plan goals, acceptance criteria, constraints, and verification steps are read-only.
- Never edits MISSION.md's `## Goals` or `## Non-Goals` sections — only the `## Changelog` section is eligible for auto-repair (backfilling missing amendment entries).
- `--fix` requires an explicit flag; the default mode (no flags) is diagnostic-only — reports issues with severity and fixability.
- `--dry-run` prints what would change without mutating any file on disk. Can be combined with `--fix` to preview repairs.
- Does NOT create new plans, close plans, or make judgment calls about plan correctness. Does NOT modify `.osc-dev/` contents.
- Must exit with code 0 when no unfixable issues remain after `--fix`. Non-zero exit indicates issues exist that require human attention.

## Files to touch

- `src/doctor.ts` — new file: diagnostic engine with pluggable checkers (`statusAlignmentChecker`, `changelogGapChecker`, `pairedViewDriftChecker`, `stalePlanChecker`, `releaseReadmeChecker`), each producing a `Diagnosis` with `severity` (info/warn/error), `fixable` (boolean), and `repair()` function. The `runDiagnostics()` function returns all diagnoses; `applyFixes()` runs repairs for all fixable issues. Dry-run mode calls `describeFix()` instead of `repair()`.
- `src/cli.ts` — update `doctor` command to accept `--fix`, `--dry-run`, `--severity <level>` (only report issues at or above this severity), and `--check <name>` (run only a named checker). Update help text to describe auto-fix capability. Wire the exit-code contract: 0 = clean or all fixable issues repaired, 1 = unfixable issues remain.
- `tests/doctor.test.ts` — test cases: diagnostic-only output format, `--fix` repairs misaligned plan status (file in active/ with `## Status: backlog` → updated to `## Status: active`), `--fix --dry-run` prints planned changes without mutating, changelog backfill (amendment file exists but no MISSION.md entry → entry appended to `## Changelog`), paired-view drift correction (CLAUDE.md has a section missing from AGENTS.md → section added), stale plan movement (plan in active/ with no commits touching it in >30 days → moved to blocked/ with annotation amendment), graceful handling of edge cases (corrupt markdown, missing files, permission errors), exit code contract (0 when clean or all fixable issues repaired, 1 when unfixable issues remain).
- `tests/fixtures/` — create deliberately broken scaffold states: `broken-status-alignment/` (plan in active/ with `## Status: backlog`), `broken-changelog-gap/` (amendment file present but no MISSION.md changelog entry), `broken-paired-view/` (AGENTS.md missing a section that CLAUDE.md has), `broken-stale-active/` (plan in active/ last touched 45 days ago), `broken-multiple/` (all of the above combined).
- `docs/WORKFLOW.md` — mention `osc doctor --fix` as the recommended maintenance command, note that it's safe to run in CI, and document the dry-run workflow.

## Acceptance criteria

- [ ] `osc doctor` (no flags) reports issues with severity (info/warn/error) and fixability (fixable/unfixable), with a human-readable description of each issue and what `--fix` would do.
- [ ] `osc doctor --fix` repairs all fixable issues: plan `## Status` aligned to actual folder, changelog entries backfilled for amendment files, paired-view drift corrected, stale active plans moved to blocked/ with annotation, missing `.osc/releases/README.md` created.
- [ ] `osc doctor --fix --dry-run` prints every planned change with before/after file paths and the exact mutation that would occur, without touching any file on disk.
- [ ] Does NOT modify plan goals, acceptance criteria, constraints, or verification steps under any circumstances.
- [ ] Does NOT edit MISSION.md sections other than `## Changelog`.
- [ ] Exit code 0 when no unfixable issues remain after `--fix`; exit code 1 when unfixable issues remain (with a summary of what needs human attention).
- [ ] Reports what it CANNOT fix and why: ambiguous plan status (plan in done/ but content suggests in-progress), paired-view content conflicts (same section in both files but content differs meaningfully), and permission errors.
- [ ] `osc doctor --check stale-plan` runs only the stale-plan checker, skipping all other diagnostics.
- [ ] `osc doctor --severity error` reports only error-severity issues, suppressing info and warn.
- [ ] Works in CI: no interactive prompts, clear exit codes, dry-run output is parseable.

## Verification steps

1. Create a deliberately broken state: create a plan file `broken-plan.md` in `.osc/plans/active/` with `## Status: backlog`. Create an amendment file `.osc/plans/active/050-npm-publish-amendment-1.md` but ensure MISSION.md's `## Changelog` has no entry for it. Delete a section from AGENTS.md that exists in CLAUDE.md. Create a plan in `active/` with mtime >45 days ago.
2. Run `osc doctor --fix --dry-run`. Verify output lists exactly the expected repairs: "would update broken-plan.md ## Status from 'backlog' to 'active'", "would add changelog entry for amendment 050-npm-publish-amendment-1", "would restore missing section to AGENTS.md", "would move stale-plan.md to blocked/". Verify no files were actually changed (check mtimes).
3. Run `osc doctor --fix`. Verify all fixable issues are repaired: broken-plan.md now says `## Status: active`, MISSION.md's changelog has the backfilled entry, AGENTS.md has the restored section, stale plan moved to blocked/.
4. Run `osc doctor` again. Expected: exit code 0, output reports "no issues found" or equivalent clean-state message.
5. Run `./verify.sh --strict` after repairs. Verify the scaffold passes all compliance checks.
6. Create an unfixable issue: a plan in `done/` with ambiguous content (says "almost done, pending review" in the goal). Run `osc doctor --fix`. Verify the issue is reported as "unfixable" with explanation, and exit code is 1.
7. Run `osc doctor --check stale-plan`. Verify only stale-plan diagnostics appear in output.
8. Run `osc doctor --help`. Verify `--fix`, `--dry-run`, `--severity`, and `--check` flags are documented.

## Open questions

- Should `osc doctor --fix` create a backup of modified files before repairing (e.g., `.osc/doctor-backups/`)? Git already provides rollback for committed files, but uncommitted plan drafts could be lost. A `--backup` flag that saves pre-repair copies to `.osc/doctor-backups/` would add safety without being default behavior. Start without backups; add if user feedback demands it.
- Should stale-plan detection use file mtime, git log, or both? File mtime works on any filesystem but is unreliable (touched by `git checkout`, backup tools, etc.). Git log (`git log --follow --format=%ci <file>`) is more accurate but requires git. Use git log when available, fall back to mtime with a warning.
- What threshold defines "stale"? 30 days is the default, but teams on different cadences may want 14 days or 90 days. Make stale threshold configurable via `.osc/config.json` with key `doctor.staleThresholdDays`, defaulting to 30.
- Should `osc doctor --fix` be run automatically by `osc verify` or `osc status`? No — auto-fix should always require explicit intent. But `osc verify` could suggest running `osc doctor --fix` when it detects fixable issues.
- Should doctor auto-fix be able to split a paired view section that has drifted in content (not just in presence/absence)? Content-level drift (same section heading in both files but different body text) indicates a real divergence that needs human judgment. Doctor should report it as unfixable and suggest a manual review, not attempt to merge the differing content.
