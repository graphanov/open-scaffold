# Open Scaffold changelog

This is a curated human-readable changelog. It compresses the detailed `MISSION.md` changelog, `.osc/releases/` evidence notes, GitHub PR history, and GitHub Releases into adoption-facing release groups.

For live package truth, check npm. For live release truth, check GitHub Releases. Repository evidence notes describe what was prepared and, when applicable, the publication proof after trusted publishing/GitHub Release follow-through.

## v0.31.0 — Framework cleanup shrink release

Status: published to npm as `open-scaffold@0.31.0`; GitHub Release `v0.31.0` is Latest after owner-approved trusted publishing and release follow-through.

Highlights:

- Publishes the framework cleanup shrink from PR #183 plus closeout PR #184 to the public `npx open-scaffold@latest` package surface.
- Reduces the maintained TypeScript source surface from the 20,890 LOC baseline to 12,520 LOC while preserving the protected repo-native work-record loop and runtime-neutral boundaries.
- Repositions removed or contracted commands behind shipped migration/help docs such as `docs/COMMAND_MATURITY.md` instead of ignored local evidence paths.
- Keeps Open Scaffold pre-1.0: this release tightens and reduces package-visible surfaces, and users depending on experimental/lab command shapes should pin exact versions and read the migration notes.

Evidence:

- Source plan: `.osc/plans/done/151-framework-cleanup-shrink.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/183
- Closeout PR: https://github.com/graphanov/open-scaffold/pull/184
- Release-sync plan: `.osc/plans/done/152-framework-cleanup-package-sync.md`
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/185
- Release-sync evidence note: `.osc/releases/2026-06-06-152-framework-cleanup-package-sync.md`

## v0.30.1 — Evolution handoff packet release

Status: published to npm as `open-scaffold@0.30.1`; GitHub Release `v0.30.1` was Latest after owner-approved trusted publishing and release follow-through, then was superseded by `v0.31.0`.

Highlights:

- Publishes the `osc evolve analyze` next-action packet work from PR #175 plus plan closeout from PR #176 to the public `npx open-scaffold@latest` package surface.
- Adds workflow-neutral handoff guidance for repeated-attempt/evolution loops: recommended action, reasons, resume/frontier context, remaining criteria, required next fields, safe evidence refs, and boundary notes.
- Keeps the packet as decision support only: no runtime spawning, no model selection, no benchmark-support claim, no score-improvement claim, and no approval authority.

Evidence:

- Source plan: `.osc/plans/done/143-framework-value-next-action-packet.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/175
- Closeout PR: https://github.com/graphanov/open-scaffold/pull/176
- Release-sync plan: `.osc/plans/done/144-next-action-packet-npx-release-sync.md`
- Release-sync evidence note: `.osc/releases/2026-06-03-144-next-action-packet-npx-release-sync.md`

## v0.30.0 — Blueprint security and adoption release

Status: published to npm as `open-scaffold@0.30.0`; GitHub Release `v0.30.0` was Latest after owner-approved trusted publishing and release follow-through, then was superseded by `v0.30.1`.

Highlights:

- Publishes the OSB blueprint security/adoption work from PR #168 to the public `npx open-scaffold@latest` package surface.
- Makes guided first-run onboarding, PR-native structural checks, adapter trust commands, command/schema registries, redaction/secret-scan support, and optional GitHub-online verification labels available in the package.
- Documents the trust boundary more explicitly: Open Scaffold remains repo-native and no-spawn by default; it supports reviewability and traceability, not semantic correctness, compliance certification, production readiness, or runtime correctness.
- Includes the maintenance tail from PRs #169 and #170 before the release-sync cut.

Evidence:

