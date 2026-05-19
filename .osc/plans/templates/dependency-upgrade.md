# Plan: dependency-upgrade

## Status

backlog

## Context

REPLACE_ME: `<dependency>` needs to move from `<old version>` to `<new version>` because of security, compatibility, or platform support.

## Goal

REPLACE_ME: Upgrade `<dependency>` safely, document compatibility impact, and preserve existing behavior.

## Constraints / Out of scope

- Do not upgrade unrelated dependencies in the same slice.
- Do not change runtime behavior except where the dependency requires it.
- Include a rollback path if the upgrade breaks downstream users.

## Files to touch

- `package.json` or equivalent manifest — dependency version.
- Lockfile — resolved dependency graph.
- `<test file>` — compatibility coverage for affected behavior.

## Acceptance criteria

- [ ] The dependency and lockfile are updated consistently.
- [ ] Changelog or release notes for the dependency are reviewed.
- [ ] Affected behavior is covered by tests or smoke checks.
- [ ] Rollback command or previous version is recorded.

## Verification steps

1. Run install/lockfile verification.
2. Run affected tests.
3. Run build and full repository verification.

## Open questions

- None.
