# Plan: 086-init-help-flags

## Status

done

## Context

The pinpoint dogfood scout targeted the brownfield init / first-run CLI surface after recent help-flag hardening for lifecycle and verifier commands. Live reproduction showed `osc init --help` is still routed through normal init option parsing: it exits 2 with `Unknown option for init: --help` and prints the global CLI help instead of a safe init-specific usage message. A user exploring `osc init --from-existing` should be able to ask for help before choosing a target directory.

## Goal

Make init help probes print concise init-specific usage with exit code 0, and make unsupported init options show init-specific usage rather than the whole root command surface.

## Constraints / Out of scope

- Do not change greenfield or brownfield init write semantics.
- Do not broaden into a command-parser refactor or help overhaul for every command.
- Do not publish npm, move GitHub Release latest, merge, or create release artifacts outside this focused pinpoint.
- Keep package/release drift as a bundle-release candidate, not an immediate publish gate.

## Files to touch

- `src/cli.ts` — add init-specific help/usage routing.
- `tests/cli-init.test.ts` — add regression coverage for `osc init --help` and unsupported init options.
- `.osc/releases/2026-05-20-086-init-help-flags.md` — evidence note for this pinpoint slice.

## Acceptance criteria

- [x] `osc init --help` exits 0, prints init-specific usage, and does not report `Unknown option for init`.
- [x] `osc init --json` exits 2 with a clear unsupported-option message and init-specific usage.
- [x] Existing brownfield init behavior remains unchanged.
- [x] Repo verification gates pass locally.

## Verification steps

1. `npm test -- tests/cli-init.test.ts --run` — targeted init CLI tests pass.
2. `npm run --silent osc -- init --help` — help exits 0 and prints init usage.
3. `npm run --silent osc -- init --json` — exits 2 with init-specific usage.
4. `git diff --check` — whitespace check passes.
5. `npm test -- --run` — full Vitest suite passes.
6. `npm run build` — TypeScript build passes.
7. `./verify.sh --strict` — scaffold strict verification passes.

## Open questions

None.
