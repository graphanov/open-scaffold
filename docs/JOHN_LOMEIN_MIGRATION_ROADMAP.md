# Source prototype migration roadmap

This is the working roadmap for finishing the John Lomein source-prototype migration into Open Scaffold.

John Lomein is provenance here, not product branding. The public Open Scaffold product remains a serious harness for AI-assisted work with four human-facing commands:

```text
$interview
$plan
$work
$team
```

## Current state

Open Scaffold has the first harness foundation PR open and green:

| Item | Current value |
| --- | --- |
| Current PR | graphanov/open-scaffold#192 |
| Branch | `feat/harness-command-surface` |
| Plan | `.osc/plans/active/154-harness-command-surface.md` |
| Status | Open, mergeable, CI passing |
| What it proves | Open Scaffold can host the command surface, event/status model, feedback files, handoff lab, simulated benchmark smoke, and strict proof gate. |
| What it does not prove yet | Open Scaffold has not yet reproduced the live John Lomein runtime signal. |

The important boundary is this:

> PR #192 is a foundation PR. It should be closed by owner review/merge, then followed by runtime and reproduction PRs. It should not be treated as the whole migration.

## End state

The migration is complete only when Open Scaffold can do this with Open Scaffold-owned commands, schemas, and evidence paths:

1. Clarify a messy request without guessing.
2. Turn it into a repo-native plan.
3. Run one controlled AI worker through `$work` with clear authority limits.
4. Pause for human input when context is missing.
5. Resume the same run after the answer.
6. Record evidence, receipts, status, and post-run notes under `.osc/...` paths.
7. Capture human/test/reviewer/runtime/benchmark feedback.
8. Turn that feedback into a repair hypothesis.
9. Retry or store an accepted lesson.
10. Let future runs inherit relevant accepted lessons.
11. Coordinate multiple workers through `$team` without losing one shared evidence record.
12. Produce compact handoff packets under a hard budget.
13. Run live reproduction suites with ablations.
14. Report whether Open Scaffold reproduced the source signal without overclaiming.

## PR chain

GitHub may assign a different number if another PR is opened first. The PR numbers below are planning slots: use the branch/title/plan association as the durable reference.

| PR slot | Plan | Branch | Title | Purpose | Merge gate |
| --- | --- | --- | --- | --- | --- |
| #192 | `154-harness-command-surface` | `feat/harness-command-surface` | `feat: add harness command surface` | Establish `$interview`, `$plan`, `$work`, `$team`, backend CLI, status/events, feedback model, handoff lab, simulated proof smoke, and docs. | Owner reviews and merges; then close plan 154. |
| #193 | `155-controlled-runtime-parity` | `feat/controlled-runtime-parity` | `feat: add controlled runtime parity` | Make `$work` run a bounded Codex/agent adapter with strict marker parsing, receipts, timeouts, human gate pause/resume, and safe artifact handling. | Live temp runtime smoke passes without committing runtime residue. |
| #194 | `156-feedback-handoff-improvement-parity` | `feat/feedback-handoff-improvement-parity` | `feat: wire feedback and handoff improvement loop` | Make feedback, repair hypotheses, accepted improvements, retries, and compact handoffs part of real `$work`/`$team` flows. | Failed/rejected run becomes a repair hypothesis; retry inherits it; handoff packet passes budget. |
| #195 | `157-reproduction-proof-parity` | `feat/harness-reproduction-proof-parity` | `feat: reproduce source prototype proof lanes` | Run Open Scaffold-owned reproduction suites: targeted handoff, representative live fixtures, ablations, and strict proof report. | Evidence says reproduced, partially reproduced, or not reproduced with raw paths and no broad claim unless gates clear. |
| #196 | `158-team-control-room-adapter-parity` | `feat/team-control-room-adapter-parity` | `feat: add team and control-room adapter contracts` | Make `$team` a real coordinated multi-worker harness and expose transport/status contracts for Hermes/plugin/desktop surfaces. | Multiple worker lanes share one status/evidence/postflight record and remain transport-agnostic. |
| #197 | `159-harness-release-readiness` | `docs/harness-release-readiness` | `docs: prepare harness release readiness` | Polish public docs, examples, command maturity, package/release notes, and owner gates after the harness actually works. | Fresh install/help smoke and release-readiness checks pass; publish/release remain owner-gated. |

