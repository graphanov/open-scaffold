# Plan: 117-osc-trace-work-record-replay

## Status

backlog

## Context

Traceability is one of Open Scaffold's strongest stories, but today a reader must manually jump through plans, runs, dispatch receipts, evidence notes, releases, and PR links. The strategy review identified the missing product surface as one read-only command that reconstructs the chain for a plan.

## Goal

Ship `osc trace PLAN_SLUG` as a read-only chain replay command that prints the work record for one plan from plan file through runs, evidence, release notes, and public references.

## Constraints / Out of scope

- Read-only local filesystem command by default.
- Does not judge correctness or evidence quality; it reconstructs and labels known links.
- Does not require GitHub API or network access, though it may print recognized external references.
- Does not replace `osc verify --evidence-chain`; trace explains the chain, verify checks structural integrity.
- No dashboard or hosted trace viewer.

## Files to touch

- `src/trace.ts` — chain discovery and rendering.
- `src/cli.ts` — add `osc trace PLAN_SLUG [--json] [--include-unverified]`.
- `tests/trace.test.ts` — fixtures for full chain, partial chain, missing evidence, and external refs.
- `docs/TRACE.md` — user guide and relationship to evidence-chain verification.
- `docs/SLICE_CLOSE_PROTOCOL.md` — link trace command as the reconstruction path.

## Implementation Architecture Coverage

- Strengthens: recovery, audit trails, onboarding, and reviewability.
- Audit envelope: plan slug, found file paths, run IDs, evidence paths, release notes, PR refs, and warnings.
- Evaluation envelope: deterministic fixtures for complete and incomplete chains.
- Feedback routing: missing links become warnings and can feed evidence-chain verifier follow-ups.
- Boundary: no correctness judgment, no network verification, no compliance certification.

## Acceptance criteria

- [ ] `osc trace PLAN_SLUG` finds a plan in active/backlog/blocked/done and prints its status, goal, acceptance criteria summary, and file path.
- [ ] The command lists local run packets that reference the plan slug and local evidence notes that cite the plan.
- [ ] The command lists release notes and PR/issue references when they can be found in local files.
- [ ] Output clearly labels each link as local, external, missing, or unverified.
- [ ] `--json` emits stable machine-readable chain data.
- [ ] Docs explain how `osc trace` differs from `osc verify --evidence-chain`.

## Verification steps

1. Run `npm test -- --run tests/trace.test.ts`.
2. Run `npm run build`.
3. Run `node dist/cli.js trace 107-work-dry-run-package-sync` or another done plan with known evidence.
4. Run the same command with `--json` and parse it as JSON.
5. Run `./verify.sh --strict`.

## Open questions

- Should `osc trace` be included inside `osc verify --evidence-chain` output as a detail mode, or remain a separate read-only discovery command?
- Should external references be optionally verified via GitHub API in a later network-enabled mode?
