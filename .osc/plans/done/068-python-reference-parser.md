# Plan: 068-python-reference-parser

## Status

done


## Context

Open Scaffold is currently TypeScript-only for programmatic access to plan state. The CLI (`osc`) and its underlying libraries (`src/scaffold.ts`, `src/validation.ts`) parse plans, validate schemas, and query scaffold state — but only from Node.js. Python-centric projects cannot programmatically read plans, validate acceptance criteria, or integrate scaffold state into Python tooling without shelling out to `osc --json`. A Python reference parser — a single-file, zero-dependency implementation — would make Open Scaffold queryable from Python scripts, CI pipelines, data science notebooks, and any Python-based AI agent.

## Goal

Ship a single-file Python reference parser (`open_scaffold/parser.py`) that reads plan files, extracts sections and acceptance criteria, and exposes scaffold state — matching the TypeScript implementation's semantics — with zero dependencies beyond Python 3.10+ stdlib.

## Constraints / Out of scope

- Single-file implementation: one `.py` file that can be vendored (copied into any project without `pip install`).
- Zero dependencies beyond Python 3.10+ standard library.
- Read-only in v1 — parses and exposes state, does not create, amend, or close plans.
- Must match the TypeScript parser's behavior for: section extraction, AC parsing, file-to-touch list, open question detection, status extraction, execution strategy parsing.
- Plan file format is Markdown with `## Heading` sections — no custom format, no YAML frontmatter requirement.
- Does NOT reimplement the full CLI. Does NOT implement verify.sh logic. Does NOT implement run packet generation. Parsing only.
- Must ship with a `pyproject.toml` so it can be optionally `pip install`-ed for projects that want it as a proper package.

## Files to touch

- `python/open_scaffold/__init__.py` — new: package init, version
- `python/open_scaffold/parser.py` — new: plan parser (section extraction, AC parsing, file list, status, execution strategy), scaffold inspector (find .osc root, list plans by stage, read mission)
- `python/open_scaffold/cli.py` — new: minimal CLI (`python -m open_scaffold status|plan <path>|verify`) for parity testing
- `python/pyproject.toml` — new: package metadata, optional `pip install` support
- `python/tests/test_parser.py` — new: tests using sample plan files matching TypeScript test fixtures
- `python/README.md` — new: usage guide, vendoring instructions, TypeScript parity table
- `docs/REFERENCE_TRUTH.md` — add Python parser to the tool references section

## Acceptance criteria

- [ ] `open_scaffold/parser.py` contains a `parse_plan(path: str) -> dict` function that returns: slug, status, goal, sections (dict of heading → content), files_to_touch (list), acceptance_criteria (list), verification_steps (list), open_questions (list), execution_strategy (optional dict with groups/dependencies/delegation_notes)
- [ ] `open_scaffold/parser.py` contains an `inspect_scaffold(root: str = ".") -> dict` function that returns: root, namespace, mission (defined, reason), plans (dict of stage → list of {slug, path})
- [ ] Output of `parse_plan()` matches the TypeScript `parsePlanFile()` output for the same plan file (verified by comparing JSON outputs)
- [ ] Output of `inspect_scaffold()` matches the TypeScript `inspectScaffold()` output for the same repo
- [ ] `python -m open_scaffold status` prints plan counts by stage (matching `osc status` text output shape)
- [ ] `python -m open_scaffold plan .osc/plans/backlog/050-npm-publish-and-npx-init.md` prints parsed plan as JSON
- [ ] `python -m open_scaffold verify` runs mission-defined and plan-presence checks (matching `osc verify --quick` semantics)
- [ ] The parser correctly handles: plans with amendments in the same folder (ignores amendment files when listing plans), plans in root `.osc/plans/` (not in a stage folder), plans with empty sections, plans with `## Status` mismatch (reports actual folder location vs declared status)
- [ ] All parser tests pass with `python -m pytest python/tests/` (or `python -m unittest` if no pytest dependency)
- [ ] `python/README.md` includes: 3-line vendoring example (copy parser.py, import, use), pip install instructions, parity table showing TypeScript function → Python function mapping
- [ ] `npm test` and `./verify.sh --standard` pass (Python files are additive, no impact on Node.js code)

## Verification steps

1. **Parse existing plans:** Run `python -m open_scaffold plan .osc/plans/backlog/050-npm-publish-and-npx-init.md`. Compare JSON output to `osc plan .osc/plans/backlog/050-npm-publish-and-npx-init.md` (TypeScript). Verify all fields match.
2. **Inspect scaffold:** Run `python -m open_scaffold status` in the open-scaffold repo. Compare output to `osc status`. Verify plan counts match.
3. **Verify:** Run `python -m open_scaffold verify`. Compare exit code to `osc verify --quick`. Verify both pass.
4. **Parse all plans:** Loop over all `.osc/plans/backlog/*.md` and `.osc/plans/done/*.md`, run the Python parser on each. Verify no crashes, all return valid dicts.
5. **Vendoring test:** Copy `parser.py` to `/tmp/test-vendor/`. Create a simple Python script that imports and parses a plan. Verify works with only stdlib.
6. **Edge cases:** Create a plan with empty AC section. Verify parser returns empty list, not error. Create a plan with `## Execution strategy` present. Verify execution_strategy dict is populated.

## Open questions

- Should the Python parser be a separate PyPI package (`pip install open-scaffold-parser`) or only vendorable? Vendoring-first: the single-file copy approach supports the widest range of use cases (air-gapped, no pip, embedded in larger projects). PyPI publication can follow as a convenience.
- Should the Python parser support plan creation/amendment in v1? No — read-only parsing is the 80/20 use case. Python-based plan mutation would require reimplementing amend.sh logic (autonumbering, changelog stamping), which is significantly more code.
- Should there be parity tests that run both TypeScript and Python parsers on the same plan files and diff the output? Yes — this is the gold standard for reference implementation correctness. Add a CI step or test script that generates JSON from both parsers and asserts structural equivalence.
