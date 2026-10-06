# Plan: codex-pr10-verify-feedback

## Status

done

## Context

Codex review on PR #10 arrived after merge and flagged two `verify.sh` bugs: GNU `stat -f %m` can return filesystem text instead of epoch mtime, and the immutability check failed to warn on the first post-create content edit. Daniel also corrected the process: wait at least two minutes for Codex before treating review as blocked/no-response.

## Goal

Patch PR #10 verification regressions and document the Codex wait-time process correction without changing Open Scaffold's runtime-neutral core boundary.

## Constraints / Out of scope

- Do not change release scope or retag unless explicitly needed.
- Do not add GitHub-network-dependent validation to core in this hotfix.
- Keep this as a small verification bugfix.

## Files to touch

- `verify.sh` — fix GNU/BSD stat fallback and immutability edit-count threshold.

## Acceptance criteria

- [ ] `verify.sh --strict` works on macOS/BSD and does not contain GNU-unsafe `stat -f %m` first ordering.
- [ ] The plan immutability check warns on any post-create content-modifying commit while allowing pure renames/moves.
- [ ] Standard verification, strict verification, CLI verification, tests, build, and whitespace checks pass.

## Verification steps

1. Run `./verify.sh --standard`; expected result: pass.
2. Run `./verify.sh --strict`; expected result: pass with no warnings in current repo.
3. Run `npm run osc -- verify`; expected result: pass.
4. Run `npm test`; expected result: pass.
5. Run `npm run build`; expected result: pass.
6. Run `git diff --check`; expected result: pass.

## Open questions

- Should a future M7 validation slice add portable shell unit tests for `verify.sh` using fake `stat` implementations?
