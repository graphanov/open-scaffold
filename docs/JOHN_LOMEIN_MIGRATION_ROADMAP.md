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

Open Scaffold has landed the harness runtime chain through reproduction proof and team/control-room adapter parity:

| Item | Current value |
| --- | --- |
| Foundation PR | graphanov/open-scaffold#192 |
| Runtime parity PR | graphanov/open-scaffold#194 |
| Feedback/handoff parity PR | graphanov/open-scaffold#195 |
| Reproduction proof PR | graphanov/open-scaffold#196 |
| Team/control-room adapter PR | graphanov/open-scaffold#197 |
| Closed plans | `.osc/plans/done/154-harness-command-surface.md`, `.osc/plans/done/155-controlled-runtime-parity.md`, `.osc/plans/done/156-feedback-handoff-improvement-parity.md`, `.osc/plans/done/157-reproduction-proof-parity.md`, `.osc/plans/done/158-team-control-room-adapter-parity.md` |
| Status | Plans 154-158 are merged; plan 159 is active at `.osc/plans/active/159-harness-release-readiness.md`. |
| What it proves | Open Scaffold now has the `$interview`, `$plan`, `$work`, and `$team` command surface, controlled runtime receipts, feedback/improvement loop, handoff lab, benchmark/proof-gate machinery, and team/control-room status contracts. |
| What it does not prove yet | Public package/release readiness is not complete, and broad dominance claims remain gated by Open Scaffold-run proof evidence. |

The important boundary is this:

> PR #192 was the foundation PR. PRs #194-#197 landed the runtime, feedback/handoff, reproduction, and team/control-room slices. Plan 159 is the active release-readiness step; it still does not authorize npm publish, GitHub Release updates, or broad dominance claims without owner gates.

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
| #192 | `154-harness-command-surface` | `feat/harness-command-surface` | `feat: add harness command surface` | Establish `$interview`, `$plan`, `$work`, `$team`, backend CLI, status/events, feedback model, handoff lab, simulated proof smoke, and docs. | Merged; plan 154 moved to `done/`. |
| #194 | `155-controlled-runtime-parity` | `feat/controlled-runtime-parity` | `feat: add controlled runtime parity` | Make `$work` run a bounded Codex/agent adapter with strict marker parsing, receipts, timeouts, human gate pause/resume, and safe artifact handling. | Merged; plan 155 moved to `done/`. |
| #195 | `156-feedback-handoff-improvement-parity` | `feat/feedback-handoff-improvement-parity` | `feat: wire feedback and handoff improvement loop` | Make feedback, repair hypotheses, accepted improvements, retries, and compact handoffs part of real `$work`/`$team` flows. | Merged; plan 156 moved to `done/`. |
| #196 | `157-reproduction-proof-parity` | `feat/harness-reproduction-proof-parity` | `feat: reproduce source prototype proof lanes` | Run Open Scaffold-owned reproduction suites: targeted handoff, representative live fixtures, ablations, and strict proof report. | Merged; plan 157 moved to `done/`. |
| #197 | `158-team-control-room-adapter-parity` | `feat/team-control-room-adapter-parity` | `feat: add team and control-room adapter contracts` | Make `$team` a real coordinated multi-worker harness and expose transport/status contracts for Hermes/plugin/desktop surfaces. | Merged; plan 158 moved to `done/`. |
| #199 expected | `159-harness-release-readiness` | `docs/harness-release-readiness` | `docs: prepare harness release readiness` | Polish public docs, examples, command maturity, package/release notes, and owner gates after the harness actually works. | Help/build/test/strict/secret-scan checks pass; publish/release remain owner-gated. |

## When each PR starts

1. **PR #192 is merged.** The foundation is on `main`; plan 154 is closed in `done/`.
2. **Controlled runtime parity starts after the closeout PR lands.** Base `feat/controlled-runtime-parity` on fresh `main`; GitHub may assign a number other than the old planning slot because the closeout PR used the next number.
3. **Feedback/handoff improvement starts after controlled runtime parity** because feedback/retry must attach to the real runtime receipt shape.
4. **Reproduction proof followed feedback/handoff improvement** because reproduction must test the real runtime plus feedback/handoff loop, not a standalone smoke fixture.
5. **Team/control-room adapter parity landed after reproduction proof** so `$team` has a shared status/evidence/postflight path.
6. **Harness release readiness is last.** Do not polish release copy before the runtime and proof story are true; do not publish or create/update releases without owner approval.

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

## PR #192 closeout

PR #192 is closed:

- CI was green before merge.
- The PR body linked this roadmap and the follow-up backlog plans.
- The foundation landed without claiming full runtime reproduction.
- Plan 154 now lives at `.osc/plans/done/154-harness-command-surface.md` with internal status `done`.

Next work starts from fresh `main` after the closeout PR is merged.

## Owner gates

These actions remain owner-gated for every PR in the chain:

- merge PRs,
- publish npm,
- create or update GitHub Releases,
- force-push shared/protected branches,
- claim broad dominance,
- run expensive full live reproduction if cost/runtime is not acceptable.
