"""Python reference parser for Open Scaffold."""

from .parser import find_scaffold_root, inspect_mission, inspect_scaffold, parse_plan, split_sections, verify_scaffold

__version__ = "0.4.18"

__all__ = [
    "__version__",
    "find_scaffold_root",
    "inspect_mission",
    "inspect_scaffold",
    "parse_plan",
    "split_sections",
    "verify_scaffold",
]
