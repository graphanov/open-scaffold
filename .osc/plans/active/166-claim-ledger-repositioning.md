# Plan: 166-claim-ledger-repositioning

## Status

active

## Context

The 2026-06 benchmark program (independent repo: harness-bench) executed plan
163's intent and returned verdicts: in-session task performance, retry discipline
for strong models, unconditional cheap resume, and five-slice memory carry are
measured dead; the reviewability claim won decisively (fresh-reviewer accuracy
94% vs 30% at half the review cost, preregistered, pilot-grade); resume value is
conditional on recoverable state; the enforcement checkpoint repairs the
protocol's own failure mode. The public surface still tells the pre-measurement
story. The owner directed: rewrite the story around the measured claims, then
publish.

## Goal

README, docs/PROOF_HARNESS.md, and docs/STABILITY.md present the measured claim
ledger — what died, what survived, what is untested, each with its boundary and a
pointer to raw evidence — while keeping every pinned positioning phrase and
honesty rule intact.

## Constraints / Out of scope

- No overclaims: every number carries its pilot-grade boundary; negative results
  stay at equal prominence (they are the credibility asset).
- Pinned phrases preserved (public-positioning, first-run-docs tests); forbidden
  vocabulary avoided; "AI-assisted work", never the s-word product category.
- No code changes; docs and plan files only.

## Files to touch

- `README.md` — a "What's measured" section after the command table.
- `docs/PROOF_HARNESS.md` — benchmark-program section with the claim ledger and campaign table on top of the existing fixture content.
- `docs/STABILITY.md` — Honest limits updated from "backlog plan 163" to executed-program status with the two strongest measured limits.
- `tests/section-parser.test.ts` — corpus hash repin (this plan file).

## Acceptance criteria

- [ ] README first screen retains all pinned phrases; new section states the reviewability result with boundaries and links to PROOF_HARNESS.
- [ ] PROOF_HARNESS.md carries the dead/alive/untested ledger with campaign citations and the benchmark repo pointer.
- [ ] STABILITY Honest limits names the measured non-goals explicitly.
- [ ] Full chain green: npm run build && npm test && ./verify.sh --strict && git diff --check.

## Verification steps

1. `npx vitest run tests/public-positioning.test.ts tests/first-run-docs.test.ts tests/reduced-cli-docs.test.ts` — green.
2. Full chain green.
3. Read-through: no forbidden vocabulary in changed files.

## Open questions

- None.
