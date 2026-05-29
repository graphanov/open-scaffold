# Plan: demo-add-greeting

## Status

active

## Context

The demo project needs a greeting module so the resume fixture has a meaningful active slice to demonstrate zero-context resume.

## Goal

Implement a greeting module that returns "Hello, <name>!" and records each greeting to the releases folder.

## Constraints / Out of scope

- No web server or external service calls.
- Greeting history is append-only; no editing past entries.

## Files to touch

- `src/greet.ts` — the greeting function.
- `tests/greet.test.ts` — tests for the greeting function.
- `.osc/releases/` — evidence note on completion.

## Acceptance criteria

- [x] Greeting module exports a greet function that returns the string "Hello, <name>!".
- [ ] Greeting history is written to the releases folder as an evidence note on each run.
- [ ] All greeting tests pass (npm test exits 0).

## Verification steps

1. `node -e "import('./src/greet.js').then(m => console.log(m.greet('World')))"` → prints `Hello, World!`
2. `npm test` → exits 0 with greeting tests green.

## Open questions

- None.
