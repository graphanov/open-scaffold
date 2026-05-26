# Release / Evidence Note: 100-verify-strict-filename-quoting

## Summary

Hardened `verify.sh --strict` so plan filenames are passed to Python as arguments instead of interpolated into Python source. This closes the audit finding where a quote-containing plan filename could execute embedded Python while the verifier computed relative plan paths.

## Traceability

- Roadmap / issue / task: Milestone 19 trust/security hotfix before runtime-adoption UX work.
- Plan: `.osc/plans/done/100-verify-strict-filename-quoting.md`
- Branch: `fix/verify-strict-filename-quoting`
- Pull Request: https://github.com/graphanov/open-scaffold/pull/118.

## Verification

- `npm test -- tests/verify-help.test.ts` — passed, 4 tests including the malicious filename regression.
- `npm run osc -- plan validate .osc/plans/done/100-verify-strict-filename-quoting.md` — passed, 0 issues.
- `./verify.sh --strict` — passed: 10 pass, 0 fail, 0 warn.
- `npm test` — passed: 40 files, 357 tests.
- `npm run build` — passed.
- `git diff --check` — passed.

## Outcome

The verifier keeps its existing behavior and output shape while avoiding untrusted filename interpolation in the strict immutability check. The regression fixture creates a minimal git-backed scaffold with a plan filename containing a single quote and embedded Python expression; strict verification must complete without creating the `PWNED` marker file.

## Follow-up

Continue with `101-osc-start-codex-agent-entry` after this PR is reviewed and merged. Broader runtime security, adapter sandboxing, signing, and supply-chain controls remain out of scope for this hotfix.
