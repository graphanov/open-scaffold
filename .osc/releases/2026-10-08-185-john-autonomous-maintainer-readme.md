# Release / Evidence Note: 185-john-autonomous-maintainer-readme

## Summary

John's dated autonomous-maintainer announcement and accessible static SVG banner are live in the default-branch README through PR #285. The actual native Codex Forge agent implemented the change, a fresh agent reviewed its committed head, and the controller verified it before publication. This proves this bounded delivery, not broader product reliability or adoption.

## Traceability

- Roadmap / issue / task: owner-requested public notice within six-day plan 184.
- Plan: `.osc/plans/done/185-john-autonomous-maintainer-readme.md`.
- Run ID / run packet: `john-open-scaffold-six-day-20261008`, task `185-john-autonomous-maintainer-readme`; private runtime receipts retained separately.
- Branch / PR: `codex/john-six-day-run`, https://github.com/graphanov/open-scaffold/pull/285.

## Verification

- `./verify.sh --strict` on `1f9296d146620add7d44eee8bd24d5adcc75080c` — exit 0, 9 pass / 0 fail / 18 historical warnings.
- `npm run build` — exit 0, core and runtime-omx builds passed.
- `npm test` — exit 0, 56 files / 710 tests passed.
- Fresh independent review on the same head — no actionable findings; parser tests 7/7, accessible/static/local-resource SVG inspection and three HTTP-200 public links.
- Corpus comparison — reproduced old/current hashes; all 181 prior plan and 131 prior release outcomes unchanged. Publication-missing warning in setup note 184 was retained.
- GitHub checks on the same PR head — CI, evidence validation, structural check and changed-plan validation succeeded; two optional mirror jobs skipped.
- PR readback — MERGED at 2026-10-08T00:21:00Z, merge `ffc229a2b06f9d5ca36fcd1bbd135901c4315fb6`, authenticated GitHub account `graphanov`. Merge used the owner's explicit time-limited delegation; no human review was fabricated.
- Default-branch content readback — README and SVG Git blob IDs matched the locally verified candidate after merge.

## Outcome

The banner and accurate John explanation shipped. Candidate review was by an AI agent, not a human GitHub approval. Native runtime model identity and per-task cost remained unreported. John product setup qualification and the remaining six-day maintenance interval are separate ongoing work.

## Follow-up

- Keep plan 184 active through the full interval. Archive the active notice and link observed results when the delegated run ends, under the applicable closing authority.
