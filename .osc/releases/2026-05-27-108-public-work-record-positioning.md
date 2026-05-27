# Release / Evidence Note: 108-public-work-record-positioning

## Summary

Aligned the first public surfaces around Open Scaffold as a repo-native work record for AI-assisted software. Added an auditability boundary page that separates structural evidence from human review and formal compliance programs.

## Traceability

- Roadmap / issue / task: Strategy backlog PR #132 promoted plan 108 into public backlog.
- Plan: .osc/plans/done/108-public-work-record-positioning.md
- Run ID / run packet: N/A — documentation and positioning slice only; no runtime execution.
- Branch / PR: `docs/work-record-positioning`; https://github.com/graphanov/open-scaffold/pull/133

## Verification

- RED check: `npm test -- tests/public-positioning.test.ts --run` — failed as expected before docs changes: missing README promise, missing docs/AUDITABILITY.md, missing comparison-adjacent-layer wording.
- GREEN focused check: `npm test -- tests/public-positioning.test.ts --run` — 1 file passed, 5 tests passed.
- Full test suite: `npm test -- --run` — 44 files passed, 384 tests passed.
- Build: `npm run build` — PASS.
- Scaffold verifier: `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- Whitespace: `git diff --check` — PASS.
- README first-screen manual review: first 80 lines state the repo-native work-record promise, concrete goal/plan/handoff/evidence/approval/lessons chain, and no leading agent-OS/control-plane/compliance category claim.
- Repo-wide high-risk term audit: `grep -RInE 'operating system|control plane|compliance-grade|agentic OS|tamper-proof' MISSION.md ROADMAP.md docs` — two remaining hits, both historical changelog records (`MISSION.md` and `docs/CHANGELOG.md`) from the original 2026-05-11 positioning; retained because they are history, not current category language.

## Outcome

The current public category language now leads with repo-native work record rather than operating-system/control-plane framing. Auditability language is intentionally bounded: Open Scaffold records the chain; humans and verification tools judge the chain; formal programs govern the organization around the chain.

## Follow-up

- Next train slice: 109-bare-attempt-compare.
- Owner gate remains: merge this PR after CI and latest-head Codex review are clean.
