# Plan: 057-automated-evidence-collection

## Status

done


## Context

`osc evidence new <slug>` creates a TODO skeleton that users must fill manually: verification command output, git branch, PR links, CI status, changed files, and outcomes. This manual step is friction — after running `./verify.sh`, checking CI, and opening a PR, the user has to copy-paste results back into the evidence note. Automated collection reads these facts from the local environment (git, shell commands, and optionally the GitHub CLI) and populates the evidence skeleton, turning evidence creation from a form-filling exercise into a single command that captures the current state. This is the evidence equivalent of `osc plan wizard` (plan 052) — it makes a structured artifact feel responsive rather than burdensome.

## Goal

Add `osc evidence collect <slug>` that automatically gathers verification output (`./verify.sh`), git context (branch, recent commits, changed files), PR and CI status (via `gh` CLI when available), and populates the evidence note skeleton with collected data, preserving any existing content.

## Constraints / Out of scope

- Collects local, non-network evidence only by default: file stats, git log, shell command output. No outbound API calls unless the user explicitly opts in.
- `--ci` flag enables CI environment variable checking (`GITHUB_ACTIONS`, `GITHUB_RUN_ID`, etc.) and `gh pr checks` calls. Without `--ci`, these checks are skipped.
- Does NOT judge evidence quality or approve the slice — it gathers facts, not opinions. The evidence note still requires human review.
- Must handle missing data gracefully: if `gh` CLI is not installed, skip PR/CI checks and note "gh CLI not available" in the collected output rather than erroring.
- Must NOT overwrite existing evidence content that the user has manually filled in. New collection appends a timestamped block below existing content, preserving the user's narrative.
- Does NOT upload evidence anywhere — the evidence note stays in `.osc/evidence/` as a local markdown file.

## Files to touch

- `src/evidence.ts` — new file: collection engine with pluggable collectors (`verifyOutputCollector`, `gitContextCollector`, `changedFilesCollector`, `prStatusCollector`, `ciStatusCollector`), evidence note reader/writer with append-preserving merge logic, and `--dry-run` mode.
- `src/cli.ts` — wire `collect` subcommand under `osc evidence` with `--ci`, `--dry-run`, and `--verbose` flags. Update help text.
- `tests/evidence.test.ts` — test cases: full collection on a repo with git and verify.sh, collection without gh CLI (graceful degradation), dry-run output format, append-preserving merge (existing content survives), empty repo (no git history — graceful skip), verify.sh failure capture (non-zero exit still captured).
- `tests/fixtures/` — create test evidence note files: `evidence-empty.md` (skeleton), `evidence-partial.md` (some sections filled), `evidence-complete.md` (all sections filled).
- `docs/WORKFLOW.md` — mention `osc evidence collect` as the recommended workflow after `./verify.sh` and before slice close.

## Acceptance criteria

- [ ] `osc evidence collect my-feature` runs `./verify.sh --standard` and captures its stdout and exit code in the evidence note.
- [ ] Detects current git branch (via `git branch --show-current`) and includes it in the evidence note.
- [ ] Lists changed files from `git diff --name-status HEAD~1..HEAD` (or `git diff --cached` if no commits) and includes them.
- [ ] Checks for open PRs via `gh pr list --head <branch>` when available; captures PR number, title, and URL if found.
- [ ] Checks CI status via `gh pr checks` when `--ci` flag is set; captures check names and conclusions (success/failure/pending).
- [ ] Populates the evidence note skeleton with collected data as a new timestamped block (e.g., `### Collected 2026-05-18T14:30:00Z`), preserving any existing content above it.
- [ ] Reports what it could NOT collect (e.g., "gh CLI not available — PR and CI checks skipped", "no git repository detected — git context skipped") in the evidence note.
- [ ] `--dry-run` prints what would be collected to stdout without writing the evidence file.
- [ ] Works without `gh` CLI installed (skips PR/CI data gracefully, includes note about missing tool).
- [ ] Works in a non-git directory (skips git context gracefully).

## Verification steps

1. In a repo with a plan, git history, and `verify.sh`: run `osc evidence collect my-feature`. Verify the evidence note at `.osc/evidence/my-feature.md` contains a new timestamped block with verify.sh output, branch name, and changed files.
2. Open the evidence note and confirm any pre-existing content (above the new block) is preserved unchanged.
3. Run `osc evidence collect my-feature --dry-run`. Verify stdout shows the collected data block but `.osc/evidence/my-feature.md` is unchanged (mtime same as before).
4. In an environment without `gh` CLI: run `osc evidence collect my-feature`. Verify the evidence note includes "gh CLI not available — PR and CI checks skipped" and continues without error.
5. In a non-git directory: run `osc evidence collect my-feature`. Verify the evidence note includes "no git repository detected — git context skipped" and continues with only verify.sh output.
6. Run `osc evidence collect my-feature --ci` in a repo with an open PR and GitHub Actions running. Verify the evidence note includes PR number, URL, and CI check names with conclusions.
7. Run `osc evidence collect nonexistent-plan`. Expected: non-zero exit, "plan not found" or "evidence note skeleton not found — run `osc evidence new <slug>` first" message.

## Open questions

- Should `osc evidence collect` also capture environment context (OS, Node version, shell) for reproducibility? Including `uname -a` and `node --version` output would help debug environment-specific issues but could leak private machine details. Make it opt-in with `--env` flag.
- Should collected evidence include a diff of the changed files, or just the file list? Full diffs could be large and clutter the evidence note. File list with `git diff --stat` is a good middle ground; full diffs can be requested with `--full-diff`.
- Should `osc evidence collect` be run automatically by `osc close <slug>` before closing the slice? Yes — `osc close` should offer to run `osc evidence collect` if the evidence note is a skeleton (unfilled), then proceed with close. This integrates 057 with the existing close workflow.
- Should evidence collection support custom collector plugins (e.g., a `custom-collector.sh` that the user drops in `.osc/evidence/collectors/`)? Plugin architecture is future work; the 5 built-in collectors cover the most common evidence needs.
