# Plan: 196-native-windows-amend-close-smoke

## Status

active

## Context

PR300 fixes portable Windows-form MISSION navigation, but native Windows filesystem/runtime qualification remains explicitly unproved. Read-only discovery found a small Node built-CLI fixture and separate Windows CI job. The portable Darwin/Node26.6 fixture passes and its require-Windows guard refuses Darwin before child commands. Existing whole parity suites use POSIX shell, symlinks and platform-specific paths, so they cannot supply this narrow native result. Historical local main and two binding refusals, plus a global amendment-token fixture refusal, remain recorded as discovery attempts.

## Goal

Actual Windows CI provides head-bound evidence for one regular-file Node amend/close fixture, preserving the existing Ubuntu CI contract and honest platform qualification limits.

## Constraints / Out of scope

- Append one independent Windows job to existing ci.yml; keep existing triggers, Ubuntu ci job/check and permission/checkout contract intact. Use Windows2025, Node22.12.0, PowerShell, contents:read, existing locked dependencies and core build. No write/id-token permission, protection, credential or release/npm workflow change.
- Standalone smoke uses Node built-ins and built CLI/API with shell:false, explicit noncredential child environment, actual path/filesystem behavior and no platform/path/clock mocks. It executes init/plan/amend/close/repeat from a temporary path with spaces and nested cwd; no Bash, sh, tsx wrapper, Git subprocess or package publication inside the smoke.
- Enforce actual process.platform win32 when requested by CI before fixture commands. Bind platform/architecture/Node/OS, runner image, actual tested Git commit and PR head/event SHA, source/test/workflow Git blob OIDs plus working hashes, built CLI hashes, commands and fixture bytes. Distinguish merge ref and checkout line endings from source-head identity.
- Qualification requires actual successful Windows job/check and downloaded artifact/log evidence at current bindings; a job definition, Mac pass, dispatch or missing artifact never qualifies native Windows. Native install/core build/PowerShell checkout remain pending until observed.
- Scope is one regular parent/two amendments, canonical serialization versus native public output, Status/amendment bytes, uniform Windows history repair, surviving regular alias, fenced/outside history, CRLF/trailing bytes and repeat idempotence. No whole Windows support, npm bin/packed install, shell fallback, symlink/literal-POSIX/drive/UNC/long-path matrix, runtime spawning/MCP/capture, transaction or concurrency claim.
- No product source/API, package scripts/dependencies/lock, source cap/roots, root README/assets, persona/evaluator or legacy runtime changes. Existing maintained source remains16866/41; new smoke is outside those roots. Preserve canonical owner drafts and all failed attempts.
- Direct-owner routine maintenance delegation and independent publication/merge gates apply; parent184 remains active. No branch-protection changes to make the new check pass, no continue-on-error.

## Files to touch

- `.github/workflows/ci.yml` — append the narrow read-only Windows job and bound evidence upload.
- `tests/native-amend-close-smoke.mjs` — standalone real-host built-CLI/API smoke with explicit Windows guard and JSON evidence.
- `.osc/releases/2026-10-08-196-native-windows-amend-close-smoke.md` — portable preparation, actual committed-head verification, native CI artifact/log result and delivery limits.

## Acceptance criteria

- [ ] Existing Ubuntu ci job/check/triggers/checkout/permissions remain intact; the appended Windows job uses declared runner/Node/core-only build/read-only permissions and no masked failure or protected effect.
- [ ] Portable smoke passes on the local host and require-Windows refuses a non-Windows host before fixture commands; no mock or wrapper turns portable evidence into native qualification.
- [ ] Actual native Windows smoke preserves native public paths, canonical history, all three regular moved records, Status-only parent edit, unchanged amendments/alias/excluded raw history and repeat idempotence within the declared fixture.
- [ ] Current actual Windows job/log/downloaded artifact binds tested merge/head commit, source/test/workflow blobs and working hashes, Node/OS/image and command/fixture bytes; missing/stale/native-refused evidence blocks qualification and merge.
- [ ] Only three implementation paths change after separate admission; product source/API/cap/dependencies/parent184/README/assets/frozen definitions and canonical drafts remain preserved.
- [ ] Unchanged committed-head independent strict/build/full checks and fresh full-publication review precede public effects; existing required GitHub checks plus the new native check/current bindings precede delegated merge/readback/release/closeout.

## Verification steps

1. Read preserved discovery and scope, obtain fresh exact design/critique before writer admission.
2. Validate meaningful native guard, portable fixture, evidence schema and workflow checkout failure behavior locally where available; retain platform/Node/PowerShell gaps explicitly.
3. Verify existing workflow/record checks and source metric, then independently run ./verify.sh --strict, npm run build and npm test on the unchanged committed candidate and review the complete publication diff.
4. Publish one reserved scoped draft PR and read back actual head/base/files. Observe existing checks and new Windows job; download/read bound artifacts/logs before reporting the native scope or admitting merge.
5. Refresh current head/base/review/CI/scope/producers/threads, merge only within owner delegation, read back default tree/parent/blobs and release before factual closeout; keep parent184 active.

## Open questions

- Exact PowerShell translation, artifact failure behavior and narrow fixture need independent design acceptance. No actual Windows job or implementation is admitted by this preparation.
