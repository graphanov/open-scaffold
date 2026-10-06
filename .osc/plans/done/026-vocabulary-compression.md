# Plan: 026-vocabulary-compression

## Status

done

## Context

The 2026-05-14 external review identified vocabulary inflation as an adoption tax. After the owner filled ADR 0001, lightweight external adoption for solo developers and small teams is the explicit direction, so a vocabulary compression pass is now aligned with product strategy.

## Goal

Make first-touch Open Scaffold docs understandable with plain-language aliases while preserving precise terms where they remain useful in deeper protocol docs.

## Constraints / Out of scope

- Do not delete load-bearing protocol terms without owner approval.
- Do not rewrite the whole methodology in this slice.
- Do not edit `MISSION.md` directly.
- Do not change runtime boundaries or product strategy while compressing vocabulary.
- Keep the regulated/auditable traceability promise intact while reducing jargon.

## Files to touch

- `README.md` — use plain-language first-touch vocabulary.
- `docs/FAQ.md` — align adoption-facing explanations if needed.
- `docs/GLASS_COCKPIT_PROTOCOL.md` — add alias wording only if owner approves touching deep docs.
- `docs/SLICE_CLOSE_PROTOCOL.md` — add alias wording only if owner approves touching deep docs.
- `docs/RUNTIME_BINDING_CONTRACT.md` — add alias wording only if owner approves touching deep docs.
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — maintain precise ontology while adding newcomer-friendly aliases if needed.

## Acceptance criteria

- [ ] README introduces no more than 10 Open Scaffold-specific terms before the first Quickstart section, measured by a documented term list in the PR or evidence note.
- [ ] Each retained specialized term in README has a plain-language alias on first use.
- [ ] Deep protocol docs keep canonical terms but add a plain-language alias on first use for `glass cockpit`, `slice close`, `runtime binding`, `operator surface`, and `run packet` if those terms appear.
- [ ] A grep/audit note lists every remaining occurrence of `glass cockpit`, `slice close`, `runtime binding`, `operator surface`, and `run packet` in first-touch docs and explains whether it is kept or aliased.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Produce a vocabulary audit command/output in the PR or evidence note, for example `grep -RniE "glass cockpit|slice close|runtime binding|operator surface|run packet" README.md docs/*.md`.
4. Manually confirm README first-touch section can be read without private Daniel/Hermes context.

## Open questions

- Should aliases live inline in the same docs, or should a separate `docs/GLOSSARY.md` carry them with first-touch docs linking there?
- Which terms are non-negotiable product vocabulary versus internal/deep-doc vocabulary?
