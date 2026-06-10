# Plan: 161-harness-identity-pivot

## Status

active

## Context

On 2026-06-10 the owner ratified the harness-identity pivot after a full strategy review: Open Scaffold's product identity is the harness that controls the AI work loop ($interview/$plan/$work/$team, gates, receipts, feedback, retry discipline), with the repo-native work record as its substrate rather than the whole product. This explicitly supersedes the 2026-05-15 "agentic orchestration is not a V1 product surface" stance (see `.osc-dev/decisions/2026-06-10-harness-identity-pivot.md`). The public surfaces still pitch the ledger identity, undermine themselves with repeated disclaimers, and carry ~60 public docs against a stated "must stay light" goal. This plan is Phase 1 of 4: identity and face.

## Goal

Every first-touch public surface (MISSION.md, README.md, docs/index.html, docs/START_HERE.md, docs/STABILITY.md, the docs tree) presents Open Scaffold as the AI-work harness in one confident voice, with all honest limits consolidated into a single section, and the public docs tree cut from ~60 files to roughly 20.

## Constraints / Out of scope

- No CLI or src/ behavior changes in this slice (surface collapse is plan 162).
- No claims beyond what is implemented and tested today: no `osc resume` mention as a live command, no benchmark numbers until proof harness v2 (plan 163).
- Honesty is kept, not deleted: limits move to one "Honest limits" home in `docs/STABILITY.md` and are stated once.
- Removed docs are deletions from the public tree only; git history preserves them, and strategy archaeology relocates to `.osc-dev/` notes where still useful.
- Translations are removed, not regenerated (stale since 2026-05-21; staleness is a worse signal than absence).
- npm publish, GitHub Release, commit, and push remain owner-gated and are not part of this slice.

## Files to touch

- `MISSION.md` — rewrite mission statement and goals to the harness identity; changelog entry for the pivot.
- `README.md` — full rewrite: lead with value and the resume story, one command, four verbs, single honest-limits section.
- `docs/index.html` — align hero and contract copy with the harness identity; remove self-undermining passages.
- `docs/STABILITY.md` — add the consolidated "Honest limits" section that all other surfaces link to.
- `docs/START_HERE.md` — make it the single entry point consistent with README.
- Remove from public docs: `JOHN_LOMEIN_MIGRATION.md`, `JOHN_LOMEIN_MIGRATION_ROADMAP.md`, `GLASS_COCKPIT_PROTOCOL.md`, `CONTROL_ROOM_FOUNDATION.md`, `ROACH_PI_INSPIRATION.md`, `RUNTIME_STRATEGY_RESEARCH_*.md` (3), `AB_COMPARISON_*.md` (2), `EVIDENCE_SELF_STUDY.md`, `AGENTIC_RUNTIME_LAYER.md`, `TRANSLATIONS.md`, root `AGENTS-{es,ja,ko,pt,zh}.md` and `CLAUDE-{es,ja,ko,pt,zh}.md`.
- Merge: `RUNTIME_SELECTION.md` + `RUNTIME_PROFILES.md` + `RUNTIME_ADOPTION_WORKFLOW.md` into `RUNTIME_BINDING_CONTRACT.md`/`ADAPTERS.md`; `HARNESS_REPRODUCIBILITY.md` + `ADOPTION_PROOF_INDEX.md` into `PROOF_HARNESS.md`.
- Fix all references to removed/merged docs across remaining public files.

## Acceptance criteria

- [ ] MISSION.md states the harness identity in its opening line and goals; the changelog records the pivot with a dated entry referencing this plan.
- [ ] README.md contains zero disclaimers before the first runnable command; all limits live in one section that links to `docs/STABILITY.md`.
- [ ] `docs/` top-level markdown file count is at or below 25 (from ~60).
- [ ] No remaining public doc references john-lomein, glass cockpit, roach-pi, or runtime-strategy-research archaeology.
- [ ] No remaining public file links to a removed or merged doc path.
- [ ] `./verify.sh --strict`, `npm run build`, and `npm test` all pass after the changes.

## Verification steps

1. `grep -ril "john.lomein\|glass.cockpit\|roach" docs/ README.md MISSION.md` — expect no public hits (decisions history excluded where it records the past).
2. `ls docs/*.md | wc -l` — expect <= 25.
3. Link sweep: grep remaining docs for each removed filename — expect zero references.
4. `./verify.sh --strict && npm run build && npm test` — all green.
5. Manual read of README top fold: value proposition, command, and demo visible without scrolling past any disclaimer.

## Open questions

- Final tagline wording is owner taste; current working line ships and can be amended.
- Whether docs/index.html gets a full visual redesign now or in plan 164 (this slice does copy alignment only).
