# Plan: 197-capture-output-symlinks

## Status

done

## Context

Read-only private CLI fixtures on c905 confirmed that capture resolves output links before its symlink-safe writer. A default ambient final link overwrites an unrelated in-repository evidence file; a linked ambient parent creates output through it. Explicit external final links also overwrite their targets. Ordinary partial-tail capture, transcript-alias refusal and a legitimate repository-root alias are separate controls. These are synthetic filesystem fixtures, not an observed owner data-loss incident.

## Goal

Capture refuses symlinked output files and in-repository output parents before mutation while preserving supported normal output, input protection, hook-safe behavior and repository aliases.

## Constraints / Out of scope

- Preserve lexical output identities through safety checks; legitimate canonical repository-root aliases may resolve, output links below that root must not silently resolve.
- In-repository existing final and parent links, including missing final children, are refused without changing link/target/transcript bytes. Explicit external existing final links are refused under the existing final-component contract.
- Preserve transcript overwrite/alias protection, ordinary relative/absolute output, default gitignored location, malformed-tail tolerance and explicit outside-root regular-file output.
- Hook-safe refuses writes while preserving its documented exit/output behavior; it must not imply successful persistence. Do not alter public record schema, CLI grammar, token facts or trust-report semantics.
- No general transaction, race-free sandbox, hardlink, external-parent-link or Windows-symlink qualification claim. Keep verification to actual supported host fixtures; Windows CI remains its narrow amend/close job.
- Three source/test files plus the evidence note are the only implementation paths. Readability takes precedence over artificial line-cap golf; report maintained line count without changing metric roots, budget helpers or unrelated source. No dependency/workflow/README/persona/evaluator/legacy/canonical draft changes.
- Owner delegation permits independently verified routine maintenance; public effects require unchanged-head floor, fresh review, current CI and readback. Parent184 stays active through the six-day interval.

## Files to touch

- `src/capture.ts` — preserve output identity for the existing safe writers and input-alias check.
- `tests/capture.test.ts` — direct writer refusal and compatibility controls.
- `tests/cli-capture.test.ts` — actual default/explicit/hook-safe CLI regression and unchanged-target controls.
- `.osc/releases/2026-10-08-197-capture-output-symlinks.md` — factual discovery, failed-first regressions, verification/review/delivery and limits.

## Acceptance criteria

- [x] Existing final in-repository and explicit external output symlinks are refused before target mutation; symlink identities and transcript bytes remain intact. | Evidence: .osc/releases/2026-10-08-197-capture-output-symlinks.md
- [x] In-repository output parent links with missing final files are refused before directory/file mutation; ordinary output and legitimate repository-root aliases continue working. | Evidence: .osc/releases/2026-10-08-197-capture-output-symlinks.md
- [x] Public CLI default and hook-safe regressions fail on the bound baseline and pass on the candidate; hook-safe exit/output semantics and transcript-alias protections remain unchanged. | Evidence: .osc/releases/2026-10-08-197-capture-output-symlinks.md
- [x] Only admitted source/test/evidence paths change, with readable implementation and unchanged schemas/dependencies/workflows/README/frozen definitions/canonical owner drafts. | Evidence: .osc/releases/2026-10-08-197-capture-output-symlinks.md
- [x] Independent strict/build/full checks on unchanged committed head, fresh complete publication review/current CI and actual public-effect readback precede delegated delivery and factual closeout. | Evidence: .osc/releases/2026-10-08-197-capture-output-symlinks.md

## Verification steps

1. Bind discovery commands/fixtures to the actual baseline and preserve failed attempts; obtain fresh bounded design and independent acceptance before implementation.
2. Run new meaningful regressions on unchanged baseline first, then focused direct/CLI positive and negative controls on candidate. Retain target/link/transcript byte checks.
3. Inspect complete diff and source metric; run ./verify.sh --strict, npm run build, npm test on unchanged committed HEAD with independent review.
4. Reserve one draft publication, read back actual PR/paths/head; observe fresh required GitHub checks/threads and reviewed scope before delegated merge, then verify resulting tree/parent/main.
5. Release the implementation lease and close factual records through supported helpers, keeping parent184 active.

## Open questions

- Exact root-alias mapping and explicit external final-component treatment need fresh design review. No implementation is admitted by this preparation.
