# Release / Evidence Note: 068-python-reference-parser

## Summary

Added a zero-dependency Python 3.10+ reference parser for Open Scaffold plan files and scaffold state. The slice adds the vendorable parser, a minimal `python -m open_scaffold` CLI, optional Python package metadata, tests, docs, and reference-truth wording that keeps the Python parser read-only and non-canonical.

## Traceability

- Roadmap / issue / task: backlog plan 068, selected source `backlog_plan`.
- Plan: `.osc/plans/done/068-python-reference-parser.md`
- Run ID / run packet: N/A — runner automation prepared the branch directly from the selected plan.
- Branch / PR: `feat/068-python-reference-parser`; Pull Request: https://github.com/graphanov/open-scaffold/pull/112

## Verification

- `python3 -m unittest discover -s python/tests` — pass, 5 parser/CLI tests.
- Python/TypeScript parity checks — `parse_plan()` matched `osc plan` for `.osc/plans/done/050-npm-publish-and-npx-init.md`; Python and TypeScript status counts matched after amendment files were excluded from plan listings.
- Acceptance smokes — `PYTHONPATH=python python3 -m open_scaffold verify`, stage-plan parse loop, vendored `parser.py` smoke, `npm test`, `npm run build`, `./verify.sh --standard`, `npm pack --dry-run --json`, and `git diff --check` passed.

## Outcome

Open Scaffold now has a Python read-only reference parser for projects, CI scripts, notebooks, and Python-based agents that need plan and scaffold state without shelling out to Node. The TypeScript scaffold inspector now treats amendment files as parent-plan attachments rather than independent plan items, keeping the Python and TypeScript status surfaces aligned. Runtime execution, plan mutation, PyPI publication, merge, npm publication, and GitHub Release movement remain out of scope.

## Follow-up

- Owner gate: review and merge the pull request.
- Release gate: include this package-visible change in the next batched npm/GitHub Release train; do not publish from this slice.
- Optional future gate: decide separately whether to publish `open-scaffold-parser` to PyPI.
