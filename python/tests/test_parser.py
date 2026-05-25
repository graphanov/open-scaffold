import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

# Test the source tree package without requiring installation.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from open_scaffold.parser import inspect_scaffold, parse_plan


SAMPLE_PLAN = """# Plan: sample

## Status

active

## Context

Need a thing.

## Goal

Ship a thing.

## Constraints / Out of scope

- No spawning agents.

## Files to touch

- `src/index.ts` — CLI entrypoint

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Parse plans | None | A |
| T2 | Generate prompts | T1 | B |

### Parallel groups

- **Group A** (foundation): T1 — parse first
- **Group B** (depends on Group A): T2 — generate after parse

### Dependencies

- T2 depends on T1.

### Delegation notes

- Use separate sessions only after T1 completes.

## Acceptance criteria

- [ ] Parser extracts sections.
- [ ] Delegation prompts are generated.

## Verification steps

1. Run `npm test`.
2. Expected: pass.

## Open questions

- None.
"""


def make_repo() -> Path:
    root = Path(tempfile.mkdtemp(prefix="osc-py-test-"))
    for stage in ["active", "backlog", "blocked", "done"]:
        (root / ".osc" / "plans" / stage).mkdir(parents=True, exist_ok=True)
    (root / ".osc" / "releases").mkdir(parents=True, exist_ok=True)
    (root / "MISSION.md").write_text("# Mission\n\nBuild the thing.\n", encoding="utf-8")
    return root


class ParserTests(unittest.TestCase):
    def test_parse_plan_sections_lists_and_execution_strategy(self):
        root = make_repo()
        path = root / ".osc" / "plans" / "active" / "001-sample.md"
        path.write_text(SAMPLE_PLAN, encoding="utf-8")

        parsed = parse_plan(str(path))

        self.assertEqual(parsed["slug"], "001-sample")
        self.assertEqual(parsed["status"], "active")
        self.assertEqual(parsed["goal"], "Ship a thing.")
        self.assertEqual(parsed["files_to_touch"], ["`src/index.ts` — CLI entrypoint"])
        self.assertEqual(parsed["acceptance_criteria"], ["Parser extracts sections.", "Delegation prompts are generated."])
        self.assertEqual(parsed["verification_steps"], ["Run `npm test`.", "Expected: pass."])
        self.assertEqual(parsed["open_questions"], ["None."])
        self.assertEqual([group["name"] for group in parsed["execution_strategy"]["groups"]], ["Group A", "Group B"])
        self.assertTrue(parsed["execution_strategy"]["groups"][1]["depends_on_previous"])

    def test_inspect_scaffold_ignores_amendments_and_reports_root_and_status_mismatch(self):
        root = make_repo()
        (root / ".osc" / "plans" / "active" / "001-sample.md").write_text(SAMPLE_PLAN, encoding="utf-8")
        (root / ".osc" / "plans" / "active" / "001-sample-amendment-1.md").write_text("# Amendment\n", encoding="utf-8")
        (root / ".osc" / "plans" / "backlog" / "002-mismatch.md").write_text(
            SAMPLE_PLAN.replace("# Plan: sample", "# Plan: 002-mismatch").replace("active", "done", 1),
            encoding="utf-8",
        )
        (root / ".osc" / "plans" / "003-root.md").write_text(
            SAMPLE_PLAN.replace("# Plan: sample", "# Plan: 003-root").replace("active", "root", 1),
            encoding="utf-8",
        )

        state = inspect_scaffold(str(root))

        self.assertTrue(state["mission"]["defined"])
        self.assertEqual([plan["slug"] for plan in state["plans"]["active"]], ["001-sample"])
        self.assertEqual([plan["slug"] for plan in state["plans"]["root"]], ["003-root"])
        mismatch = state["plans"]["backlog"][0]
        self.assertEqual(mismatch["declared_status"], "done")
        self.assertEqual(mismatch["folder_status"], "backlog")
        self.assertTrue(mismatch["status_mismatch"])

    def test_empty_sections_return_empty_lists(self):
        root = make_repo()
        text = SAMPLE_PLAN.replace("- [ ] Parser extracts sections.\n- [ ] Delegation prompts are generated.\n", "")
        path = root / ".osc" / "plans" / "active" / "004-empty.md"
        path.write_text(text, encoding="utf-8")

        parsed = parse_plan(str(path))

        self.assertEqual(parsed["acceptance_criteria"], [])

    def test_verify_requires_stage_folder_plans_not_only_root_plans(self):
        root = make_repo()
        (root / ".osc" / "plans" / "005-root-only.md").write_text(
            SAMPLE_PLAN.replace("# Plan: sample", "# Plan: 005-root-only").replace("active", "root", 1),
            encoding="utf-8",
        )

        from open_scaffold.parser import verify_scaffold

        result = verify_scaffold(str(root))

        self.assertFalse(result["ok"])
        self.assertEqual(result["stage_plan_count"], 0)
        self.assertEqual(result["plan_count"], 1)
        self.assertEqual(result["failures"][0]["code"], "plans.missing")

    def test_python_cli_status_plan_and_verify(self):
        root = make_repo()
        plan_path = root / ".osc" / "plans" / "active" / "001-sample.md"
        plan_path.write_text(SAMPLE_PLAN, encoding="utf-8")
        env = {**os.environ, "PYTHONPATH": str(Path(__file__).resolve().parents[1])}

        status = subprocess.run(
            [sys.executable, "-m", "open_scaffold", "status"],
            cwd=root,
            env=env,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertIn("Open Scaffold status", status.stdout)
        self.assertIn("active: 1", status.stdout)

        plan = subprocess.run(
            [sys.executable, "-m", "open_scaffold", "plan", str(plan_path)],
            cwd=root,
            env=env,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertEqual(json.loads(plan.stdout)["slug"], "001-sample")

        verify = subprocess.run(
            [sys.executable, "-m", "open_scaffold", "verify"],
            cwd=root,
            env=env,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertIn("PASS mission defined and 1 plan file(s) found", verify.stdout)


if __name__ == "__main__":
    unittest.main()
