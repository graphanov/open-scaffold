"""Zero-dependency Python reference parser for Open Scaffold plan state.

This module intentionally mirrors the small read-only subset of the TypeScript
`src/scaffold.ts` helpers that downstream Python tools most often need:
section extraction, plan list/status inspection, and quick scaffold readiness.
It uses only the Python 3.10+ standard library and is safe to vendor as a
single file.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

OSC_NAMESPACE = ".osc"
PLAN_STAGES = ("active", "backlog", "blocked", "done")
PLAN_LIST_KEYS = (*PLAN_STAGES, "root")
SUPPORT_PLAN_FILES = {"README.md", "WORKFLOW.md", "handoff-template.md"}
AMENDMENT_RE = re.compile(r"-amendment-\d+\.md$")


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _normalize_heading(raw: str) -> str:
    heading = raw.strip()
    heading = re.sub(r"[ \t]+#+[ \t]*$", "", heading).strip()
    return re.sub(r"\s+", " ", heading)


def _fence_open(line: str) -> tuple[str, int] | None:
    # Deliberately track only column-0 fenced code blocks, matching the
    # TypeScript dependency-free parser in src/scaffold.ts.
    match = re.match(r"^(`{3,}|~{3,})", line)
    if not match:
        return None
    marker_run = match.group(1)
    return marker_run[0], len(marker_run)


def _fence_close(line: str, fence: tuple[str, int]) -> bool:
    marker, count = fence
    match = re.match(r"^(`{3,}|~{3,})[ \t]*$", line)
    if not match:
        return False
    marker_run = match.group(1)
    return marker_run[0] == marker and len(marker_run) >= count


def _section_heading(line: str) -> str | None:
    match = re.match(r"^##[ \t]+(.+)$", line)
    if not match:
        return None
    heading = _normalize_heading(match.group(1))
    return heading or None


def split_sections(markdown: str) -> dict[str, str]:
    """Split markdown into canonical `## Heading` sections.

    Mirrors the dependency-free TypeScript parser: front-anchored H2 only,
    optional trailing ATX closing hashes, CRLF-tolerant, and fenced headings
    ignored while preserving fenced content in the current section body.
    """
    sections: dict[str, str] = {}
    current: str | None = None
    buffer: list[str] = []
    fence: tuple[str, int] | None = None

    def flush() -> None:
        nonlocal buffer
        if current:
            sections[current] = "\n".join(buffer).strip()
        buffer = []

    for raw_line in re.split(r"\r?\n", markdown):
        line = raw_line.rstrip("\r")
        if fence:
            if current:
                buffer.append(line)
            if _fence_close(line, fence):
                fence = None
            continue

        opening_fence = _fence_open(line)
        if opening_fence:
            if current:
                buffer.append(line)
            fence = opening_fence
            continue

        heading = _section_heading(line)
        if heading:
            flush()
            current = heading
        elif current:
            buffer.append(line)
    flush()
    return sections


def _first_paragraph(text: str) -> str:
    for paragraph in re.split(r"\n\s*\n", text):
        stripped = paragraph.strip()
        if stripped:
            return stripped
    return ""


def _bullet_items(text: str) -> list[str]:
    items: list[str] = []
    for raw_line in re.split(r"\r?\n", text):
        line = raw_line.strip()
        if not re.match(r"^[-*]\s+", line):
            continue
        item = re.sub(r"^[-*]\s+", "", line)
        item = re.sub(r"^\[[ xX]\]\s*", "", item).strip()
        if item:
            items.append(item)
    return items


def _numbered_items(text: str) -> list[str]:
    items: list[str] = []
    for raw_line in re.split(r"\r?\n", text):
        line = raw_line.strip()
        if not re.match(r"^\d+\.\s+", line):
            continue
        item = re.sub(r"^\d+\.\s+", "", line).strip()
        if item:
            items.append(item)
    return items


def _parse_execution_strategy(text: str) -> dict[str, Any] | None:
    if not text.strip():
        return None

    groups: list[dict[str, Any]] = []
    dependencies: list[str] = []
    delegation_notes: list[str] = []
    subsection = ""

    for line in re.split(r"\r?\n", text):
        sub = re.match(r"^###\s+(.+)$", line)
        if sub:
            subsection = _normalize_heading(sub.group(1)).lower()
            continue
        trimmed = line.strip()
        if not trimmed:
            continue
        if subsection == "parallel groups" and trimmed.startswith("- **Group"):
            match = re.match(r"^- \*\*(.+?)\*\*\s*(?:\((.*?)\))?:\s*(.+)$", trimmed)
            if match:
                groups.append(
                    {
                        "name": match.group(1).strip(),
                        "rationale": (match.group(2) or "").strip(),
                        "tasks": match.group(3).strip(),
                        "depends_on_previous": bool(re.search(r"depends on", trimmed, re.IGNORECASE)),
                    }
                )
        elif subsection == "dependencies" and re.match(r"^[-*]\s+", trimmed):
            dependencies.append(re.sub(r"^[-*]\s+", "", trimmed).strip())
        elif subsection == "delegation notes" and re.match(r"^[-*]\s+", trimmed):
            delegation_notes.append(re.sub(r"^[-*]\s+", "", trimmed).strip())

    return {"groups": groups, "dependencies": dependencies, "delegation_notes": delegation_notes}


def _folder_status(path: Path) -> str | None:
    parent = path.parent
    if parent.name in PLAN_STAGES:
        return parent.name
    if parent.name == "plans" and parent.parent.name == OSC_NAMESPACE:
        return "root"
    return None


def parse_plan(path: str) -> dict[str, Any]:
    """Parse a Markdown plan file into a Python-friendly JSON-serializable dict."""
    plan_path = Path(path).expanduser().resolve()
    text = _read_text(plan_path)
    sections = split_sections(text)
    declared_status = _first_paragraph(sections.get("Status", ""))
    folder_status = _folder_status(plan_path)
    execution_strategy = _parse_execution_strategy(sections.get("Execution strategy", ""))

    return {
        "path": str(plan_path),
        "slug": plan_path.stem,
        "status": declared_status,
        "declared_status": declared_status,
        "folder_status": folder_status,
        "status_mismatch": bool(folder_status and declared_status and folder_status != declared_status),
        "goal": _first_paragraph(sections.get("Goal", "")),
        "sections": sections,
        "files_to_touch": _bullet_items(sections.get("Files to touch", "")),
        "acceptance_criteria": _bullet_items(sections.get("Acceptance criteria", "")),
        "verification_steps": _numbered_items(sections.get("Verification steps", "")),
        "open_questions": _bullet_items(sections.get("Open questions", "")),
        "execution_strategy": execution_strategy,
    }


def _is_plan_file(path: Path) -> bool:
    return (
        path.suffix == ".md"
        and path.name not in SUPPORT_PLAN_FILES
        and not AMENDMENT_RE.search(path.name)
        and path.is_file()
    )


def find_scaffold_root(start: str = ".") -> str | None:
    """Return the nearest ancestor with `.osc/plans` and `.osc/releases`."""
    current = Path(start).expanduser().resolve()
    if current.is_file():
        current = current.parent
    while True:
        if (current / OSC_NAMESPACE / "plans").exists() and (current / OSC_NAMESPACE / "releases").exists():
            return str(current)
        parent = current.parent
        if parent == current:
            return None
        current = parent


def inspect_mission(root: str) -> dict[str, Any]:
    path = Path(root) / "MISSION.md"
    if not path.exists():
        return {"path": str(path), "defined": False, "reason": "MISSION.md not found"}
    text = _read_text(path)
    if "mission:unset" in text or "TODO: define mission" in text:
        return {"path": str(path), "defined": False, "reason": "mission unset marker present"}
    return {"path": str(path), "defined": True}


def _relative(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def _plan_summary(root: Path, path: Path, folder_status: str) -> dict[str, Any]:
    parsed = parse_plan(str(path))
    declared_status = parsed["status"]
    return {
        "slug": path.stem,
        "path": _relative(root, path),
        "stage": folder_status,
        "folder_status": folder_status,
        "declared_status": declared_status,
        "status_mismatch": bool(declared_status and folder_status != declared_status),
    }


def inspect_scaffold(root: str = ".") -> dict[str, Any]:
    """Inspect Open Scaffold mission and plan lists from Python.

    Plan amendments are intentionally ignored in plan listings because they move
    with their parent plan and should not become independent work items.
    Root-level `.osc/plans/*.md` files are reported under the pseudo-stage
    `root` so callers can surface or migrate them explicitly.
    """
    found = find_scaffold_root(root)
    scaffold_root = Path(found if found else root).expanduser().resolve()

    plans: dict[str, list[dict[str, Any]]] = {key: [] for key in PLAN_LIST_KEYS}
    plans_root = scaffold_root / OSC_NAMESPACE / "plans"

    for stage in PLAN_STAGES:
        stage_dir = plans_root / stage
        if not stage_dir.exists():
            continue
        for path in sorted(stage_dir.iterdir(), key=lambda item: item.name):
            if _is_plan_file(path):
                plans[stage].append(_plan_summary(scaffold_root, path, stage))

    if plans_root.exists():
        for path in sorted(plans_root.iterdir(), key=lambda item: item.name):
            if _is_plan_file(path):
                plans["root"].append(_plan_summary(scaffold_root, path, "root"))

    return {
        "root": str(scaffold_root),
        "namespace": OSC_NAMESPACE,
        "mission": inspect_mission(str(scaffold_root)),
        "plans": plans,
    }


def verify_scaffold(root: str = ".") -> dict[str, Any]:
    """Run the Python quick verifier: mission defined + at least one plan."""
    state = inspect_scaffold(root)
    failures: list[dict[str, Any]] = []
    mission = state["mission"]
    if not mission["defined"]:
        failures.append(
            {
                "level": "fail",
                "code": "mission.undefined",
                "message": mission.get("reason", "MISSION.md is not defined"),
                "path": "MISSION.md",
            }
        )
    plan_count = sum(len(items) for items in state["plans"].values())
    stage_plan_count = sum(len(state["plans"][stage]) for stage in PLAN_STAGES)
    if stage_plan_count == 0:
        failures.append(
            {
                "level": "fail",
                "code": "plans.missing",
                "message": "No plan files found under .osc/plans/{active,backlog,blocked,done}/",
            }
        )
    return {
        "ok": not failures,
        "failures": failures,
        "warnings": [],
        "plan_count": plan_count,
        "stage_plan_count": stage_plan_count,
        "state": state,
    }
