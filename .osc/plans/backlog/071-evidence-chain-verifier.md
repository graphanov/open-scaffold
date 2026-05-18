# Plan: 071-evidence-chain-verifier

## Status

backlog

## Context

`osc verify` and `verify.sh` check structural compliance — mission defined, plans present, amendments sequential, evidence notes have sections. But they don't verify the evidentiary chain: does every closed plan have evidence? Does every acceptance criterion have a pass/fail verdict? Does every run reference actually point to an existing run packet? Does every evidence note link back to a plan? A chain verifier walks the identity chain from plan to run to evidence to release, verifying that every link is intact and every claim is backed by an artifact that actually exists on disk. This turns Open Scaffold from "files exist" to "the story checks out."

## Goal

Ship `osc verify --evidence-chain` that walks the full identity chain for a plan or the entire project, verifying that every acceptance criterion has evidence, every run reference is valid, every evidence note links back to a plan, and the close decision has a rationale.

## Constraints / Out of scope

- Verifies evidence existence and structural linkage, NOT evidence quality or correctness. "AC1 has evidence at path X" is a valid link even if the evidence is weak.
- Local filesystem only — does not check that GitHub PRs are merged, CI passed, or Codex reviewed.
- Links are detected from: plan acceptance criteria checkboxes, evidence note traceability section, run packet references, MISSION.md changelog entries.
- Does NOT modify any files — read-only verification.
- Reports are structured: each link is either `intact`, `broken` (reference points to nonexistent file), `missing` (no evidence found for a criterion), or `unverifiable` (link points to a URL or external system, can't check locally).
- Does NOT require git history (works on filesystem state alone).

## Files to touch

- `src/evidence-chain.ts` — new file: chain walker (plan → run → evidence → release traversal), link extraction, existence verification
- `src/cli.ts` — wire `osc verify --evidence-chain [--plan <slug>] [--json]`
- `tests/evidence-chain.test.ts` — test chain walking on fixtures: intact chain, broken chain, missing evidence, external links
- `docs/SLICE_CLOSE_PROTOCOL.md` — add "Evidence Chain Verification" section

## Acceptance criteria

- [ ] `osc verify --evidence-chain` walks all done plans in the project and reports: total plans checked, total evidence links found, intact/broken/missing/unverifiable counts, and a per-plan breakdown
- [ ] `osc verify --evidence-chain --plan 050-npm-publish` verifies the chain for a single plan: plan exists → acceptance criteria have evidence references → evidence note exists → evidence note links back to plan → close decision has rationale
- [ ] For each done plan, the verifier checks: (1) plan file exists in `done/`, (2) plan has acceptance criteria, (3) each AC checkbox is marked `[x]` with an evidence reference (or explicitly marked `N/A`), (4) if plan references a run ID, `.osc/runs/<run_id>/` exists, (5) if plan references a PR, the PR reference is syntactically valid (URL or `#NN`), (6) if an evidence note exists for the plan, it cites the plan slug, (7) the close decision in the evidence note or plan is one of: approved, weak_approved, rejected, blocked
- [ ] `--json` outputs a JSON array of findings with: plan_slug, links (array of {type, reference, status, detail})
- [ ] `--strict` mode: exit code 1 if any link is `broken` or `missing` (not just `unverifiable`)
- [ ] Default mode: exit code 1 only for `broken` links; `missing` and `unverifiable` produce warnings but exit 0
- [ ] Verifier handles plans with no evidence (reports "no evidence links found" for that plan, not an error)
- [ ] Verifier handles plans with no run ID (skips run packet check, reports "no run reference" as informational)
- [ ] All existing tests pass; new chain verifier tests cover all link statuses

## Verification steps

1. **Intact chain:** Pick a done plan with full evidence (e.g., 050-npm-publish). Run `osc verify --evidence-chain --plan 050-npm-publish`. Verify all links intact.
2. **Broken chain:** Manually create a plan that references a nonexistent evidence note. Run `osc verify --evidence-chain --strict`. Verify exit code 1, broken link reported.
3. **Missing evidence:** Create a plan with unchecked AC checkboxes (`[ ]`). Run `osc verify --evidence-chain`. Verify "missing evidence" reported for those ACs.
4. **External link:** Create a plan with a PR reference like `https://github.com/owner/repo/pull/99` (URL, not local file). Run `osc verify --evidence-chain`. Verify link is `unverifiable`, not `broken`.
5. **JSON output:** Run `osc verify --evidence-chain --json | jq '.links | group_by(.status)'`. Verify correct status distribution.
6. **Full project:** Run `osc verify --evidence-chain` on the entire open-scaffold repo. Verify reasonable counts (50+ done plans, hundreds of links, mostly intact).

## Open questions

- Should `osc verify --evidence-chain` also validate that evidence notes aren't stale (e.g., saying "pending" while citing a merged PR)? This is partially covered by `verify.sh --strict` Check 9 (release note stale-state detection). The chain verifier could deepen this: check that the evidence note's Outcome section doesn't contradict its Traceability section. Defer to a follow-up — keep v1 focused on chain integrity.
- Should the chain verifier be integrated into `verify.sh` as a new tier (`--evidence-chain`) or stay as a separate `osc` command? Stay as `osc verify --evidence-chain` — the shell script is already long and complex. The chain verifier requires plan parsing logic that's impractical in bash.
- Should links to GitHub PRs and issues be verified via API? This would require network access and a GitHub token, violating the local-only constraint. The `unverifiable` status is the correct handling — it tells the user "this link exists but I can't check it from here."
