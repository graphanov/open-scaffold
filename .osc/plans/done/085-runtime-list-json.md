# Plan: 085-runtime-list-json

## Status

done

## Context

The pinpoint dogfood scout targeted the runtime/profile boundary after the coordinator asked for another pass on runtime profiles, runtime packages, and no-spawn versus launch wording. Live reproduction showed `osc runtimes show <id>` is JSON by default, but `osc runtimes list --json` silently ignores the JSON flag and emits TSV. That makes the profile catalog harder for coordinators and public dogfood automation to inspect safely.

## Goal

Add a machine-readable JSON output path for runtime profile listing while preserving the existing TSV output and no-spawn runtime boundary.

## Constraints / Out of scope

- Do not change runtime profile semantics, launch behavior, adapter status, or no-spawn guarantees.
- Do not add runtime install, network registry, marketplace, credential, or spawn behavior.
- Do not publish npm, move GitHub Release latest, merge, or make broad runtime strategy decisions.

## Files to touch

- `src/cli.ts` — add `osc runtimes list --json` handling and clear unsupported-option handling for the runtimes list surface.
- `tests/cli-init.test.ts` — add regression coverage for JSON list output and unsupported list options.
- `docs/RUNTIME_PROFILES.md` — document the JSON list option for automation users.
- `.osc/releases/2026-05-20-085-runtime-list-json.md` — evidence note for this pinpoint slice.

## Acceptance criteria

- [ ] `osc runtimes list --json` exits 0 and emits parseable JSON.
- [ ] JSON list output includes built-in profiles with source metadata and no launch/spawn behavior changes.
- [ ] `osc runtimes list --bogus` exits 2 with a clear usage/unknown-option message instead of silently ignoring the option.
- [ ] Existing `osc runtimes list` TSV output remains available.

## Verification steps

1. `npm run --silent osc -- runtimes list --json` — exits 0 and emits parseable JSON.
2. `npm test -- tests/cli-init.test.ts --run` — runtime CLI regression tests pass.
3. `git diff --check` — whitespace check passes.
4. `npm test -- --run` — full test suite passes.
5. `npm run build` — TypeScript build passes.
6. `./verify.sh --strict` — scaffold strict verification passes.

## Open questions

None.
