# Amendment 1: 192-viewer-record-chain

## Parent

192-viewer-record-chain

## Date

2026-10-08

## Learning

The current viewer was corrected and independently verified, but a repository reference search then found docs/examples/README.md still linking to the removed 60-second-viewer-demo heading and describing four shell commands. The corrected viewer uses the Linked-record viewer heading and three explicit reads. Preserve candidate c983b80d and its scoped SHIP/floor; the incomplete incoming-reference scan must be repaired before publication.

## New direction

Retain the accepted viewer, synthetic-record boundary and active-work guidance. Correct the existing inbound viewer link and its short callout, and check that the actual relative Markdown target resolves to the current viewer section.

The next exact repair may change only:

- `docs/examples/README.md` — update the existing viewer reference and three-read description.
- `tests/first-run-docs.test.ts` — meaningful coverage of the actual referenced file and current Markdown heading target.
- `.osc/releases/2026-10-08-192-viewer-record-chain.md` — retain the prior candidate/reviews/floors and record the reference repair.

Do not change the accepted viewer's three commands, fixture data, CLI/core, root README, assets, dependencies, production source metric or frozen John assets. No general Markdown-link engine or broad documentation rewrite.

## Impact on acceptance criteria

Criterion 1 additionally requires the existing examples index to navigate to the corrected viewer. Criterion 2 requires its callout to describe the same recorded synthetic three-read path without reviving an unmeasured timing claim. Criterion 3 additionally validates that actual inbound relative file/heading target.

Criterion 4 adds docs/examples/README.md to the bounded documentation scope; the root README and all other exclusions remain unchanged.

Criterion 5 is superseded with: only the original three paths changed after the initial admission; only the three repair paths above may change after the new accepted base and lease. Run new unchanged committed-head verification and obtain fresh independent full-publication review before public effects. Fresh actual GitHub CI/current gate remains required before delegated merge.
