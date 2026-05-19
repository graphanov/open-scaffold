# Minimum Viable Scaffold

Open Scaffold can look larger than it is because this repository also contains the product's own roadmap, tests, examples, release notes, and dogfood history. A fresh project does not need to understand or keep every artifact from this Open Scaffold repo on day one.

The minimum viable scaffold is the smallest repo state that lets a human and an agent answer:

```text
What are we building?
What is the current slice?
How will we verify it?
What evidence proves it closed?
```

## The five-step adoption path

Start by adding the amount of scaffold your repo needs with npm. Use `--target .` for the current repo, or `--target my-app` for a project folder:

```bash
npx open-scaffold init --tier min --target <repo>
# or: --tier standard / --tier max
```

Source checkout fallback:

```bash
git clone https://github.com/graphanov/open-scaffold open-scaffold
cd open-scaffold
npm install
npm run build
node dist/cli.js init --tier min --target <repo>
# or: --tier standard / --tier max
```

Use `min` for the smallest durable loop, `standard` for the recommended day-one repo, and `max` only when the project already needs GitHub, runtime, or status/control-room protocol docs. The command writes only local files and refuses to overwrite existing files unless `--force` is supplied.

## Brownfield adoption

Most useful projects already have source files, package manifests, README content, and CI conventions. Use the explicit brownfield flag when adding Open Scaffold to an existing repo:

```bash
npx open-scaffold init --from-existing --tier min --target .
# source checkout fallback: node dist/cli.js init --from-existing --tier min --target .
```

Brownfield init currently supports the `min` tier only. That keeps adoption safe and additive: advanced standard/max docs can be added manually later, but the first brownfield command will not replace user-owned README, roadmap, or docs content.

It detects common project markers (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, and workspace files), writes a mission draft that names the detected project type, and adds scaffold files around the existing project. It does not edit package manifests, source trees, lockfiles, README content, or CI files. If scaffold-owned paths such as `MISSION.md`, `.osc/`, `AGENTS.md`, or `CLAUDE.md` already exist, it refuses and lists the conflicts; use `--force` only when you intend to replace those scaffold-owned files.

Then follow the loop:

1. **Define mission** — run `./bootstrap.sh` or edit `MISSION.md` until the project-specific mission is real.
2. **Create one active plan** — run `osc plan new <slug> --stage active` (or `npx open-scaffold plan new <slug> --stage active` without a local install), then fill the TODO prompts with a real goal, acceptance criteria, and verification. Shell fallback: copy `.osc/plans/handoff-template.md` into `.osc/plans/active/<slug>.md` and fill it manually.
3. **Execute and verify** — make the change, run the project test/check, then run `./verify.sh --standard`.
4. **Record evidence** — run `osc evidence new <slug>` (or `npx open-scaffold evidence new <slug>`) to create `.osc/releases/<date>-<slug>.md`, then replace the TODO prompts with what changed, which plan it closed, what command/test ran, and the result. Shell fallback: create the evidence note manually under `.osc/releases/`.
5. **Amend or close** — when new learning changes the plan, run `osc amend <slug> --message "<what changed>"` (or `npx open-scaffold amend <slug> --message "<what changed>"`) and fill the amendment TODOs. When the slice is verified, run `osc close <slug> --message "<what shipped>"` (or `npx open-scaffold close <slug> --message "<what shipped>"`) so the plan moves to `done/` and `MISSION.md` is stamped. Shell fallback: use `./amend.sh <slug>` and `./close.sh <slug> --message "<what shipped>"`.

The payoff appears in the next session. If someone opens the repo later with no chat history, they can read `MISSION.md`, `.osc/plans/active/`, `.osc/plans/done/`, and `.osc/releases/` to see what the project is, whether work is still active, what was verified, and whether the next action is to continue, stop, or write a new plan.

Everything else is optional until the project needs it.

For day one, keep five things in view: `MISSION.md`, one active plan in `.osc/plans/active/`, a verification command, one evidence note in `.osc/releases/`, and `close.sh` to move the plan to `done/`.

## Core vs optional artifacts

### Root-level files

| Artifact | Minimum status | Why it exists | Day-one action |
|---|---:|---|---|
| `MISSION.md` | Required | Project direction, goals, non-goals, and changelog. | Replace template/product text with the downstream project's real mission. |
| `.osc/` | Required | Scaffold namespace for plans, releases, runs, and research. | Keep the required subfolders below. |
| `docs/` | Recommended | Deeper guidance beyond the README. | Keep the docs that match the project's maturity; label advanced protocols optional. |
| `.github/` | Optional | Issue/PR templates and CI workflows. | Keep when using GitHub review/CI. |
| `examples/` | Optional | Worked examples and smoke fixtures. | Keep only clearly labeled examples; do not confuse them with live project state. |
| `README.md` | Recommended | Human landing page for the downstream project. | Make it describe the user's project, not Open Scaffold itself. |
| `AGENTS.md` | Recommended | Agent operating instructions for tools that read AGENTS files. | Keep if agents will work in the repo; update project facts. |
| `CLAUDE.md` | Recommended | Claude Code paired view of `AGENTS.md`. | Keep if Claude Code will work in the repo; mirror edits with `AGENTS.md`. |
| `.gitignore` | Recommended | Keeps runtime/log/build artifacts out of git. | Keep and extend for project tooling. |
| `verify.sh` | Required | Zero-dependency scaffold verification. | Run before claiming a meaningful slice done. |
| `bootstrap.sh` | Recommended | Day-zero mission/directory bootstrap. | Use once; safe to keep. |
| `close.sh` | Required | Moves plans to `done/` and stamps changelog. | Use for every shipped plan. |
| `amend.sh` | Recommended | Captures legitimate plan changes without rewriting committed plans. | Use when scope changes. |
| `delegate.sh` | Optional | Generates prompts from plans for manual/agent delegation. | Keep only if using prompt-based delegation. |
| `ROADMAP.md` | Optional for tiny projects; recommended once work spans multiple slices. | Longer-term direction and milestones. | Start small or omit until needed. |
| `LLM_QUICKSTART.md` | Optional | Extra agent quickstart. | Keep if useful; otherwise docs can point to `AGENTS.md`. |
| `package.json`, `package-lock.json`, `tsconfig.json`, `src/`, `tests/`, `dist/` | Product/CLI implementation, not required for every downstream project. | Open Scaffold's own CLI/test harness or a Node-based downstream project. | Keep only if the downstream project uses this toolchain or needs the `osc` CLI from source. |
| `LICENSE` | Recommended | Legal reuse terms. | Keep or replace with the downstream project's license. |

