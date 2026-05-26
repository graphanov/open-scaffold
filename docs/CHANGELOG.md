# Open Scaffold changelog

This is a curated human-readable changelog. It compresses the detailed `MISSION.md` changelog, `.osc/releases/` evidence notes, GitHub PR history, and GitHub Releases into adoption-facing release groups.

For live package truth, check npm. For live release truth, check GitHub Releases. Repository evidence notes describe what was prepared; publication still depends on owner-gated npm and GitHub Release actions.

## v1.0.1 — No-spawn Codex handoff entry

Status: repository candidate prepared; npm publication and GitHub Release latest movement are owner-gated external actions.

Highlights:

- Adds `osc start <plan> --runtime codex` as a no-spawn prompt renderer for Codex/OMX workers.
- Keeps runtime execution outside Open Scaffold core: no process spawn, no `.osc/runs` write, no commit/push/PR/publish side effects.
- Documents the first shipped step in the post-v1 Codex-first runtime adoption chain.

Evidence:

- Plan: `.osc/plans/done/101-osc-start-codex-agent-entry.md`
- Evidence note: `.osc/releases/2026-05-26-101-osc-start-codex-agent-entry.md`
- PR: pending owner review

## v1.0.0 — Stable protocol release candidate

Status: repository candidate merged; npm publication and GitHub Release latest movement are owner-gated external actions.

Highlights:

- Defines the v1.0.0 stability contract in `docs/STABILITY.md`.
- Adds a landing page at `docs/index.html` for the 30-second explanation: problem, audience, first command.
- Promotes the stable surface: scaffold state folders, 7-section plans, mission/roadmap/evidence files, `verify.sh`, and day-two CLI commands.
- Separates experimental surfaces: runtime profiles, MCP, cockpit webhooks, task database helpers, dashboards, runtime packages, and future native spawning.
- Keeps npm publication, GitHub Release latest movement, and any launch announcement as owner gates.

Evidence:

- Plan: `.osc/plans/done/069-v1-launch.md`
- Evidence note: `.osc/releases/2026-05-25-v1-launch.md`
- PR: https://github.com/graphanov/open-scaffold/pull/113

## v0.4.x — Adoption, package, and operating-surface hardening

The v0.4 line turned the initial protocol into something users can install, test, and operate.

Notable releases:

- v0.4.18 — security posture and dependency maintenance.
- v0.4.17 — glass cockpit webhooks for push-only Discord and Slack status surfaces.
- v0.4.16 — local task database CLI.
- v0.4.14 — optional read-only MCP server interface.
- v0.4.13 — visible evolution-loop comparison.
- v0.4.12 — README framing around work records and evolution ledgers.
- v0.4.11 — local adoption metrics CLI.
- v0.4.10 — runtime OMX evolution-ledger bridge.
- v0.4.9 — closed evolution-loop contract.
- v0.4.7 — automated evidence collection and CLI help hardening.
- v0.4.6 — `osc run --dry-run` preview.
- v0.4.5 — plan templates and plan validation.
- v0.4.4 — interactive plan wizard package sync.
- v0.4.3 — brownfield init package sync.
- v0.4.2 — public package surface sync.
- v0.4.1 — first-run adoption hardening.

Themes:

- The npm path became real and repeatedly verified with `npx` smokes.
- Existing-repo adoption improved through brownfield init.
- Plan authoring improved through templates, validation, and a wizard.
- Evidence and lifecycle helpers became practical CLI surfaces.
- Evolution-ledger mechanics made repeated attempts visible instead of hidden in chat.
- Optional operating surfaces grew around the repo protocol without becoming source-of-truth layers.

## v0.3.0 — Runtime-neutral semi-autonomous protocol baseline

v0.3.0 established the first public baseline for Open Scaffold as a runtime-neutral repo-native protocol.

Highlights:

- Formalized `.osc/releases/` as release/evidence notes.
- Closed the stale foundational generic core plan into durable done-state evidence.
- Added stricter local checks for stale active state and release-evidence quality.
- Published the runtime-neutral self-dogfood baseline as a GitHub Release.

Evidence:

- Release: `v0.3.0 — Runtime-neutral semi-autonomous protocol baseline`
- Evidence: `.osc/releases/2026-05-12-v0.3.0-runtime-neutral-baseline.md`

## v0.2.x — Self-dogfood proof and protocol documentation

The v0.2 phase was primarily a public proof phase before the first durable package baseline.

Highlights:

- Proved the roadmap → issue/task → plan → run packet → PR → Codex review → verification → evidence chain.
- Added the slice close protocol, glass cockpit protocol, task/run model, GitHub workflow, and runtime binding contract.
- Clarified that chat surfaces and runtime transcripts are operating surfaces, not canonical truth.
- Preserved Open Scaffold core as non-spawning while making adapter handoff boundaries explicit.

Representative artifacts:

- `docs/SLICE_CLOSE_PROTOCOL.md`
- `docs/GLASS_COCKPIT_PROTOCOL.md`
- `docs/TASK_RUN_MODEL.md`
- `docs/GITHUB_WORKFLOW.md`
- `docs/RUNTIME_BINDING_CONTRACT.md`
- `.osc/releases/2026-05-12-self-dogfood-release-loop.md`

## v0.1.x — Mission, ontology, and scaffold foundation

The v0.1 phase established the shape of the project.

Highlights:

- Defined Open Scaffold as a runtime-neutral, repo-native operating system for agent-orchestrated development.
- Established mission, roadmap, plan folders, amendments, close protocol, and verification scripts.
- Clarified the ontology between Open Scaffold core, orchestrators/agents, runtime harnesses, task/state bridges, operator surfaces, and GitHub.
- Set the rule that durable truth lives in repository files and GitHub artifacts, not vanished chat context.

Representative artifacts:

- `MISSION.md`
- `ROADMAP.md`
- `.osc/RULES.md`
- `.osc/plans/WORKFLOW.md`
- `AGENTS.md`
- `CLAUDE.md`