- Release-sync plan: `.osc/plans/done/141-0300-npx-release-sync.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/168
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/171
- Release-sync evidence note: `.osc/releases/2026-06-03-141-0300-npx-release-sync.md`

## v0.20.4 — Fresh npx compare demo repair

Status: published to npm as `open-scaffold@0.20.4`; GitHub Release `v0.20.4` was Latest after owner-approved trusted publishing and release follow-through, then was superseded by `v0.30.0`.

Highlights:

- Repairs the advertised first-read command so `npx open-scaffold@latest compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` can run from a fresh external directory after publication.
- Keeps `osc compare` local and read-only: no runtime spawning, no model scoring, no frontier promotion, and no approval automation.
- Adds extracted-package regression coverage proving the packaged demo resolves from outside the package directory.
- Closes plan `129-zero-context-resume-proof` after merge, npm publication, fresh `npx`, GitHub Release Latest, and final closeout evidence are complete.

Evidence:

- Source plan: `.osc/plans/done/129-zero-context-resume-proof.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/155
- Release-sync evidence note: `.osc/releases/2026-05-30-129-npx-compare-demo-repair.md`

## v0.20.3 — Canonical section parser package sync

Status: published to npm as `open-scaffold@0.20.3`; GitHub Release `v0.20.3` was Latest after owner-preapproved trusted publishing and release follow-through, then was superseded by `v0.20.4`.

Highlights:

- Publishes the PR #150 canonical Markdown H2 section parser across plan parsing, plan validation, release-note validation, strict shell verification, Python reference parsing, and template status updates.
- Ignores fenced `## ...` lines inside column-0 backtick/tilde code fences, tolerates CRLF, and normalizes optional trailing ATX closing hashes such as `## Status ##`.
- Tightens strict verifier section checks to exact, fence-aware plan and release-note headings while preserving the no-new-runtime-dependency boundary.
- Keeps Open Scaffold core non-spawning: no runtime execution, no MCP surface expansion, and no new dynamic-runtime claim.

Evidence:

- Source plan: `.osc/plans/done/130-section-parser-canonical-contract.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/150
- Package-sync PR: https://github.com/graphanov/open-scaffold/pull/151
- Release-sync evidence note: `.osc/releases/2026-05-29-130-section-parser-canonical-contract.md`

## v0.20.2 — Methodology and reviewer evidence package sync

Status: published to npm as `open-scaffold@0.20.2`; GitHub Release `v0.20.2` was Latest after owner-approved trusted publishing and release follow-through, then was superseded by `v0.20.3`.

Highlights:

- Prepares the PR #145 package-visible methodology evidence command: `osc study [--json] [--since <date>] [--out <path>]`.
- Prepares the PR #146 reviewer evidence mirror: `osc pr-summary <plan-slug> [--format <markdown|json>]`.
- Prepares the PR #146 A/B pilot packet validator: `osc ab check <path>`.
- Keeps A/B validation structural only: it checks packet shape and honesty guardrails, not experiment outcomes, scoring, causation, or improvement claims.
- Keeps the PR-summary workflow optional and non-canonical: PR comments mirror repository artifacts and skip fork/Dependabot comment writes when the token is read-only.

Evidence:

- Methodology source plan: `.osc/plans/done/125-methodology-evidence-harness.md`
- Methodology source PR: https://github.com/graphanov/open-scaffold/pull/145
- PR-summary source plan: `.osc/plans/done/126-pr-native-evidence-surface.md`
- A/B pilot source plan: `.osc/plans/done/127-ab-comparison-pilot-harness.md`
- PR-summary / A/B source PR: https://github.com/graphanov/open-scaffold/pull/146
- Release-sync plan: `.osc/plans/done/128-methodology-pr-summary-ab-package-sync.md`
- Release-sync evidence note: `.osc/releases/2026-05-29-128-methodology-pr-summary-ab-package-sync.md`

## v0.20.1 — Trace work-record replay package sync

Status: published to npm as `open-scaffold@0.20.1`; GitHub Release `v0.20.1` was Latest after owner-approved trusted publishing and release follow-through, then was superseded by `v0.20.2`.

Highlights:

- Publishes the PR #142 package-visible trace command: `osc trace <plan-slug>`, a read-only command for replaying one plan's local work-record chain.
- Complements `osc verify --evidence-chain`: trace explains the known chain, verify checks structural integrity.
- Labels links as `local`, `external`, `missing`, or `unverified` without judging correctness, evidence quality, PR state, or compliance.
- Recognizes full GitHub PR/issue URLs plus common local shorthand such as `PR #123`, `Pull Request: owner/repo#123`, and `Issue: #456` from local files only.
- Requires no GitHub API, network access, runtime launch, hosted dashboard, or provider credentials.

