# Evidence: 201-mcp-output-schemas

## Summary

Prepared an optional-property repair for eight closed MCP read output schemas. The 32 added declarations describe metadata that successful handlers already return. Existing properties, required arrays, closed-object guards and the three conforming schemas remain unchanged; handlers and nested contracts are preserved.

## Traceability

Plan: `.osc/plans/active/201-mcp-output-schemas.md`.
Source: `fe5b375ce4a141bae37d465e4a750d04bf5c1915`.
No PR was created for this preparation. The exact four-file proposal remains unapplied.

## Verification

- The source-declaration baseline reproduced eight primary read-contract failures and three optional-state failures (missing/unset mission and judge-present checkpoint). The three conforming read controls passed. The focused baseline recorded 32 passes and 15 failures: eleven contract failures and four failures in unchanged CLI controls. Three raw CLI diagnostics explicitly report socket-path `EINVAL`; the fourth records only exit 1 instead of expected 0 and remains unclassified. A socket-length cause for that fourth failure is inferred, not directly observed. A dependency-copy startup failure was also retained separately.
- The private candidate passed all 47 focused tests with no pending tests. Actual JSON-serialized JSON-RPC handler replies match advertised schemas and text content; required-only compatibility, extra-property, missing-required, existing/new wrong-type, unsupported-keyword, complete fixture/source preservation and sibling-prefix controls pass. The unchanged CLI controls also pass using ordinary OS temporary files.
- Core and focused-test no-emit TypeScript checks pass with the existing strict compiler options. An initial TypeScript file-list configuration rejection was retained before using an inherited focused project configuration.
- The maintained source measures 16,984 physical TypeScript lines across 41 files: 59 readable lines above 16,925. The metric retains its roots, 20,890 baseline, file ceiling and POSIX shell equality.
- The actual evidence-note parser accepts the required headings; its missing-Outcome control reports the expected warning.

## Outcome

Preparation is verified only within these focused checks. Source HEAD, branch and maintained-source bytes remain unchanged. No implementation admission, commit, publication, merge or release is observed. Independent acceptance, the unchanged committed-head strict/build/full-test floor, complete publication review and current CI remain outstanding. The checker covers the four schema keywords present here and fails on unsupported keywords; this is no general JSON Schema, third-party client, security or runtime certification.

## Implementation observations (2026-10-09, before commit)

The native writer applied the accepted four-file proposal after a fresh private baseline recorded 36 passes and eleven semantic contract failures with no CLI harness failures. The applied source candidate passed all 47 focused tests once. All eight schema changes add the same 32 optional fields; existing properties, required arrays, closed guards, controls and every non-output-schema source byte are preserved. The exact metric remains 16,984 physical lines across 41 files, with POSIX counting equality. The actual note parser accepts the required sections and rejects each missing-heading control. Scoped diff inspection and `git diff --check` passed.

A private report-classification assertion stopped before application because abbreviated JSON failure messages omitted some full diagnostics. An unintended run of the original source's 20 existing focused tests passed before application; that run is preserved separately and is excluded from candidate verification. The fresh 36/11 baseline and actual applied 47/0 candidate are not reruns.

The accepted preparation note above is preserved verbatim. These observations add implementation and precommit facts only. The committed-head strict/build/full-test floor, fresh independent publication review, current CI, public effects and delivery readback remain later gates at this point; no publication, merge, release or whole-client compliance is claimed.

## Delivery and factual closeout (2026-10-09)

[PR #306](https://github.com/graphanov/open-scaffold/pull/306) delivered the accepted repair through a squash merge at 00:33:16Z. Reviewed head `4b4760be915758be1c4f4d900e9fbf0cb6b9f48f` and merge `798c179dedb7832b6ceb2a3a0d3ffbdefc6d5141` share tree `401e5c080e1e837f21748b57cdd01814dd876976`; the merge has the single expected parent `af2dc06a183ce2fb8e9dca97daf1d7acf91032b6`. Readback verified all eleven changed-path identities, including prior200 metadata, and matching main/origin-main. The exact-head squash command exited 0 without admin bypass or branch deletion. The restored 680-line README and absent announcement SVG remain preserved, and the source writer was released.

The production worker reported unchanged committed-head strict verification (9 passes, 0 failures, 18 warnings), successful compilation of both projects and 1,207 passing tests across 56 files. Its fresh semantic baseline was 36/11 and its applied focused candidate 47/0. Independent verification of that same committed head separately returned exit 0 for `./verify.sh --strict`, `npm run build` and `npm test`, taking 44.839, 0.409 and 19.462 seconds; the canonical verification seal is `e233ec9c9d95d86eea6eb1ede67a7cc3aef3b104012ce1293200a8491cacafa8`. Command output hashes are retained; that helper's raw stdout was discarded, so those independent exits do not establish additional count observations.

Fresh complete publication review sealed `a6f2b068c6751bb050ae746cf1e085779a39b3db9d6eb16845bfbd8c1b095d3e`; the fresh GitHub review readback sealed `50841ba6774034f691b4d61aa5e347448174112c4b03e57498aa8fda1464096a`. The current-head connector summary completed at 00:28:57Z, reported no issues and received its +1 reaction at 00:29:00Z. All five producer-bound admission checks succeeded and exhaustive review threads were zero. Required CI, zero required approvals, enforced admin protection and absence of rulesets were preserved. A fresh delivery audit sealed `b13ad44d9046b548c8efe3f397db2b1e0519dbbf30eb5a7ba257ce161ea16877` at cutoff 00:40:15.128733Z corroborates delivery and explicitly excludes this later local closeout.

The supported CLI close was invoked once: one plan moved, one MISSION closure stamp was inserted and one helper-managed MISSION reference was retargeted. Final plan: `.osc/plans/done/201-mcp-output-schemas.md`; all five criterion words remain exact, with factual checked boxes and reference-only evidence suffixes. The earlier 4,209 note bytes above remain an exact prefix. This closeout changes only the four admitted metadata paths. Parent184 remains active and the six-day experiment remains incomplete.

The delivered source still adds 32 optional properties across eight schemas and measures 16,984 physical lines across 41 files, a deliberate 59-line increase. Existing required fields/types, closed guards, handler results and permissions are unchanged. The earlier 32/15 preparation baseline is historical; only three unchanged CLI diagnostics explicitly showed EINVAL and the fourth remains unclassified. The retained classification stop and unintended original-source 20-test run are excluded from candidate verification. No live SDK, general JSON Schema, privacy, Windows, runtime, npm publication or adoption guarantee is established. Canonical ownerdraft byte equality remains unknown.
