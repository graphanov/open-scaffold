# Plan: bug-fix

## Status

backlog

## Context

REPLACE_ME: A user reports that `<affected command or user flow>` fails after a recent change. Example: `osc plan validate` exits successfully even when a plan has no acceptance criteria.

## Goal

REPLACE_ME: Reproduce the bug, fix the root cause, and add a regression check that fails without the fix.

## Constraints / Out of scope

- Do not broaden behavior outside the failing path.
- Do not rewrite unrelated modules while fixing the bug.
- Preserve existing documented behavior unless the regression proves it is wrong.

## Files to touch

- `<source file>` — root-cause fix.
- `<test file>` — regression test covering expected vs actual behavior.

## Acceptance criteria

- [ ] Reproduction fails before the fix and passes after the fix.
- [ ] Expected vs actual behavior is documented in the test name or assertion.
- [ ] Existing related tests still pass.
- [ ] The fix is the smallest change that addresses the root cause.

## Verification steps

1. Run the targeted regression test.
2. Run the related test file or package test command.
3. Run the project verification gate.

## Open questions

- None.
