# Plan: 108-public-work-record-positioning

## Status

done


## Context

A post-v1 adoption strategy review found that the strongest public line is simple: AI work should not disappear into chat logs. Current public wording still leans on abstract or over-large phrases such as "operating system," "control plane," and "evolution ledger" before a new reader understands the concrete payoff.

## Goal

Reframe the first public surfaces around Open Scaffold as the repo-native work record for AI-assisted software, with explicit auditability boundaries and no compliance-grade overclaim.

## Constraints / Out of scope

- Documentation and positioning only; no CLI behavior, runtime spawning, registry, or schema changes.
- Do not remove the underlying product ambition; translate it into plain public language.
- Do not claim legal compliance, tamper-proof storage, automatic correctness, or runtime certification.
- Keep owner-neutral public wording; do not name private workflows or internal research paths.

## Files to touch

- `README.md` — replace the hero and first-scroll explanation with the work-record promise.
- `MISSION.md` — align public mission language away from "operating system" overclaim if the slice elects to touch mission wording.
- `docs/FAQ.md` — clarify substrate-versus-program boundaries and non-compliance claims.
- `docs/COMPARISON.md` — position Open Scaffold as the record layer alongside Spec Kit, BMAD, Agent OS, and LangSmith.
- `docs/AUDITABILITY.md` — new plain-language page separating evidence substrate, verification, approval, and compliance programs.

## Implementation Architecture Coverage

- Strengthens: adoption trust, audit trails, authority boundaries, and public comprehension.
- Audit envelope: before/after phrase audit for prohibited overclaims and final touched-file list.
- Evaluation envelope: grep-based vocabulary check plus manual first-scroll review.
- Feedback routing: unclear public claims become follow-up backlog, not hidden edits.
- Boundary: no runtime execution, no dashboard, no compliance certification.

## Acceptance criteria

- [x] README first screen uses a plain headline equivalent to: "Your AI agent's work belongs in your repo, not its chat history."
- [x] README explains the concrete record chain in one paragraph: goal, plan, handoff, evidence, approval, and lessons.
- [x] Public docs avoid leading with "agent OS," "control plane," "compliance-grade," and "operating system" as the category claim.
- [x] `docs/AUDITABILITY.md` explains what Open Scaffold can prove structurally and what remains a human/process/compliance responsibility.
- [x] `docs/COMPARISON.md` frames Spec Kit/BMAD/Agent OS/LangSmith as adjacent layers, not enemies Open Scaffold must beat head-on.
- [x] A grep audit records remaining occurrences of high-risk terms with either removal or explicit rationale.

## Verification steps

1. Run a grep audit for `operating system|control plane|compliance-grade|agentic OS|tamper-proof` across changed public docs.
2. Manually read the README first 80 lines and verify a cold reader can answer: what it is, who it is for, and what artifact it creates.
3. Run `npm test -- --run` if docs tests exist for links or generated content.
4. Run `./verify.sh --strict` and confirm no plan/evidence drift is introduced.

## Open questions

- Should mission wording change in the same PR, or should the mission keep internal ambition while README/docs carry the external category line?
- Which exact public category phrase should become canonical for six months: "repo-native work record," "AI work ledger," or "flight recorder for AI-coded work"?
