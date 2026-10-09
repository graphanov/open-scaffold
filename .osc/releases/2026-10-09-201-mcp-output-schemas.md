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
