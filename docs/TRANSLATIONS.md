# Translation guide

English is canonical for Open Scaffold agent entry points. Translations help non-English-speaking developers and coding agents get oriented, but `AGENTS.md` and `CLAUDE.md` remain the source of truth. A translation discrepancy is a bug to report and fix, not an alternate policy.

## File naming

- Use ISO 639-1 language codes in root-level files: `AGENTS-<ISO 639-1>.md` and `CLAUDE-<ISO 639-1>.md`.
- Keep each language as a pair. If you add `AGENTS-fr.md`, add `CLAUDE-fr.md` in the same change.
- Keep translated agent entry points at the repository root so agent tools that scan root files can discover them.
- Do not translate project-specific files such as `MISSION.md`, `ROADMAP.md`, plan files, shell scripts, or run packets unless a separate plan explicitly approves that maintenance cost.

## Required header

Every translated file starts with a single HTML comment like this, with the source file and date adjusted:

```markdown
<!-- TRANSLATION: This is a machine-assisted <language> translation. The canonical source is the English AGENTS.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: YYYY-MM-DD. -->
```

For `CLAUDE-<lang>.md`, name `CLAUDE.md` as the canonical source. The header date is the date the translation was last synchronized with the English source.

## Heading parity checks

Translated files must preserve every markdown heading line that starts with `##` exactly as written in the English source. This keeps section anchors and structural comparisons stable even when body text is translated.

Run this from the repository root before submitting a translation update:

```bash
for lang in zh ja ko es pt; do
  diff <(grep '^##' AGENTS.md) <(grep '^##' AGENTS-$lang.md)
  diff <(grep '^##' CLAUDE.md) <(grep '^##' CLAUDE-$lang.md)
done
```

Expected result: no output. Do not sort these lists: order is part of the structural contract. To check one language, replace the loop body with that language code only.

## Machine-assisted workflow

1. Start from the current English `AGENTS.md` and `CLAUDE.md`.
2. Translate with a machine-assisted tool such as DeepL or Google Translate, or with an LLM under explicit source-preservation instructions.
3. Protect code blocks, file paths, command names, identifiers, URLs, inline code, exact literal markers such as `TODO: define mission`, and product/runtime names from translation.
4. Restore all heading lines that start with `##` from the English source exactly.
5. Add or update the required translation header with the correct canonical source and sync date.
6. Review the diff against the English source for structural drift and factual drift.

## Human review checklist

Before a translated pair is accepted, a reviewer should confirm:

- The required header is present and names the correct English source.
- Every heading line that starts with `##` matches the English source exactly.
- Code blocks, file paths, command names, identifiers, URLs, inline code, and exact literal markers are unchanged except where a separate plan explicitly allows an exception.
- The translation preserves the same obligations, warnings, constraints, and workflow order as the English source.
- There are no unfinished placeholder sections or source-language body paragraphs left behind; documented source literals such as `TODO:` section references are preserved because agents depend on them.
- The paired files (`AGENTS-<lang>.md` and `CLAUDE-<lang>.md`) describe the same project facts in their tool-specific formats.

## Maintenance policy

- English `AGENTS.md` and `CLAUDE.md` are canonical. Update them first.
- When either English source changes, update every translated pair in the same slice when practical.
- If a translation cannot be updated immediately, open an issue or follow-up plan that names the affected language, source file, changed sections, and required review.
- Keep the header `Last synced` date honest. Do not advance it unless the translated file was checked against the current English source.
- Treat translation corrections as normal documentation fixes. They should preserve heading parity and should not change the English-canonical rule.

## English-canonical rule

If translated guidance conflicts with English guidance, follow the English `AGENTS.md` or `CLAUDE.md`. Report the mismatch at https://github.com/graphanov/open-scaffold/issues so the translation can be corrected.
