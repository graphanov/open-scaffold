# Start Here

The single first action for a developer or AI agent entering this repository cold.

## What is Open Scaffold?

Open Scaffold keeps a repo-native work record for AI-assisted work — goal, plan, attempts, evidence, approvals, lessons — as git-tracked, observed-fact files, and turns it into three things: a handoff packet (`osc handoff`) so a fresh session, a smaller model, or a person resumes from truth instead of inventing history; review (`osc review`, with `osc analyze` as a synonym) and a gate (`osc gate`) so cheap or locally-hosted models can judge recorded work and authorize or block the next attempt. It never runs or disciplines your workflow — you work however you already work; the record accumulates around it.

Current readiness boundary: Open Scaffold is a pre-1.0 repo record layer. A generated skeleton or passing structural check does not prove that the implementation works, meets a compliance standard, or is ready for production. Record project-specific checks and their actual results. [`PROOF_HARNESS.md`](PROOF_HARNESS.md) and [`STABILITY.md`](STABILITY.md) provide optional background on proof and maturity.

## The one first action

You need Node.js 24 or newer and npm (the package also supports Node 20.19+ and 22.12+ within those release lines). From the root of the repo you want to scaffold:

```bash
npx open-scaffold@latest first-run
```

Three guided questions produce the minimum work record — `MISSION.md`, one active plan with acceptance criteria, an evidence skeleton — and print the commands to run next. The command writes local scaffold files; fetching the npm package may need network access. No GitHub account, remote document reading, or agent runtime is required. If existing scaffold-owned files conflict, preserve them and review the reported conflicts before initialization.

`npx` runs the package for this invocation; it does **not** install the `osc` command on your PATH. Continue with `npx open-scaffold@latest <command>` throughout this guide. If you prefer the shorter `osc` commands used elsewhere in the docs, first install the CLI:

```bash
npm install --global open-scaffold@latest
osc --help
```

To keep different sessions on the same CLI version, replace `@latest` with the same explicit package version in each session, or use an already installed version.

When invoked through `npx`, handoff-generated scaffold commands use the running package's exact version, such as `npx open-scaffold@0.35.0 plan validate <slug> --strict`. Project-authored verification commands remain unchanged; review their prerequisites separately.

Review the generated mission and plan before their first commit. Fill or refine the new plan's goal, files, criteria, and verification steps while it is an uncommitted draft. The first-run plan starts as a small structural exercise; its evidence skeleton needs real results. After the plan is committed, changes to its intended work belong in an amendment.

From there, the working grammar is the lifecycle helpers (`osc plan new`, `osc evidence new`, `osc amend`, `osc close`) plus the three-command front door:

```bash
npx open-scaffold@latest handoff --plan <slug>  # pin the work being resumed
npx open-scaffold@latest review <loop-dir>    # review recorded attempts
npx open-scaffold@latest gate <loop-dir>      # authorize or block the next attempt
```

Review/gate loops are optional for the first handoff. For a new review/gate loop, create `<loop-dir>` first with `npx open-scaffold@latest evolve init .osc/plans/active/<plan>.md --out .osc/evolution/<loop-id>`.

## Your first session-to-session handoff

Use the exact slug created by `first-run` in place of `<slug>` below.

1. Validate the new plan: `npx open-scaffold@latest plan validate <slug> --strict`.
2. Preview its handoff: `npx open-scaffold@latest handoff --plan <slug>`. Confirm that the goal and criteria match the work you intended.
3. Do one bounded piece of work. Run its verification commands and add the actual results to the generated `.osc/releases/<date>-<slug>.md` evidence note. Record remaining work, questions, and the next action there. A failed or skipped check belongs in the record too. For each verified criterion, mark its checkbox complete and append ` | Evidence: .osc/releases/<date>-<slug>.md`, preserving the original criterion wording.
4. Run `npx open-scaffold@latest verify` and `./verify.sh --standard`. These check the record's structure; use the project's own tests or review to check the work itself.
5. Review the diff and preserve the local work record in git according to the project's process. Keep the plan active when work remains. For scope changes, use `npx open-scaffold@latest amend <slug> --message "<what changed>"` and fill the new amendment before committing.

Start the next session in the same repo with:

```bash
npx open-scaffold@latest handoff --plan <slug>
npx open-scaffold@latest trace <slug>
```

Read the selected plan, its amendments in order, and the latest evidence note before continuing. Pinning `--plan` matters when several workers have active plans. The packet summarizes recorded state; the next reader should verify the evidence behind completion claims.

When all criteria are met and real evidence is recorded, record the actual review/approval decision and its rationale in the evidence note's `approval.status` and `approval.rationale` fields. Close with `npx open-scaffold@latest close <slug> --message "<what shipped>"`, then update the evidence note's Plan reference to `.osc/plans/done/<slug>.md`. Evidence-chain verification applies **after** closure: `npx open-scaffold@latest verify --evidence-chain --plan <slug> --strict`. Its strict checks require completed checkboxes, linked evidence for each criterion, and a close decision, not just a generated skeleton; it remains a structural check and does not decide approval for you.

