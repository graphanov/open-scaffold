# Amendment 1: 054-multi-language-agent-entry-points

## Parent

054-multi-language-agent-entry-points

## Date

2026-05-21

## Learning

Codex review identified that two verification requirements in the original plan were too weak or internally inconsistent:

- Sorting heading lists before diffing them proves only set equality, not section-order parity. Translated agent entry points must preserve heading structure and heading order.
- A blanket ban on `TODO:` markers conflicts with the English source files, where `TODO: define mission` and `TODO:` amendment-section references are documented source literals that agents and verification tooling depend on.

## New direction

Keep the English source files canonical, but require translated `AGENTS-<lang>.md` and `CLAUDE-<lang>.md` files to preserve:

- exact `##` heading lines in the same order as the English source;
- exact source literals inside code spans, including `TODO: define mission` and documented `TODO:` section references;
- language-matched paired-view comments, so `AGENTS-<lang>.md` points to `CLAUDE-<lang>.md` and `CLAUDE-<lang>.md` points to `AGENTS-<lang>.md`.

## Impact on acceptance criteria

- AC2 is tightened: heading parity must be verified without sorting, because heading order is part of the structural contract.
- AC7 is clarified: translated files must not contain unfinished placeholder sections or untranslated English body paragraphs, but documented source literals such as `TODO: define mission` and `TODO:` section references must remain intact.
- Verification step 1 changes to unsorted heading diffs.
- Verification step 2 changes from a blanket no-`TODO:` grep to documented-literal count checks plus a scan for unfinished placeholder prose or untranslated body text.
