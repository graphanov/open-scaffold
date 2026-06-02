# First work-record flow

`osc first-run` creates one small, valid Open Scaffold path in an existing repository without launching a runtime or calling a network service. It supports an interactive prompt (`osc first-run`) and a deterministic non-interactive mode for tests, demos, and automation.

Use it when a repo needs the minimum durable record before AI-assisted work starts:

```bash
npx open-scaffold@latest first-run \
  --non-interactive \
  --slug first-work-record \
  --mission "Describe what this repository is trying to accomplish." \
  --goal "Complete one reviewed local change."
```

In a source checkout:

```bash
npm run osc -- first-run \
  --non-interactive \
  --slug first-work-record \
  --mission "Describe what this repository is trying to accomplish." \
  --goal "Complete one reviewed local change."
```

## What it creates

If the current directory is not already an Open Scaffold repo, `first-run` adds the min-tier scaffold in brownfield mode. Then it creates or validates:

- `MISSION.md` with the supplied mission text;
- `.osc/plans/active/<slug>.md` with acceptance criteria and verification placeholders;
- `.osc/releases/<date>-<slug>.md` as an evidence skeleton;
- next commands for plan validation, trace, evidence editing, close, and evidence-chain verification.

## What it does not do

`first-run` is local and structural. It does not:

- launch an agent or runtime;
- call provider APIs;
- deploy;
- publish npm;
- create a GitHub Release;
- commit, push, open a PR, or merge;
- prove semantic correctness or compliance.

## Recommended follow-through

After `first-run` creates the files:

```bash
osc plan validate first-work-record --strict
osc trace first-work-record
# edit .osc/releases/<date>-first-work-record.md with real verification output
osc close first-work-record --message "verified first work-record path"
osc verify --evidence-chain --plan first-work-record --strict
```

The final evidence-chain command is meaningful after the plan is closed to `.osc/plans/done/`.