### Required `.osc/` directories

| Directory | Minimum status | Why it exists | Day-one state |
|---|---:|---|---|
| `.osc/plans/active/` | Required | Current work. | Empty except `.gitkeep` until the first plan is created. |
| `.osc/plans/backlog/` | Required | Future work that is not active. | Empty or a tiny set of accepted future plans. |
| `.osc/plans/done/` | Required | Completed plans. | Empty except `.gitkeep` in a blank downstream project. |
| `.osc/plans/blocked/` | Required | Parked work waiting on input/dependency. | Empty except `.gitkeep`. |
| `.osc/plans/handoff-template.md` | Required | Seven-section plan template. | Keep. |
| `.osc/plans/WORKFLOW.md` | Required | Folder state machine. | Keep. |
| `.osc/releases/` | Required | Evidence/release notes. | Keep `README.md`; add notes when slices close. |
| `.osc/runs/` | Optional / debug-only until promoted | Runtime logs and `run.json` work packages (run packets). | Usually ignored or empty until a run package is created. Do not treat raw runs as public truth. |
| `.osc/research/` | Optional / decision support | Research, drafts, issue imports, private-to-public staging. | Not required for first use; promote only curated conclusions. |
| `.osc/specs/` | Optional | Larger specs before they become plans. | Use only when a plan is too small for the requirement shape. |
| `.osc/state/` | Optional / local runtime state | Local state for tools. | Keep ignored unless explicitly promoted. |

## Fresh project state vs Open Scaffold repo state

A blank project should not inherit Open Scaffold's own product history as if it were the user's project.

Use this rule:

```text
Template structure can be copied.
Product history must be reset, removed, or clearly labeled as example material.
```

For a fresh project:

- `MISSION.md` should describe your project.
- `.osc/plans/active/`, `done/`, `backlog/`, and `blocked/` should not contain Open Scaffold product plans unless they are explicitly examples.
- `.osc/releases/` should not contain Open Scaffold's release history as live truth for your project.
- `.osc-dev/` should not exist.
- `examples/` may contain examples, but example artifacts must be clearly labeled and not confused with active project state.

The lifecycle smoke at `examples/lifecycle-e2e-smoke/` is intentionally an example fixture, not the maintainer repo's live state.

## Optional / advanced protocols

| Protocol or concept | Status | Use when |
|---|---:|---|
| Amendments | Recommended once plans are committed | New information changes scope or acceptance criteria. |
| Work packages (run packets) | Optional / advanced | A harness, coordinator, or human lane needs a bounded `run.json` handoff package. |
| Execution strategy in plans | Optional | Work can be decomposed into dependent/parallel groups. |
| Status/control-room events (glass cockpit events) | Optional / integration | Discord/Slack/Telegram/GitHub comments need structured status and approval events. |
| Runtime adapter contract (runtime binding contract) | Optional / adapter-specific | OMC, OMX, Claude Code, Codex, or another runtime consumes `run.json` work packages. |
| GitHub issue/PR traceability | Recommended for public/versioned work | The work should be reviewed or reconstructed through GitHub. |
| `osc` CLI | Optional / richer tooling | Node is available and the project wants parsed status/run artifacts or tiered initialization. Shell scripts remain the day-zero floor. |
| `.osc/research/` | Optional / decision support | Research needs to be saved before a curated decision/release note exists. |

## When Open Scaffold is overkill

Skip the full scaffold when the task is:

- a disposable one-off script;
- a prototype you are comfortable throwing away;
- a single-session change with no need for later reconstruction;
- a private scratchpad where evidence and handoff do not matter.

Use the scaffold when losing context would be expensive.

## First-user checklist

Before inviting an agent or teammate into a new downstream repo, check:

- [ ] `MISSION.md` is project-specific.
- [ ] `.osc/plans/active/` has one current plan before first verification.
- [ ] `.osc/plans/done/` does not contain unrelated maintainer history.
- [ ] `.osc/releases/` contains only downstream evidence or clearly labeled examples.
- [ ] `./verify.sh --standard` passes.

If those are true, the repo is minimally scaffolded.
