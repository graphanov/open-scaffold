# Open Scaffold Python reference parser

This directory contains a zero-dependency Python 3.10+ reference parser for Open Scaffold plan files and scaffold state. It is read-only: it parses plans, lists stage folders, checks mission/plan presence, and exposes a tiny CLI for Python-based tools.

## Vendoring-first usage

Copy the parser into a Python project and use it without installing anything:

```python
from parser import parse_plan
plan = parse_plan(".osc/plans/active/001-first-slice.md")
print(plan["acceptance_criteria"])
```

If you keep the package layout instead of a single vendored file:

```python
from open_scaffold import inspect_scaffold, parse_plan
state = inspect_scaffold(".")
plan = parse_plan(".osc/plans/active/001-first-slice.md")
```

## Optional pip install

From a checkout of this repository:

```bash
cd python
python -m pip install .
open-scaffold-parser status
```

This package intentionally has no runtime dependencies beyond the Python standard library. The parser implementation lives in `open_scaffold/parser.py` so it can be copied directly into air-gapped or dependency-sensitive projects.

## CLI

```bash
PYTHONPATH=python python -m open_scaffold status
PYTHONPATH=python python -m open_scaffold plan .osc/plans/done/050-npm-publish-and-npx-init.md
PYTHONPATH=python python -m open_scaffold verify
```

Commands:

- `status` prints mission state and plan counts by stage.
- `plan <path>` prints parsed plan JSON.
- `verify` runs the quick Python readiness check: mission defined and at least one plan file exists.

## Python output shape

`parse_plan(path)` returns a JSON-serializable dictionary with:

- `slug`, `path`, `status`, `declared_status`, `folder_status`, `status_mismatch`
- `goal`
- `sections`
- `files_to_touch`
- `acceptance_criteria`
- `verification_steps`
- `open_questions`
- `execution_strategy`

`inspect_scaffold(root=".")` returns:

- `root`
- `namespace`
- `mission`
- `plans` grouped by `active`, `backlog`, `blocked`, `done`, and `root`

Plan amendments such as `001-slice-amendment-1.md` are ignored in plan listings because amendments move with the parent plan and should not become independent work items.

## TypeScript parity table

| TypeScript | Python | Notes |
|---|---|---|
| `splitSections(markdown)` | `split_sections(markdown)` | Same `## Heading` section extraction and whitespace normalization. |
| `parsePlanFile(path)` | `parse_plan(path)` | Same core semantics; Python returns snake_case keys and adds declared/folder status mismatch fields. |
| `inspectMission(root)` | `inspect_mission(root)` | Same mission-defined check for `mission:unset` and `TODO: define mission`. |
| `findScaffoldRoot(start)` | `find_scaffold_root(start)` | Same ancestor search for `.osc/plans` and `.osc/releases`. |
| `inspectScaffold(root)` | `inspect_scaffold(root)` | Same stage-folder inspection; Python also reports root-level plan files and skips amendment files. |
| `osc verify` quick readiness | `python -m open_scaffold verify` | Python implements the read-only mission/plan-presence quick check, not the full strict verifier. |

## Verification

```bash
python -m unittest discover -s python/tests
PYTHONPATH=python python -m open_scaffold verify
```