## See the core trick before adopting

Zero-context resume is the point. Explore [`../examples/resume-demo/`](../examples/resume-demo/) — a committed mid-flight project snapshot: one active plan with unchecked acceptance criteria, one amendment, one closed slice, and an evidence note. Everything a fresh agent needs to continue bounded work without any chat history. The narrated path is [`RESUME_WALKTHROUGH.md`](RESUME_WALKTHROUGH.md).

From an Open Scaffold source checkout, compare two recorded attempts:

```bash
npx open-scaffold@latest compare \
  examples/attempt-compare/attempt-a \
  examples/attempt-compare/attempt-b
```

Those example paths belong to the source checkout. A downstream project initialized with the minimum tier does not contain them.

## Where to go next

| I want to… | Go to |
|---|---|
| Understand the mission and goals | [`MISSION.md`](../MISSION.md) |
| Learn the review-and-gate loop | [`EVOLUTION_LOOP.md`](EVOLUTION_LOOP.md) |
| Connect an MCP-capable coding agent | [`MCP.md`](MCP.md) |
| See the current workflow map | [`WORKFLOW.md`](WORKFLOW.md) |
| Understand runtime/execution boundaries | [`TRUST_BOUNDARIES.md`](TRUST_BOUNDARIES.md) and [`RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md) |
| Check what is stable vs experimental | [`STABILITY.md`](STABILITY.md) |
| Understand the version story | [`STABILITY.md#release-status`](STABILITY.md#release-status) |
| Look up unfamiliar terms | [`GLOSSARY.md`](GLOSSARY.md) |
| Read the system boundary map | [`OPEN_SCAFFOLD_SYSTEM.md`](OPEN_SCAFFOLD_SYSTEM.md) |

## Why this exists

AI-assisted work often dissolves into chat logs, terminal sessions, and PR comments. Weeks later, nobody can reconstruct what was asked, what changed, what was verified, or who approved it.

Open Scaffold makes the repository the shared memory:

```text
MISSION.md
  -> .osc/plans/...
  -> .osc/runs/<run_id>/run.json or amendment
  -> verification
  -> .osc/releases/...
  -> next slice
```

The scaffold helps when losing context is expensive: multi-session AI work, client delivery, audit-sensitive handoffs, and multi-agent review. It is overkill for disposable one-off scripts or clean single-session tasks.

## Adopt the minimum scaffold

Greenfield:

```bash
npx open-scaffold@latest init --tier min --target <repo>
# or: --tier standard / --tier max
```

Brownfield:

```bash
npx open-scaffold@latest init --from-existing --tier min --target .
```

Source checkout fallback:

```bash
git clone https://github.com/graphanov/open-scaffold open-scaffold
cd open-scaffold
npm install
npm run build
node dist/cli.js init --tier min --target <repo>
```

Minimum loop:

1. Define `MISSION.md`.
2. Create one active plan with acceptance criteria and verification: `npx open-scaffold@latest plan new <slug> --stage active`, or `osc plan new <slug> --stage active` after installing the CLI. Fill the generated draft before its first commit. If neither the CLI nor a supported shell helper can create a plan, copy `.osc/plans/handoff-template.md` into `.osc/plans/active/<slug>.md` and preserve its schema as the manual fallback.
3. Execute the slice and run project checks plus `./verify.sh --standard`.
4. Record evidence with `npx open-scaffold@latest evidence new <slug>` or `osc evidence new <slug>`, then fill the generated note with verified outcomes.
5. Amend when learning changes committed intent with `npx open-scaffold@latest amend <slug> --message "<what changed>"` / `osc amend <slug> --message "<what changed>"`; close when verified with `npx open-scaffold@latest close <slug> --message "<what shipped>"` / `osc close <slug> --message "<what shipped>"`. If the CLI is unavailable, use `./amend.sh <slug>` or `./close.sh <slug> --message "<what shipped>"` when shipped in the repo. The minimum tier has `close.sh`; the standard/max tiers also have `amend.sh`.

CLI helpers come first, supported shell helpers next, and schema-preserving manual records only when neither is available for the operation. Manual fallback must preserve numbering, stage folders, amendment sequence, and changelog links. Supported lifecycle helpers may update Status and stage. Factual checklist completion and reserved ` | Evidence: <reference-only-list>` suffixes may be updated while preserving criterion wording; committed goal, scope, and criteria changes require amendments. Record detailed progress and unfinished work in evidence notes.

First-user checklist:

- `MISSION.md` is project-specific.
- `.osc/plans/active/` has one current plan before work starts.
- `.osc/plans/done/` does not contain unrelated maintainer history.
- `.osc/releases/` contains only downstream evidence or clearly labeled examples.
- `./verify.sh --standard` passes.
