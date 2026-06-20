# Release / Evidence Note: 173-codex-token-efficiency-proof

## Summary

Hardened the Codex 2x cold-resume proof fixture with fail-closed evidence-battery rows, explicit non-claim disclosures for human-reviewer replication and controlled ablations, and a cold-resume packet contract recorded in the aggregate receipt. The bounded Codex 2x claim remains source-labeled to committed receipts and still does not claim broad workload dominance, human replication, release, merge, publish, deployment, or compliance approval.

## Traceability

- Roadmap / issue / task: owner prompt to strengthen bounded proof battery; implemented through plan 173 amendment 1.
- Plan: `.osc/plans/done/173-codex-token-efficiency-proof.md`.
- Amendment: `.osc/plans/done/173-codex-token-efficiency-proof-amendment-1.md`.
- Run ID / run packet: `N/A` — no runtime was spawned; this is a fixture/manifest/docs/test hardening slice over committed receipts.
- Branch / PR: branch `proof-battery-hardening`; PR pending owner review.

## Verification

- `./verify.sh --quick --quiet && npm run osc -- resume --max-chars 12000` — exit 0; resumed active plan 173.
- `node examples/proof/codex-token-efficient-resume/score-fixture.mjs --reuse-committed-receipts` — exit 0; regenerated `receipts/aggregate.json` and `manifest.json`; reported ratio `4.330033` with control tokens `137327` and scaffolded tokens `31715`.
- `npm run osc -- prove check examples/proof/codex-token-efficient-resume/manifest.json` — PASS, `0 warning(s)`.
- `npm run osc -- prove compare examples/proof/codex-token-efficient-resume/manifest.json --format markdown` — PASS; evidence battery pass; required rows `codex-2x-cold-resume-replicates` and `cold-resume-packet-contract` demonstrated; human-reviewer replication `not_demonstrated`; controlled ablations `mixed_not_proven`.
- `npm test -- --run tests/proof.test.ts tests/package-payload.test.ts tests/public-positioning.test.ts tests/blueprint-mega.test.ts` — 4 files passed, 34 tests passed.
- `npm run build` — exit 0 (`build:core` and `build:runtime-omx`).
- `npm test` — 48 files passed, 541 tests passed.
- `./verify.sh --strict` — 9 pass, 0 fail, 1 warn (`Plan immutability check skipped` in this git-worktree checkout).
- `npm run osc -- doctor --check secret-scan` — PASS, no obvious token/webhook strings found.
- `git diff --check` — exit 0.
- Added-line public safety scan for names, private paths, Discord IDs, tokens/webhooks/secrets/API keys — no private identity/path/secret hit; benign matches were proof-token wording and fixture paths.

## Outcome

approval:
  status: approved
  rationale: Local plan closeout is approved for this branch because the source-labeled fixture hardening, docs, tests, build, proof compare/check, secret scan, and diff checks passed; this is not merge, publish, release, deployment, or compliance approval.

The proof harness now renders an evidence-battery section in `osc prove compare`, validates every evidence-battery source ref with the same local/public-safe fail-closed rules as metric refs, and blocks `boundedProof` when a required item is not `demonstrated` or `reproduced`. The Codex cold-resume fixture records a packet-field contract and explicitly keeps human-reviewer replication and controlled ablation claims out of the PASS gate until real receipts exist.

## Follow-up

- Open PR / owner review / merge remain pending; no merge, publish, npm release, GitHub Release, deployment, or compliance approval happened.
- Real human-reviewer replication and controlled ablation runs remain future source-labeled receipts, not current claims.
