# Plan: refactor

## Status

backlog

## Context

REPLACE_ME: The current implementation of `<area>` works but makes `<change type>` risky because responsibilities are mixed or duplicated.

## Goal

REPLACE_ME: Restructure `<area>` without changing observable behavior so the next product slice is easier to implement and verify.

## Constraints / Out of scope

- Do not change public behavior, output formats, or documented commands.
- Do not combine refactor with a new feature.
- Keep before/after verification explicit.

## Files to touch

- `<source file>` — extraction or simplification target.
- `<test file>` — behavior lock tests if coverage is missing.

## Acceptance criteria

- [ ] Existing behavior remains unchanged.
- [ ] Tests lock the behavior before refactor if coverage was missing.
- [ ] New structure has clearer ownership or less duplication.
- [ ] No unrelated formatting churn is introduced.

## Verification steps

1. Run behavior lock tests before and after the refactor.
2. Run the affected test suite.
3. Run build and repository verification.

## Open questions

- None.
