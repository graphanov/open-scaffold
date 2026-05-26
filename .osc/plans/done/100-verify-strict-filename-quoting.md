# Plan: 100-verify-strict-filename-quoting

## Status

done


## Context

The post-v1 security audit found a low-likelihood but real shell-quoting issue in `verify.sh --strict`: a malicious plan filename containing quotes can be interpolated into a Python `-c` command. This is not an adoption feature, but it is the fastest trust fix before broadening the runtime/dispatch surface.

## Goal

Make `verify.sh --strict` handle unusual plan filenames without shell-interpolating filenames into executable Python source.

## Constraints / Out of scope

- Do not redesign `verify.sh`.
- Do not change the plan filename slug policy or `osc plan new` behavior unless a regression test proves it is necessary.
- Do not add new security tooling, signing, or runtime sandbox features in this slice.

## Files to touch

- `verify.sh` — pass filenames to Python through `sys.argv` instead of interpolating into `python3 -c` source.
- `tests/` or shell verification fixture if practical — regression coverage for quote-containing filenames.
- `.osc/releases/` — evidence note if the fix ships in a PR.

## Implementation Architecture Coverage

- Strengthens: verification trust and safe handling of adversarial repository content.
- Audit envelope: verification command output plus regression fixture/test output.
- Evaluation envelope: malicious-looking filename fixture must not execute and strict verification must complete safely.
- Feedback routing: any broader audit-signing or prompt-injection findings become separate plans.
- Boundary: this is not runtime security, adapter sandboxing, compliance certification, or supply-chain redesign.

## Acceptance criteria

- [ ] `verify.sh` no longer interpolates untrusted filenames into Python source strings.
- [ ] A plan filename containing a single quote is handled safely by the strict verification path or rejected before execution.
- [ ] Existing `./verify.sh --strict` behavior remains otherwise unchanged.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. Run the new regression fixture/test for quote-containing plan filenames.
2. Run `./verify.sh --strict`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `git diff --check`.

## Open questions

- None.
