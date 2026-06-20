# Amendment 1: 173-codex-token-efficiency-proof

## Parent

173-codex-token-efficiency-proof

## Date

2026-06-18

## Learning

The Codex 2x cold-resume fixture is useful but too easy to over-read: it currently proves one bounded token-efficiency decision, while the next proof-battery work needs to make adjacent non-claims impossible to accidentally promote. Human-reviewer replication, controlled ablations, and cold-resume packet quality should be first-class, source-labeled fixture metadata even when their status is `not_demonstrated` or `mixed_not_proven`.

## New direction

Harden the checked-in proof surface by adding a fail-closed evidence-battery layer to proof manifests. The current Codex fixture may still pass only for its stated source-labeled 2x cold-resume claim, but its report must also disclose which evidence items are required for that pass and which adjacent claims are explicitly outside the pass gate: human-reviewer replication, controlled ablations, and broader fixture coverage. Add a cold-resume packet contract so the compact packet's required fields are mechanically named and source-linked instead of implied by prose.

## Impact on acceptance criteria

- AC1 and AC3 gain a stricter source-labeling requirement: the Codex fixture must include evidence-battery entries and a cold-resume packet contract that point only to committed, public-safe local fixture files.
- AC4 gains explicit non-claim disclosures: human-reviewer replication and controlled ablations must be represented as `not_demonstrated` / `mixed_not_proven` evidence entries unless and until real receipts exist.
- AC5 expands from targeted proof tests to include fail-closed evidence-battery validation, package-payload coverage for the new fixture sources, and docs that keep the Codex 2x claim bounded.
