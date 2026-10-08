# Release / Evidence Note: 196-native-windows-amend-close-smoke

## Summary

Plan 196 adds a separate read-only Windows2025/Node22.12.0 built-CLI/API amend/close smoke job. The accepted workflow and standalone fixture were ported unchanged, preserving the existing Ubuntu CI bytes and production APIs. Local portable verification is observed; native qualification remains pending until the actual current Windows check, logs and downloaded JSON are independently read back.

## Traceability

- Plan: `.osc/plans/active/196-native-windows-amend-close-smoke.md`.
- Preparation: `4d97935aa9b9c8f5ba4685ceed9716b0605c27e1`.
- Branch: `codex/john-native-windows-smoke`.
- Source delivery: `ac720eea3f61e6544c0312c5703f053c1b6c1fc5`; local195 closeout `ab60745a43622ed592f3631db956796254742233`; historical localmain `fb16fb2f65320c8bf87d24069a7eaf84924ba2ec` is retained separately.
- Scope: `.github/workflows/ci.yml`, `tests/native-amend-close-smoke.mjs`, and this note, under exact three-path admission.
- Runtime: native Codex six-day owner delegation; no external runtime adapter dispatch.

## Verification

The port retains the accepted workflow SHA256 `b4ab1326ad039b323b5e2184ae6d0c14d1facf69b3582bfeb5de1ea0a2e0d58e` and smoke SHA256 `8cf4ba43cc90d21845aaab48cebda37b3cef79a3cb9f1a1e88e7182dcf3f0451`. Actual portable execution after the local build passed on Darwin arm64 / OS 25.5.0 / Node v26.6.0: five CLI children, one API amendment, ten fixture snapshots, and successful cleanup. Require-Windows refused before any child command or fixture allocation. Unknown arguments, missing binding and existing evidence were refused; a separate copied fixture with an explicitly failing CLI retained child exit 7 and successful cleanup. That injected failure is a negative control, not production or native evidence. No passing fixture was repeated. Earlier discovery failures and synthetic qualification counterexamples remain preserved privately.

Local `./verify.sh --strict` passed with 9 pass / 0 fail / 18 historical warnings, and `npm run build` passed both core and runtime builds using existing local dependencies. The first `npm test` observed 1112 passes / 1 failure across 56 files: this note lacked the standalone branch metadata required by the live-document parser. The branch entry was corrected within this note. Ruby parsed the actual appended YAML; all 93 existing workflow tests and both maintained-source metric tests passed in that initial suite. `node --check` accepted the smoke syntax. PowerShell parsing/execution was not observed.

After the branch metadata correction, `npm test` passed 56 files / 1113 tests. The standalone mjs is outside Vitest discovery; no added Vitest count is claimed. Retained portable readback recomputed all ten snapshot hashes and the exact history transition, checked all five CLI argument/cwd/executable records and API arguments/results, and matched the report's built-artifact hashes to the actual local build. These are local observations before commit; unchanged committed-head checks are retained separately.

The private portable receipt harness initially compared newline-terminated JSON to `console.log` output with an extra newline and failed after the actual smoke passed. The raw stdout, command receipt and failure are retained; the portable report is derived from that stdout by removing the extra console newline. Remaining controls continued without rerunning the passing fixture or changing its bytes.

The workflow append keeps the existing Ubuntu triggers, `ci` job/check, permissions and authenticated-fetch/public-fallback contract. The Windows job pins `windows-2025`/Node22.12.0, translates public fallback to PowerShell, checks every native-command exit, installs the existing lock and builds core only. It binds the event commit and PR merge parents, Git blobs and working bytes, image/PowerShell identity, platform/Node, built artifacts, subprocess outputs and fixture snapshots. Explicit evidence completeness checks precede an always-run upload with no-files failure; neither upload nor a partial failure report can qualify the run.

PowerShell is unavailable on the local host. Windows2025/x64/Node22.12.0, PowerShell checkout, locked installation, Windows core build and native filesystem/runtime execution are unobserved. Local build/test results do not fill those gaps. Maintained source was freshly measured at 16866 physical TypeScript lines / 41 files in the unchanged roots. Root README SHA256 remains `68067971c2916621fd7df485563b82929ff8c3a0bded508a49268f0ad81a5314`; `docs/assets/john-lomein-on-duty.svg` remains absent and parent 184 remains active.

## Outcome

Local candidate only. Actual Windows results: zero. Current committed-head verification, independent production review, existing CI and the new `Native Windows Node amend/close smoke` check, and downloaded artifact/log readback are not established by this note. No whole-Windows, npm/release, adoption or six-day completion claim follows.

The fixture covers one regular parent and two regular amendments through the built Node CLI/API. Shell/packed-install wrappers, symlinks, drive/UNC/case/long paths, runtime/MCP/capture, transaction/concurrency and whole-platform support remain outside this qualification scope.

## Follow-up

Root must perform an independent unchanged-committed-head strict/build/full verification and fresh production review before publication. Native qualification and delegated merge require the actual successful current check/producer/log/download, independently fetched Git objects and checkout-byte correspondence, complete runtime/invocation/API/fixture fields, all five exact command records, ten recomputed snapshots with semantic transitions, and successful cleanup. The private consistency helper accepts some incomplete/self-consistent or relabelled synthetic reports; its success cannot establish native proof. Missing, failed, stale, partial or non-Windows evidence blocks native qualification and merge. Factual CI/PR/delivery and closeout evidence belongs here only after those observations.
