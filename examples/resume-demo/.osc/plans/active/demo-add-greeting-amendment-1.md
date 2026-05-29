# Amendment 1: demo-add-greeting

## Parent

demo-add-greeting

## Date

2026-05-15

## Learning

After reviewing the initial approach, the greeting module should use a factory function pattern internally while keeping the public `greet` export required by the parent plan. This does not change any acceptance criterion.

## New direction

Add `createGreeter()` returning an object with a `greet` method, then export a `greet(name)` wrapper that delegates to the default greeter. The internal structure changes, but the public API and observable acceptance criteria remain unchanged.

## Impact on acceptance criteria

None — all acceptance criteria remain unchanged. The observable behavior (greet function returns "Hello, <name>!", history written to releases, tests pass) is unaffected by the internal factory pattern change.
