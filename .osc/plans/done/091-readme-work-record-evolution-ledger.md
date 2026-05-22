# Plan: 091-readme-work-record-evolution-ledger

## Status

done

## Context

PR #87 shipped `osc evolve compare`, which made the evolution loop visible in the CLI. The README now mentions the feature, but the first-touch story is still too protocol-heavy: repo-native source of truth, runtime-neutral protocol, run packets, envelopes, profiles, and adapters appear before a new reader has a simple mental model.

The next README slice should combine the existing Open Scaffold proposition with the newer evolution-ledger direction:

- work should not disappear into chat logs;
- humans should keep control and reviewability;
- agents/runtimes need clear handoff files;
- evidence should stay attached to the work;
- repeated attempts need a ledger that explains which attempt became the frontier and why.

Oh My Codex is useful as style inspiration because its README has a clear identity, default flow, and mental model even though it is not short. This slice should borrow that simplicity without copying content or changing Open Scaffold's boundaries.

## Goal

Rewrite the README front door so a new reader understands Open Scaffold as a repo-native work record and evolution ledger for AI-assisted software, while preserving the core handoff/evidence proposition and making the evolution loop visually clear with compact ASCII diagrams.

## Constraints / Out of scope

- Do not add new CLI behavior or runtime behavior.
- Do not publish npm, create a GitHub Release, or claim `open-scaffold@0.4.12` is public until the separate package gate is approved and completed.
- Do not claim Open Scaffold launches, supervises, ranks, certifies, or approves agents/models.
- Do not use raw private author notes or private Command Center details in public README copy.
- Do not attack BMAD/spec-kit/Agent OS or compare against them directly.
- Do not move broad runtime adapter expansion into this README slice.

## Files to touch

- `README.md` — rewrite first-touch positioning, default flow, mental model, diagrams, and concise links.
- `.osc/plans/done/091-readme-work-record-evolution-ledger.md` — this scope contract, closed after acceptance criteria passed.
- `.osc/releases/2026-05-22-091-readme-work-record-evolution-ledger.md` — evidence note after verification.
- `MISSION.md` — changelog stamp from `osc close`.

## Acceptance criteria

- [x] README opens with a plain statement of what Open Scaffold is: work record + evolution ledger for AI-assisted software.
- [x] README uses `reviewability` as the first-touch proof word instead of leading with heavier compliance/audit language.
- [x] README explains the core value before internal ontology: control, clarity, reviewability, handoff, evidence, and improvement loops.
- [x] README includes one compact ASCII workflow diagram for goal/plan/handoff/evidence/review.
- [x] README includes one compact ASCII evolution-loop diagram for multiple attempts -> compare -> frontier.
- [x] README preserves current core proposition: mission/plans, handoff package/run.json, evidence/release notes, human approval, and runtime-neutral boundaries.
- [x] README avoids unsupported claims about spawning, supervising agents, model ranking, compliance certification, automatic skill self-improvement, or release approval.
- [x] README remains materially simpler than current first-touch copy; target `wc -c README.md <= 9000` unless preserving essential install/quickstart commands requires a small documented exception.
- [x] Links to deeper docs remain available without front-loading every concept.

## Verification steps

1. `wc -c README.md` — target <= 9000 bytes or evidence note explains any small exception.
2. `grep -RniE "glass cockpit|operator surface|runtime binding|dispatch receipt|harness skill|slice close|task bridge|evaluation envelope|audit envelope|run packet|substrate|governance|orchestration layer" README.md docs .osc/plans 2>/dev/null || true` — review README hits for plain-language aliases and no unsupported claims.
3. `./verify.sh --strict` — repository checks pass.
4. `npm test -- --run` — tests pass.
5. `npm run build` — package builds.
6. `git diff --check` — no whitespace errors.

## Open questions

- Keep npm/GitHub Release `0.4.12` publication as a separate owner gate. This README slice may mention `osc evolve compare` because it is now on `main`, but public npm users will not receive it until the separate publish gate is completed.
