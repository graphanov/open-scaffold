# Plan: 054-multi-language-agent-entry-points

## Status

active


## Context

AGENTS.md and CLAUDE.md serve as the paired-view instruction files that agentic coding tools (Claude Code, Codex, Cursor, Copilot, Gemini CLI, and others) read on project load. They carry project facts, operating rules, and workflow conventions. For non-English-speaking developers and coding agents, these files are opaque until translated. The paired-view constraint — that both files carry the same project facts in formats each tool reads natively — applies across languages too: a Japanese AGENTS.md must mirror the English AGENTS.md structure and factual claims, just as it mirrors CLAUDE.md. This plan adds translations in 5 major languages plus a contribution guide so the community can add more. The English originals remain canonical; translations carry a header noting that.

## Goal

Ship AGENTS.md and CLAUDE.md translations in 5 languages (Chinese/zh, Japanese/ja, Korean/ko, Spanish/es, Portuguese/pt) plus a contributor translation guide, with structural parity to the English originals verified by heading-count diff.

## Constraints / Out of scope

- Translated files MUST mirror the English source exactly in structure: same heading hierarchy, same section order, same factual claims. The paired-view constraint applies across languages.
- Translations are best-effort: machine translation is acceptable for initial ship with a disclaimer header, but human review is preferred. The disclaimer must state "This is a machine-assisted translation. The English AGENTS.md is canonical. Report discrepancies as issues."
- Each language gets two files: `AGENTS-<lang>.md` and `CLAUDE-<lang>.md`. The English originals (`AGENTS.md`, `CLAUDE.md`) remain unchanged and canonical.
- Does NOT translate `MISSION.md`, `ROADMAP.md`, plan files, docs, or shell scripts — those are project-specific and change frequently; translation maintenance cost would be too high.
- Does NOT add i18n infrastructure, locale detection, or automatic language switching for agent tools — agents read whichever file the user or tooling points them to.
- Translated files must NOT contain `TODO:` markers or untranslated English sections.

## Files to touch

- `AGENTS-zh.md` — Chinese translation of AGENTS.md, with canonical-source header.
- `CLAUDE-zh.md` — Chinese translation of CLAUDE.md, with canonical-source header.
- `AGENTS-ja.md` — Japanese translation, canonical-source header.
- `CLAUDE-ja.md` — Japanese translation, canonical-source header.
- `AGENTS-ko.md` — Korean translation, canonical-source header.
- `CLAUDE-ko.md` — Korean translation, canonical-source header.
- `AGENTS-es.md` — Spanish translation, canonical-source header.
- `CLAUDE-es.md` — Spanish translation, canonical-source header.
- `AGENTS-pt.md` — Portuguese translation, canonical-source header.
- `CLAUDE-pt.md` — Portuguese translation, canonical-source header.
- `docs/TRANSLATIONS.md` — contributor guide: how to add a new language, heading parity check script, machine translation workflow, review checklist, and maintenance policy (English source changes trigger a translation update issue).
- `docs/decisions/README.md` — add a decision note about the translation policy: "AGENTS.md and CLAUDE.md are translated into 5 languages with machine-assisted best-effort quality. English is canonical. Translation discrepancies are bugs to be reported."
- `README.md` — add a "Languages" section or badge listing available translations with links.

## Acceptance criteria

- [ ] 10 translated files exist (5 language pairs: zh, ja, ko, es, pt), each with the canonical-source header.
- [ ] Each translated file has identical heading structure to its English source, verified by `diff <(grep '^##' AGENTS.md | sort) <(grep '^##' AGENTS-<lang>.md | sort)` returning no output (empty diff).
- [ ] `docs/TRANSLATIONS.md` exists with contribution guide: file naming convention (`AGENTS-<ISO 639-1>.md`), heading parity check command, machine translation tool recommendation (DeepL or Google Translate), human review checklist, and maintenance policy.
- [ ] `./verify.sh --strict` passes — translated files are additive and do not modify originals.
- [ ] Each translated file has a header block: `<!-- TRANSLATION: This is a machine-assisted <language> translation. The canonical source is the English AGENTS.md. Report discrepancies at <repo>/issues. Last synced: <date>. -->`
- [ ] `README.md` mentions available translations, either in a "Languages" section or as badges.
- [ ] No `TODO:` markers or untranslated English sections in any translated file.

## Verification steps

1. For each language (`zh`, `ja`, `ko`, `es`, `pt`), run:
   ```
   diff <(grep '^##' AGENTS.md | sort) <(grep '^##' AGENTS-<lang>.md | sort)
   diff <(grep '^##' CLAUDE.md | sort) <(grep '^##' CLAUDE-<lang>.md | sort)
   ```
   Expected: no output (empty diff = structural parity).
2. Run `grep -r "TODO:" AGENTS-*.md CLAUDE-*.md` — expected: no matches.
3. Run `grep -L "canonical source" AGENTS-*.md CLAUDE-*.md` — expected: no output (all files have the header).
4. Run `./verify.sh --strict` — expected exit 0.
5. Manually open one translated file per language and spot-check at least 3 sections for translation quality and factual accuracy against the English source.
6. Confirm `docs/TRANSLATIONS.md` header parity check command works by running it against an existing language pair.

## Open questions

- Should translated files live at repo root (alongside AGENTS.md) or in a `i18n/` or `translations/` subdirectory? Root keeps them visible to agent tools that scan the root for entry-point files; a subdirectory hides them from automatic detection.
- What is the maintenance contract when English AGENTS.md changes? Option A: a CI check that fails if translated files have diverged heading structure, flagging them for manual update. Option B: an automated translation update workflow using a translation API. Option A is simpler and more trustworthy for v1.
- Should we include French, German, Russian, or Arabic? The 5 languages were chosen for coverage of large developer populations (China, Japan, Korea, Latin America, Brazil). Additional languages can follow the contributor guide.
- Should `AGENTS-<lang>.md` files include a `lang` attribute in their frontmatter or header for machine detection? The ISO 639-1 code in the filename is sufficient for now; YAML frontmatter would add parsing complexity without clear benefit.
