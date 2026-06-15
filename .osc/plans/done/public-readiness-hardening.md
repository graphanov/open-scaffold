# Plan: public-readiness-hardening

## Status

done

## Context

A previous local-only task reportedly committed `325e75a336dfddec5ad44ab7c37b29b71fb91a6b` with the title `Harden public readiness messaging`, but that commit is not present in this checkout and no GitHub PR exists. Recreate the public-facing hardening from fresh `origin/main` so Open Scaffold's docs, package metadata, first-run output, and tests describe readiness and proof boundaries without overstating maturity.

## Goal

Open a fresh GitHub PR whose public surfaces consistently say Open Scaffold is a pre-1.0 repo-record layer with bounded, pilot-grade evidence — not a production-readiness guarantee, compliance program, universal benchmark, or unsupported maturity claim.

## Constraints / Out of scope

- Do not publish npm, create a GitHub Release, merge, or mark anything Latest.
- Do not claim mature 1.0 readiness, production deployment safety, compliance certification, broad adoption, or universal superiority over naked agents.
- Do not introduce private paths, raw logs, secrets, runtime residue, or worker-only evidence.
- Keep the change to wording, first-run guidance, package metadata, tests, and repo-native plan/evidence notes.

## Files to touch

- `MISSION.md` — mission, goals, and non-goals aligned with pre-1.0 proof boundaries.
- `README.md` — first-screen and first-run adoption copy hardened around pilot-grade evidence and non-production-readiness claims.
- `docs/FAQ.md` — readiness answer rewritten away from overbroad production-ready wording.
- `docs/PROOF_HARNESS.md` — proof ledger explicitly distinguishes record-layer evidence from readiness guarantees.
- `docs/START_HERE.md` — first-reader entry point states the pre-1.0 repo-record boundary.
- `package.json` — npm metadata describes the current package promise and keywords.
- `src/first-run.ts` — generated first-run output and evidence skeleton point to structural evidence-chain/proof-boundary guidance.
- `tests/blueprint-mega.test.ts` — first-run regression coverage for readiness guidance.
- `tests/public-positioning.test.ts` — public positioning/package metadata regression coverage.
- `.osc/releases/2026-06-15-public-readiness-hardening.md` — release/evidence note for this PR candidate.

## Acceptance criteria

- [x] README, mission, FAQ, proof harness, and Start Here wording describe Open Scaffold's current readiness as pre-1.0, bounded, and proof-boundary-aware. Evidence: `.osc/releases/2026-06-15-public-readiness-hardening.md`.
- [x] No touched public surface implies production readiness, compliance certification, broad adoption, mature 1.0 status, or universal benchmark superiority. Evidence: `.osc/releases/2026-06-15-public-readiness-hardening.md`.
- [x] First-run output and generated evidence skeleton state that evidence-chain checks are structural and point readers to proof/readiness guidance. Evidence: `.osc/releases/2026-06-15-public-readiness-hardening.md`.
- [x] Package metadata reflects the current repo-native work-record promise rather than broad runtime/product maturity. Evidence: `.osc/releases/2026-06-15-public-readiness-hardening.md`.
- [x] Focused tests lock public positioning and first-run readiness messaging. Evidence: `.osc/releases/2026-06-15-public-readiness-hardening.md`.
- [x] Build, strict verifier, focused tests, secret scan, and full suite pass before the PR is opened, or unrelated failures are documented. Evidence: `.osc/releases/2026-06-15-public-readiness-hardening.md`.

## Verification steps

1. `git diff --check` — whitespace check.
2. `npm run build` — TypeScript/package build.
3. `npm test -- --run tests/public-positioning.test.ts tests/blueprint-mega.test.ts` — focused positioning and first-run/blueprint tests.
4. `npm run osc -- doctor --check secret-scan` — public-safe secret scan.
5. `./verify.sh --strict` — Open Scaffold repository verifier.
6. `npm test -- --run` — full Vitest suite, if practical.

## Open questions

- None.
