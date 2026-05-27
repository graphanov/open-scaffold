# Release / Evidence Note: 108-public-work-record-positioning

## Summary

Aligned the first public surfaces around Open Scaffold as a repo-native work record for AI-assisted work. Added an auditability boundary page that separates structural evidence from human review and formal compliance programs.

## Traceability

- Roadmap / issue / task: Strategy backlog PR #132 promoted plan 108 into public backlog; owner correction broadened the slice beyond software-only wording via amendment 1.
- Plan: .osc/plans/done/108-public-work-record-positioning.md
- Amendment: .osc/plans/done/108-public-work-record-positioning-amendment-1.md
- Run ID / run packet: N/A — documentation and positioning slice only; no runtime execution.
- Branch / PR: `docs/work-record-positioning`; https://github.com/graphanov/open-scaffold/pull/133

## Verification

- RED check: `npm test -- tests/public-positioning.test.ts --run` — failed as expected before docs changes: missing README promise, missing docs/AUDITABILITY.md, missing comparison-adjacent-layer wording.
- RED follow-up check: `npm test -- tests/public-positioning.test.ts --run` — failed after adding the tracked dashboard mission-excerpt regression because `.osc/dashboard.html` still embedded the old `repo-native operating system` mission text.
- RED follow-up check: `npm test -- tests/public-positioning.test.ts --run` — failed after adding the wiki-log append-only regression because the original 2026-05-15 seed log entry had been rewritten instead of preserved.
- RED follow-up check: `npm test -- tests/public-positioning.test.ts --run` — failed after adding the software-only positioning regression because first-touch docs still used narrow AI/software category wording.
- RED follow-up check: `npm test -- tests/public-positioning.test.ts --run` — failed after adding the release-evidence summary regression because the evidence note still used narrow AI/software category wording in its summary.
- RED follow-up check: `npm test -- tests/public-positioning.test.ts --run` — failed after adding the auditability regression because `docs/AUDITABILITY.md` still made usefulness depend on being close to code.
- Dashboard refresh: `npm run osc -- dashboard --web` — regenerated `.osc/dashboard.html` from current `MISSION.md` and evidence summary; latest output 227266 bytes.
- GREEN focused check: `npm test -- tests/public-positioning.test.ts --run` — 1 file passed, 9 tests passed.
- Full test suite: `npm test -- --run` — 44 files passed, 388 tests passed.
- Build: `npm run build` — PASS.
- Scaffold verifier: `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- Whitespace: `git diff --check` — PASS.
- README first-screen manual review: first 80 lines state the repo-native work-record promise, concrete goal/plan/handoff/evidence/approval/lessons chain, and no leading agent-OS/control-plane/compliance category claim.
- Current public-surface high-risk term audit: `grep -RInE 'operating system|control plane|compliance-grade|agentic OS|tamper-proof' MISSION.md ROADMAP.md docs` — three remaining hits, all historical records (`MISSION.md`, `docs/CHANGELOG.md`, and the preserved 2026-05-15 wiki log seed entry) from the original positioning; retained because they are history, not current category language. The tracked dashboard mission excerpt is covered by the focused regression test.
- Software-only positioning audit: `grep -RInE 'AI-assisted[[:space:]]+software|software[[:space:]]+work|software[[:space:]]+project|software[[:space:]]+projects|software[[:space:]]+development|build[[:space:]]+software|building[[:space:]]+software' README.md MISSION.md AGENTS.md CLAUDE.md ROADMAP.md SECURITY.md docs` — no current first-touch/public-doc hits after the broadened positioning pass.

## Outcome

The current public category language now leads with repo-native work record for AI-assisted work rather than software-only, operating-system, or control-plane framing. Auditability language is intentionally bounded: Open Scaffold records the chain; humans and verification tools judge the chain; formal programs govern the organization around the chain.

## Follow-up

- Next train slice: 109-bare-attempt-compare.
- Owner gate remains: merge this PR after CI and latest-head Codex review are clean.
