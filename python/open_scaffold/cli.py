from __future__ import annotations

import json
import sys
from pathlib import Path

from .parser import PLAN_LIST_KEYS, PLAN_STAGES, inspect_scaffold, parse_plan, verify_scaffold


def _usage(stream=sys.stderr) -> None:
    print("Usage: python -m open_scaffold status|plan <path>|verify", file=stream)


def _status() -> int:
    state = inspect_scaffold(".")
    print("Open Scaffold status")
    print(f"Namespace: {state['namespace']}")
    mission = state["mission"]
    if mission["defined"]:
        print("Mission: defined")
    else:
        print(f"Mission: not defined ({mission.get('reason')})")
    for stage in PLAN_STAGES:
        plans = state["plans"][stage]
        print(f"{stage}: {len(plans)}")
        for plan in plans:
            print(f"  - {plan['slug']}")
    root_plans = state["plans"].get("root", [])
    if root_plans:
        print(f"root: {len(root_plans)}")
        for plan in root_plans:
            print(f"  - {plan['slug']}")
    return 0


def _plan(args: list[str]) -> int:
    if not args:
        _usage()
        return 2
    print(json.dumps(parse_plan(args[0]), indent=2, ensure_ascii=False))
    return 0


def _verify() -> int:
    result = verify_scaffold(".")
    for failure in result["failures"]:
        suffix = f" ({failure['path']})" if failure.get("path") else ""
        print(f"FAIL {failure['code']}: {failure['message']}{suffix}", file=sys.stderr)
    if not result["ok"]:
        return 1
    print(f"PASS mission defined and {result['plan_count']} plan file(s) found; {len(result['warnings'])} warning(s)")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    command = args[0] if args else None
    rest = args[1:]
    if command in {None, "-h", "--help", "help"}:
        _usage(sys.stdout if command in {"-h", "--help", "help"} else sys.stderr)
        return 0 if command else 2
    if command == "status":
        return _status()
    if command == "plan":
        return _plan(rest)
    if command == "verify":
        if rest:
            print(f"Unknown option for verify: {rest[0]}", file=sys.stderr)
            _usage()
            return 2
        return _verify()
    print(f"Unknown command: {command}", file=sys.stderr)
    _usage()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
