# Downstream proof: tally

Open Scaffold is heavily dogfooded — this repository keeps its own plans, evidence, and releases under `.osc/`. A fair skeptic still asks: *does anything outside this repo actually use it?*

This page answers that with one small, inspectable example you can read in a couple of minutes.

> Provenance: **owner-created**. `tally` was built by the same owner as Open Scaffold as an honest reference example. It is dogfood outside the core repo, not third-party adoption.

## What tally is

[`tally`](https://github.com/graphanov/tally) is a tiny habit/streak tracker CLI (TypeScript, zero runtime dependencies). It is a real, standalone tool — not an `example-` folder inside this repo. Open Scaffold was added to it the same way any adopter would: from a fresh `npx open-scaffold@latest` against an existing project.

## The chain you can reconstruct

One real feature — a `tally streak <habit>` command plus `tally list --json` — was carried through the full Open Scaffold lifecycle in the tally repo:

```text
brownfield init  ->  MISSION.md  ->  plan  ->  code change + tests  ->  evidence note  ->  close  ->  PR
```

Every step left a durable artifact you can open:

| Step | Artifact (in `graphanov/tally`) |
|---|---|
| Added Open Scaffold to an existing repo | `npx open-scaffold@latest init --from-existing --tier min --target .` |
| Mission | [`MISSION.md`](https://github.com/graphanov/tally/blob/main/MISSION.md) |
| Plan | [`.osc/plans/done/streak-and-json.md`](https://github.com/graphanov/tally/blob/main/.osc/plans/done/streak-and-json.md) |
| Code change | [`src/streak.ts`](https://github.com/graphanov/tally/blob/main/src/streak.ts) + [`tests/streak.test.ts`](https://github.com/graphanov/tally/blob/main/tests/streak.test.ts) |
| Evidence note | [`.osc/releases/2026-05-30-streak-and-json.md`](https://github.com/graphanov/tally/blob/main/.osc/releases/2026-05-30-streak-and-json.md) |
| Closeout (plan → `done/`, mission changelog stamp) | `./close.sh streak-and-json` |
| Pull request | [`graphanov/tally#1`](https://github.com/graphanov/tally/pull/1) |

## Reproduce the inspection

```bash
git clone https://github.com/graphanov/tally
cd tally
npm install
npm test            # 2 files / 15 tests
./verify.sh --standard
npx open-scaffold@latest trace streak-and-json
```

The `trace` output reconstructs the slice — goal, acceptance criteria, and the evidence note that cites the plan — straight from the repo, with no chat history.

## What this proves (and what it does not)

- **Proves:** Open Scaffold can be added to an existing, unrelated project and used to plan, execute, verify, and close a real change, leaving a reconstructable work record.
- **Does not prove:** automatic correctness, third-party endorsement, or that every future change is right. It demonstrates *reconstructability*, not certification.

Friction discovered while building tally is recorded as follow-up backlog in this repo rather than hidden, keeping the example honest.
