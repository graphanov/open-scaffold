# Plan: 051-brownfield-init-from-existing

## Status

backlog — blocked on 050 (npm publish) for baseline `osc init` availability. This extends the greenfield-only `osc init` to support existing project directories, which is the majority real-world adoption path. No work begins until `osc init --tier min` is stable and published.

## Context

`osc init` in its shipped form assumes greenfield: it creates a fresh scaffold in an empty or scaffold-absent directory, generating `MISSION.md`, `.osc/plans/`, `AGENTS.md`, `CLAUDE.md`, and shell scripts from scratch. Most real projects already exist — they have `package.json`, source trees in `src/` or `lib/`, existing `README.md`, CI configs, and established conventions. Users should not have to restructure their entire project to adopt Open Scaffold. The `--from-existing` flag bridges this gap by detecting the existing project structure and placing Open Scaffold protocol files alongside it without disruption. This plan was prompted by early adopter feedback that "start from scratch" is a non-starter for projects with history.

## Goal

Add `osc init --from-existing` that detects an existing project's language, package manager, and structure, then scaffolds the Open Scaffold protocol (`.osc/`, `MISSION.md`, `AGENTS.md`, `CLAUDE.md`, shell scripts) alongside existing files without overwriting or moving anything.

## Constraints / Out of scope

- Must NOT overwrite existing files unless `--force` is explicitly passed. If `MISSION.md`, `.osc/`, `AGENTS.md`, or `CLAUDE.md` already exist, refuse with a clear message listing each conflict.
- Must NOT move or rename existing project files. The scaffold is additive only.
- Detection covers common project types (Node.js via `package.json`, Python via `pyproject.toml` or `setup.py`, Go via `go.mod`, Rust via `Cargo.toml`, monorepo via workspace config) and falls back to a generic scaffold for unrecognized structures.
- Does NOT auto-detect existing task systems (Jira, Linear, GitHub Issues) or CI pipelines — those remain manual integrations.
- Does NOT modify the user's existing `package.json`, build scripts, or lockfiles.
- Does NOT generate a full `MISSION.md` from project analysis — it writes a reasonable first draft with the detected project type and a `<!-- mission:unset -->` marker so the user fills in specifics.

## Files to touch

- `src/init.ts` — add `--from-existing` flag parsing, detection logic (`detectProjectType()`, `detectPackageManager()`), conflict check (`checkExistingConflicts()`), and template selection based on detected type.
- `src/cli.ts` — wire `--from-existing` and `--force` flags into the `init` subcommand. Update help text to describe brownfield behavior.
- `docs/MINIMUM_VIABLE_SCAFFOLD.md` — add a "Brownfield adoption" section explaining the flag, detection capabilities, and what users should expect.
- `tests/init.test.ts` — add test cases for Node.js project fixture, Python project fixture, empty directory (greenfield fallback), conflict detection, `--force` override, and monorepo detection.
- Test fixtures: create `tests/fixtures/brownfield-node/` (with `package.json`, `src/index.js`), `tests/fixtures/brownfield-python/` (with `pyproject.toml`, `src/__init__.py`), `tests/fixtures/brownfield-empty/` (empty dir).

## Acceptance criteria

- [ ] `osc init --from-existing --tier min` in a directory containing `package.json` creates `.osc/`, `MISSION.md`, `AGENTS.md`, `CLAUDE.md`, and shell scripts alongside the existing `package.json`.
- [ ] Existing files (`package.json`, `src/`, `README.md`) are untouched — verified by `git diff` showing zero changes to pre-existing content.
- [ ] Generated `MISSION.md` contains a reasonable first draft mentioning "Node.js" (or detected language) and the `<!-- mission:unset -->` marker.
- [ ] Works for directories with no package manager files (generic scaffold, no language-specific snippet).
- [ ] Refuses to overwrite existing `MISSION.md` or `.osc/` without `--force`; error message lists each conflicting path.
- [ ] `--force` flag overwrites existing scaffold files but still leaves user project files untouched.
- [ ] `./verify.sh --quick --quiet` exits 0 after init in each test fixture.
- [ ] Detects and tailors scaffold for Node.js, Python, Go, and Rust projects (at minimum).

## Verification steps

1. Create test fixture: `mkdir -p /tmp/brownfield-node && cd /tmp/brownfield-node && echo '{"name":"test"}' > package.json && mkdir src && echo 'console.log("hi")' > src/index.js`.
2. Run `osc init --from-existing --tier min` in `/tmp/brownfield-node`. Verify `package.json` and `src/index.js` are untouched (md5sum unchanged). Verify `.osc/`, `MISSION.md`, `AGENTS.md`, `CLAUDE.md`, `verify.sh` exist.
3. Run `./verify.sh --quick --quiet` — expected exit 0.
4. Run `osc init --from-existing --tier min` a second time (no `--force`). Expected: error message listing `MISSION.md` and `.osc/` as conflicts, exit code non-zero.
5. Run `osc init --from-existing --tier min --force`. Expected: succeeds, overwrites scaffold files, user files untouched.
6. Create Python fixture (`pyproject.toml`), Go fixture (`go.mod`), Rust fixture (`Cargo.toml`), and empty dir. Repeat init in each. Verify detection and tailored `MISSION.md` snippets.

## Open questions

- Should `--from-existing` become the default behavior when `osc init` detects existing project files, or remain an explicit opt-in flag? Opt-in is safer for v1 to avoid surprise scaffold placement.
- How deeply should detection go — read `package.json` scripts for test/lint/build commands and suggest them in the generated scaffold? That crosses into CI config generation, which is out of scope for this slice.
- Should `osc init --from-existing` also generate a `ROADMAP.md` with a first item derived from the existing project's git history or README? No — roadmap generation is a separate feature requiring semantic understanding.
- What happens when a directory has multiple package manager files (e.g., both `package.json` and `pyproject.toml`)? The detector should pick the primary one based on a priority heuristic (Node.js first, then Python, then Go, then Rust) and note the others in a comment.