## When each PR starts

1. **PR #192 is first.** It is already open and passing. Daniel decides whether to merge it.
2. **PR #193 starts after #192 merges** unless Daniel explicitly wants stacked work. If stacked, base #193 on `feat/harness-command-surface`; otherwise base it on fresh `main`.
3. **PR #194 starts after #193** because feedback/retry must attach to the real runtime receipt shape.
4. **PR #195 starts after #194** because reproduction must test the real runtime plus feedback/handoff loop, not a standalone smoke fixture.
5. **PR #196 can start after #193 if needed**, but it should land after #194 unless `$team` parity becomes the immediate blocker.
6. **PR #197 is last.** Do not polish release copy before the runtime and proof story are true.

## Reproduction ladder

Open Scaffold reproduction must use Open Scaffold-run evidence, not only source-prototype evidence.

| Stage | Command shape | Required before broad claim? | Expected result |
| --- | --- | --- | --- |
| A. Simulated smoke | `osc bench suite --mode simulated ...` | No | Checks schemas, reports, ablations, and proof gate behavior. |
| B. Handoff lab | `osc bench handoff-lab ...` | No | Tests deterministic handoff candidates and finds a budget-passing packet if available. |
| C. Targeted live handoff | `osc bench suite --mode live --fixture token-efficient-handoff-resume ...` | Yes for narrow handoff reproduction | Shows whether the Open Scaffold handoff compiler reproduces the compact handoff signal. |
| D. Representative live | `osc bench suite --mode live --fixture ... --include-ablations ...` | Yes for serious parity readout | Tests multiple source-like fixture classes with selected ablations. |
| E. Full live | `osc bench suite --mode live --include-ablations ...` | Yes for broad claims | Only worth running after C/D are meaningful and budget allows. |

If C/D/E do not reproduce the source signal, say so. If they reproduce only the compact handoff win, say that. If broad dominance remains mixed, keep it mixed.

## Claim ladder

Use this wording ladder in reports and docs:

| Evidence state | Allowed wording |
| --- | --- |
| Foundation only | "Open Scaffold has the harness foundation. Live source-signal reproduction has not run yet." |
| Simulated + handoff lab only | "Open Scaffold has local proof machinery and deterministic handoff smoke. Broad live parity is not proven." |
| Targeted live handoff passes | "Open Scaffold reproduced a narrow compact handoff signal on the targeted live fixture." |
| Representative live passes but ablations expose confounds | "Open Scaffold partially reproduced the source signal; broad dominance remains mixed / not proven." |
| Representative + full live + ablations pass strict gate | "Open Scaffold reproduced the source signal under the current proof gate." |

Never say Open Scaffold broadly beats naked Codex unless the Open Scaffold-run evidence clears live paired runs, enough fixtures, ablations, clean completions, no quality regression, no token/duration/round regression, and no prompt-quality or budget confound.

## PR #192 closeout gate

PR #192 can be considered ready for owner closeout when:

- CI remains green.
- The PR body links this roadmap and the follow-up backlog plans.
- Daniel accepts that #192 is the foundation, not the full reproduction.
- Daniel chooses merge or close. Hermes must not merge, publish, release, force-push, or rewrite history without explicit approval.

After #192 merges, immediately run the Open Scaffold plan closeout for plan 154 and move it to `done/` in a follow-up closeout commit/PR if branch protection requires it.

## Owner gates

These actions remain owner-gated for every PR in the chain:

- merge PRs,
- publish npm,
- create or update GitHub Releases,
- force-push shared/protected branches,
- claim broad dominance,
- run expensive full live reproduction if cost/runtime is not acceptable.
