# Plan: new-feature

## Status

backlog

## Context

REPLACE_ME: Users need `<capability>` because `<current workflow pain>` blocks a common path. Example: users can create blank plans but need a guided command for a common feature slice.

## Goal

REPLACE_ME: Add `<capability>` with a clear CLI/API surface, tests, docs, and a safe fallback path.

## Constraints / Out of scope

- Do not change unrelated workflows.
- Do not add hidden network calls or runtime spawning.
- Keep the default behavior backwards-compatible.

## Files to touch

- `<source file>` — implements the user-facing behavior.
- `<test file>` — covers success, failure, and edge cases.
- `<doc file>` — explains when to use the feature.

## Acceptance criteria

- [ ] The new behavior works through the documented command or API.
- [ ] Invalid input fails with an actionable error.
- [ ] Documentation includes a minimal example.
- [ ] Existing behavior remains backwards-compatible.

## Verification steps

1. Run the targeted feature tests.
2. Run the full test suite or affected package suite.
3. Run build and repository verification.

## Open questions

- None.
