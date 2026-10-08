# Release / Evidence Note: 187-parser-characterization-fixtures

## Summary

Parser tests preserve the full historical characterization while accepting valid live work-record additions and clean closures without hash edits. Meaningful live diagnostics still fail on any unexpected change.

## Traceability

- Roadmap / issue / task: https://github.com/graphanov/open-scaffold/issues/288 (closed by PR290).
- Plan: `.osc/plans/done/187-parser-characterization-fixtures.md`.
- Run ID / run packet: `john-open-scaffold-six-day-20261008`, native task187; private operational records retained separately.
- Branch / PR: `codex/john-handoff-maintenance`, https://github.com/graphanov/open-scaffold/pull/290.

## Verification

- Candidate `8766d6dac11574070e3ce9956455c4805edda442`: exactly four test/fixture paths changed after accepted base; no production code/dependency/schema edits.
- Full fixture:356 exact public documents,1,369,930 raw bytes,2,505 ordered complete sections,184 plan rows,133 release rows. Both original historical hashes preserved against qualified tree192509906ee59789d534f6ec8deaa8a0d8d5ed9d.
- Targeted parser32/32, full795 tests, strict9 pass/0 fail/18 historical warnings, both builds and CLI verification passed on unchanged clean HEAD.
- Fresh independent Overwatch independently reproduced qualified Git bytes/maps/outcomes;25 negative mutation cases detected,6 positive cases passed. Current-head and full-publication-scope review found no actionable findings.
- Controller independently ran all required checks before publication reservation; actual draft readback observed and writer lease released.
- GitHub CI/evidence/structural/changed-plan checks succeeded; two optional mirror jobs skipped. PR290 merged at2026-10-08T01:38:29Z as1cc35f26f743ae90acd92b62f0bf93817b142add; issue288 closed.
- All four default-branch test/fixture blobs matched the verified candidate. GitHub merge account graphanov operated through the owner's explicit delegation; no human review was invented.

## Outcome

The test-only repair shipped to main. Fixture data adds repository test weight and no shipped runtime dependency. Nonempty warnings remain exact and require review when changed; the setup184 publication warning remains. Ordinary failed-first evidence and root preparation are preserved separately from John execution. No package release/publication occurred; model/cost identity remains unknown where unreported.

## Follow-up

- Keep six-day parent184 active. Continue synthetic discussions and bounded real maintenance; S03's independently reproduced lab-compiler section-budget defect is next.
