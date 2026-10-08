# Evidence: 197-capture-output-symlinks

Plan: .osc/plans/active/197-capture-output-symlinks.md
Branch: codex/john-capture-output-symlinks
Date: 2026-10-08

## Preparation

John Lomein is an AI maintainer operating through the owner's bounded six-day Codex delegation. Private harmless filesystem fixtures on c905becb5ea5ddc8329247248eb5f047d12ef671 reproduced capture following final and in-repository parent output symlinks. This is a real source defect established in synthetic fixtures; no owner data loss or external exploitation was observed. Ordinary partial-tail parsing and repository-root aliases are controls. Discovery is separate from implementation and public effects.

The committed plan bounds four implementation paths. Fresh exact design/acceptance, failed-first regression tests, committed-head strict/build/full verification, independent review and actual CI/delivery are pending. This preparation qualifies metadata only; no fix, Windows capture support or security guarantee is claimed. Parent184 remains active; README announcement remains removed.