Evidence:

- Source plan: `.osc/plans/done/117-osc-trace-work-record-replay.md`
- Source evidence note: `.osc/releases/2026-05-28-117-osc-trace-work-record-replay.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/142
- Release-sync plan: `.osc/plans/done/124-trace-package-release-sync.md`
- Release-sync evidence note: `.osc/releases/2026-05-28-124-trace-package-release-sync.md`

## v0.20.0 — Evidence-chain package sync and cadence correction

Status: published to npm as `open-scaffold@0.20.0`; GitHub Release `v0.20.0` was marked Latest after owner-approved trusted publishing and release follow-through, then superseded by `v0.20.1`.

Highlights:

- Publishes the PR #137 package-visible evidence-chain verifier: `osc verify --evidence-chain` and scoped checks such as `osc verify --evidence-chain --plan <slug> --strict`.
- Publishes the latest first-read help grouping so fresh installs see `osc compare` as the prerequisite-free work-record demo.
- Corrects the forward-moving release cadence from the historical `v1.0.x` line back to pre-1.0 hardening as `v0.20.x`. The `1.0.x` packages remain published history; `0.20.x` is the honest current maturity signal.
- Keeps the verifier structural only: it checks links among plans, evidence notes, run packets, PR references, and close-decision fields without judging evidence quality or calling external services.

Evidence:

- Source plan: `.osc/plans/done/071-evidence-chain-verifier.md`
- Release-sync plan: `.osc/plans/done/123-evidence-chain-package-release-sync.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/137
- Related first-read help PR: https://github.com/graphanov/open-scaffold/pull/138
- Runtime-control-loop ADR PR: https://github.com/graphanov/open-scaffold/pull/139
- Source evidence note: `.osc/releases/2026-05-27-071-evidence-chain-verifier.md`
- Release-sync evidence note: `.osc/releases/2026-05-28-123-evidence-chain-package-release-sync.md`

## v1.0.5 — Compare command package sync

Status: published to npm as `open-scaffold@1.0.5`; historical release line before the cadence reset to `v0.20.x`.

Highlights:

- Prepares the PR #134 package-visible attempt-diff surface: `osc compare <attempt-a-dir> <attempt-b-dir>` for comparing two local attempt folders without a full evolution-loop ledger.
- Keeps comparison local and deterministic: no model scoring, no frontier promotion, no runtime spawning, no network requirement, and no provider calls.
- Supports both human-readable Markdown output and JSON output for downstream automation.

Evidence:

- Source plan: `.osc/plans/done/109-bare-attempt-compare.md`
- Release-sync plan: `.osc/plans/active/122-compare-package-release-sync.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/134
- Source evidence note: `.osc/releases/2026-05-27-109-bare-attempt-compare.md`
- Release-sync evidence note: `.osc/releases/2026-05-27-122-compare-package-release-sync.md`

## v1.0.4 — Work dry-run preview package sync

Status: published to npm as `open-scaffold@1.0.4`; GitHub Release `v1.0.4` was marked Latest at publication time and later superseded.

Highlights:

- Prepares the PR #129 package-visible runtime surface: `osc work "TASK" --runtime codex --dry-run` as the first natural-language composition layer.
- Previews a candidate plan, run packet, and dispatch command without writing `.osc/plans` or `.osc/runs` artifacts, spawning runtimes, or calling provider APIs.
- Keeps non-dry-run `osc work` refused until a separate safety design exists.
- Preserves workflow overrides in suggested `osc run` commands and renders subdirectory-invocation paths relative to the caller cwd.

Evidence:

- Source plan: `.osc/plans/done/104-osc-work-dry-run-target.md`
- Release-sync plan: `.osc/plans/active/107-work-dry-run-package-sync.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/129
- Source evidence note: `.osc/releases/2026-05-26-104-osc-work-dry-run-target.md`
- Release-sync evidence note: `.osc/releases/2026-05-27-107-work-dry-run-package-sync.md`

