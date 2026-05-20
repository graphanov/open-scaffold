# Plan: 083-verify-help-flags

## Status

done

## Context

The pinpoint dogfood scout targeted verification opacity after recent lifecycle help fixes. Live reproduction showed the verification surface still treats help/option probes poorly: `./verify.sh --help` exits 2 with `Unknown flag: --help`, while `osc verify --help` runs verification instead of printing usage. Automation and exploratory users need a safe way to ask how verification works before running or scripting it.

## Goal

Make shell and CLI verification help probes print explicit usage with exit code 0, and make unsupported `osc verify` options fail with a clear usage message instead of being silently ignored.

## Constraints / Out of scope

- Do not add a new machine-readable verifier format in this slice.
- Do not change existing pass/fail semantics for `./verify.sh --quick|--standard|--strict` or `osc verify`.
- Do not publish npm, move GitHub Release latest, merge, or make broad verifier redesign decisions.

## Files to touch

- `verify.sh` — add help handling and usage text for the shell verifier.
- `src/cli.ts` — add `osc verify --help` and explicit unsupported-option handling.
- `tests/verify-help.test.ts` — regression coverage for the verification help/option surface.
- `.osc/releases/2026-05-20-083-verify-help-flags.md` — evidence note for this pinpoint slice.

## Acceptance criteria

- [ ] `./verify.sh --help` exits 0, prints verifier usage, and does not report `Unknown flag`.
- [ ] `osc verify --help` exits 0, prints verifier usage, and does not run normal verification checks.
- [ ] `osc verify --json` exits 2 with a clear unsupported-option message and usage instead of silently ignoring the flag.
- [ ] Existing verification commands still pass unchanged.

## Verification steps

1. `./verify.sh --help` — exits 0 and prints usage.
2. `npm run --silent osc -- verify --help` — exits 0 and prints usage.
3. `npm test -- tests/verify-help.test.ts --run` — regression test passes.
4. `git diff --check` — whitespace check passes.
5. `npm test -- --run` — full test suite passes.
6. `npm run build` — TypeScript build passes.
7. `./verify.sh --strict` — scaffold strict verification passes.

## Open questions

None.
