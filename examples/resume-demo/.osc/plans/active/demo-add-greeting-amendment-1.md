# Amendment 1: demo-add-greeting

## Parent

demo-add-greeting

## Date

2026-05-15

## Learning

After reviewing the initial approach, the greeting module should use a factory function pattern instead of a plain function export, to make future extension easier. This does not change any acceptance criterion.

## New direction

Use `createGreeter()` returning an object with a `greet` method instead of a bare function export. The module interface changes internally but the acceptance criteria describe observable outcomes, not the internal structure.

## Impact on acceptance criteria

None — all acceptance criteria remain unchanged. The observable behavior (greet function returns "Hello, <name>!", history written to releases, tests pass) is unaffected by the internal factory pattern change.