## v1.0.3 — Dispatch adapter glue package sync

Status: published to npm as `open-scaffold@1.0.3`; GitHub Release `v1.0.3` was marked Latest at publication time and later superseded.

Highlights:

- Publishes the PR #125 package-visible runtime surface: `osc dispatch <run-json> --adapter <adapter-id>` for explicit local adapter invocation from existing run packets.
- Keeps dispatch constrained to reviewed project-local adapter configs; core refuses unsafe adapters, auto-install/network/shell/platform-shim executables, symlinked outputs, stale inferred outputs, and out-of-run-directory receipt/evidence paths.
- Keeps Open Scaffold core non-spawning: dispatch invokes a selected adapter command, captures reported outputs, and does not grant commit/push/PR/merge/publish/credential/provider-runtime authority.
- Hardens GitHub Actions workflows to try authenticated fetches for private-repo compatibility while falling back to public unauthenticated refs when repository-token Git fetches are unavailable.

Evidence:

- Plan: `.osc/plans/done/106-dispatch-adapter-glue-package-sync.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/125
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/126
- Workflow checkout hardening PR: https://github.com/graphanov/open-scaffold/pull/127
- Evidence note: `.osc/releases/2026-05-26-106-dispatch-adapter-glue-package-sync.md`
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v1.0.3
- npm: `open-scaffold@1.0.3` / `latest`

## v1.0.2 — Codex runtime preset package sync

Status: published to npm as `open-scaffold@1.0.2`; GitHub Release `v1.0.2` was marked Latest at publication time and later superseded.

Highlights:

- Publishes the PR #121 package-visible runtime surface: built-in `codex` runtime preset, mapped to `omx-codex` and the current `runtime-omx` adapter path.
- Keeps `--runtime omx` as the explicit harness-name preset while docs/examples prefer `--runtime codex` for broad users.
- Preserves the no-spawn boundary: core records run packets, while runtime launch remains adapter-owned and explicitly gated.

Evidence:

- Plan: `.osc/plans/done/105-codex-runtime-adapter-package-release-sync.md`
- Source PR: https://github.com/graphanov/open-scaffold/pull/121
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/122
- Evidence note: `.osc/releases/2026-05-26-105-codex-runtime-adapter-package-release-sync.md`
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v1.0.2
- npm: `open-scaffold@1.0.2` / `latest`

## v1.0.1 — No-spawn Codex handoff entry

Status: published to npm as `open-scaffold@1.0.1`; GitHub Release `v1.0.1` was marked Latest at publication time and later superseded.

Highlights:

- Adds `osc start <plan> --runtime codex` as a no-spawn prompt renderer for Codex/OMX workers.
- Keeps runtime execution outside Open Scaffold core: no process spawn, no `.osc/runs` write, no commit/push/PR/publish side effects.
- Documents the first shipped step in the post-v1 Codex-first runtime adoption chain.

Evidence:

- Plan: `.osc/plans/done/101-osc-start-codex-agent-entry.md`
- Evidence note: `.osc/releases/2026-05-26-101-osc-start-codex-agent-entry.md`
- PR: https://github.com/graphanov/open-scaffold/pull/119
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v1.0.1
- npm: `open-scaffold@1.0.1` / `latest`

## v1.0.0 — Stable protocol release candidate

Status: published to npm as `open-scaffold@1.0.0`; GitHub Release `v1.0.0` was the initial stable Latest release before `v1.0.1`.

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
