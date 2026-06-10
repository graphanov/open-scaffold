# Open Scaffold Roadmap

Open Scaffold is developed with Open Scaffold. This roadmap is both a product plan and a dogfood artifact: roadmap items should become issues, plans, run packets, evidence, and release notes through the same discipline the project recommends to others.

## Product thesis

Open Scaffold is a runtime-neutral, repo-native work record and repository protocol for AI-assisted work. It gives humans and agents a durable shared record for mission, roadmap, plans, amendments, evidence, handoffs, verification, GitHub traceability, and operator-room reporting.

The core promise:

> Any capable agent or orchestrator can enter a repository, understand what matters, pick up bounded work, prove what changed, and hand the project back without relying on vanished chat context.

## System ontology

- **Open Scaffold core** owns the repo protocol and documentation discipline.
- **Orchestrators/agents** such as Hermes, Claw/OpenClaw, Claude Code, Codex, Gemini, or custom scripts operate on that protocol.
- **Runtime harnesses** such as OMC and OMX provide workflow modes for specific base agents:
  - OMC = Claude Code workflow/orchestration harness.
  - OMX = Codex workflow/execution harness.
- **Task/state bridges** such as Hermes Kanban or GitHub Issues coordinate live work state, dependencies, assignments, and review gates.
- **Operator surfaces** such as Discord, Slack, Telegram, CLI, or GitHub comments expose status, blockers, approvals, and build-in-public streams.
- **GitHub** owns public/versioned work artifacts: issues, branches, PRs, releases, and CI results.

## Canonical identity chain

A mature Open Scaffold work item should be traceable through a chain like:

```text
ROADMAP item
  -> GitHub issue or private task
  -> scaffold plan / amendment
  -> task_id / run_id binding
  -> run packet / evidence
  -> branch / PR
  -> verification gate
  -> release note / roadmap update
```

Not every small task needs every link, but meaningful work should make the chain explicit.

## Milestone 0 — Product contract and dogfood baseline

Status: v1 complete; product mission, roadmap, ontology, and self-dogfood baseline are established.

Goal: make the product identity and ontology precise enough that agents stop making wrong boundary assumptions.

Deliverables:

- Replace unset template mission with Open Scaffold's product mission.
- Add this `ROADMAP.md`.
- Add a system-ontology document explaining orchestrators, harnesses, task bridges, operator surfaces, and GitHub.
- Amend the active plan to capture the ontology change.
- Run methodology verification and record expected gaps.

Acceptance criteria:

- `MISSION.md` has no `mission:unset` marker.
- Public docs do not frame OMC/OMX as orchestrators equivalent to Hermes/OpenClaw.
- `ROADMAP.md` names the self-dogfood loop.
- `./verify.sh --quick --quiet` passes, or any failure is explicit and actionable.

## Milestone 1 — Core documentation hardening

Status: v1 complete; README/root docs explain Open Scaffold as a runtime-neutral product rather than only a template.

Goal: make Open Scaffold understandable as a product, not only as a template.

Deliverables:

- Rewrite README positioning around repo-native agent-orchestrated development.
- Add concise diagrams or examples for the identity chain.
- Update `docs/WORKFLOW.md` to separate generic phases from runtime/harness choices.
- Update `docs/ADAPTERS.md` or replace it with an integrations/harnesses guide.
- Align `AGENTS.md` and `CLAUDE.md` paired views.

Acceptance criteria:

- A fresh agent can state the ontology correctly after reading root docs.
- A human can understand when to use Open Scaffold core versus Hermes, Claw, OMC, OMX, GitHub, or Discord.
- Documentation includes at least one worked example from roadmap item to PR/evidence.

## Milestone 2 — Evolutionary closed-loop protocol

Status: v1 complete in PR #5 via `docs/SLICE_CLOSE_PROTOCOL.md`; future CLI validation is an optional backlog follow-up, not required for the v1 milestone to count as done.

Goal: productize the “slice → feedback → correction → approval → next slice” learning loop.

Deliverables:

- Define feedback-capture format. First public shape: evidence receipt in `docs/SLICE_CLOSE_PROTOCOL.md`.
- Define slice close criteria. First public shape: postflight checklist and approval taxonomy in `docs/SLICE_CLOSE_PROTOCOL.md`.
- Define how corrections become amendments, evidence, roadmap changes, or next-slice inheritance.
- Add validation checks for stale state, fake evidence, or weak approvals. First public shape: manual checklist and anti-patterns; CLI validation remains a future implementation option.

Acceptance criteria:

- A slice cannot be called closed without explicit evidence and acceptance-gate status.
- Weak-positive / procedural approvals can be marked differently from strong product approval.
- The next slice can inherit corrections without relying on chat memory.

## Milestone 3 — Glass cockpit MVP

Status: v1 complete in PR #6 via the glass-cockpit event protocol (archived 2026-06-10; see git history); implementation examples are optional follow-up slices, not required for the protocol milestone to count as done.

Goal: make build-in-public / private control-room operation a first-class Open Scaffold capability.

Deliverables:

- Define glass-cockpit event types: nudge, active session, blocker, question, answer, approval request, completion report, evidence receipt, PR link. First public shape: the glass-cockpit event protocol (archived 2026-06-10; see git history).
- Define event/session transport separately from the cockpit: clawhip-style routers, webhooks, gateway adapters, and session hooks carry events but do not plan or execute.
- Define public/team/private modes. First public shape: private, team, build-in-public, and stakeholder modes in the glass-cockpit event protocol (archived 2026-06-10; see git history).
- Provide Discord-first examples while keeping the protocol surface generic enough for Slack/Telegram/CLI/GitHub comments.
- Specify that chat is a surface, not canonical truth.

Acceptance criteria:

- A team can run a Discord build-in-public channel from Open Scaffold state.
- A solo dev can run a private cockpit with the same event types.
- Status posts link back to canonical repo/task/issue/evidence IDs.
- Event routers are documented as transport glue, not as source-of-truth databases or executor agents.

## Milestone 4 — ROADMAP / GitHub / task bridge

Status: v1 complete via PR #3, PR #4, and the Milestone 6 proof in PR #9: task/run identity, GitHub issue/PR templates, run binding options, runtime dispatch pattern, and public issue -> task/run -> PR -> release-note chain exist.

Goal: connect roadmap intent to live work without duplicating truth.

Deliverables:

- Define when a roadmap item becomes a GitHub issue.
- Define when an issue becomes a live task in an orchestrator/task system.
- Define task metadata needed for harness execution: repo, run mode, allowed paths, acceptance criteria, evidence path, approval gates.
- Define the task/run identity split: `task_id` for durable work item, `run_id` for one execution attempt, `question_id` for blocking operator prompts, and chat/thread ids as optional bindings.
- Define the coordinator-to-executor pattern: task/card/package chooses OMC, OMX, plain agent, or manual lane; execution returns artifact/status/blocker; coordinator updates state.
- Add templates for issue bodies and task handoff packets.
- Ship `osc` run binding options that create v1 `.osc/runs/<run_id>/run.json` records without spawning runtimes.

Acceptance criteria:

- One roadmap item can be converted into GitHub issues and live tasks with stable IDs.
- The repo can answer “what is the source of truth for this work?” at each stage.
- No Discord thread or runtime transcript is required to reconstruct task state.
- A generated run record can bind a task/card/issue to an executor lane, operator surface, worktree/branch, and evidence paths.
- GitHub issue and PR templates capture task/run traceability and review gates.

## Milestone 5 — Runtime harness bindings

Status: v1 complete in PR #7 via `docs/RUNTIME_BINDING_CONTRACT.md`; executable OMC/OMX launchers and JSON-schema enforcement remain adapter/backlog work, not core spawning work.

Goal: support specific harnesses without making them the core system.

Deliverables:

- OMC binding guidance for Claude Code workflows: `/deep-interview`, `/ralplan`, `/team`, `/ralph`, `/ultrawork` where applicable. First public contract shape: `docs/RUNTIME_BINDING_CONTRACT.md`.
- OMX binding guidance for Codex workflows: `$deep-interview`, `$ralplan`, `$team`, `$ralph`, `$ultrawork`, `$ultragoal`. First public contract shape: `docs/RUNTIME_BINDING_CONTRACT.md`.
- Generic handoff packet schema for any future harness. First public contract shape: runtime binding lifecycle, package validation gate, and evidence return contract in `docs/RUNTIME_BINDING_CONTRACT.md`.
- Failure-state taxonomy: prompt not accepted, session blocked, artifact missing, verification failed, human input needed.

Acceptance criteria:

- Open Scaffold core remains runtime-neutral.
- Runtime-specific docs describe OMC/OMX as execution/orchestration lanes, not universal orchestrators.
- OMX is documented as an explicitly selected Codex lane, not the automatic runtime engine for Hermes or OMC.
- A plan can be handed to a harness and return evidence without mutating canonical repo truth incorrectly.

## Milestone 6 — Self-dogfood release loop

Status: v1 complete in PR #9 via GitHub issue #8, `.osc/plans/done/005-self-dogfood-release-loop.md`, run ID `20260512T135850Z-005-self-dogfood-release-loop-run`, Codex clean review, and `.osc/releases/2026-05-12-self-dogfood-release-loop.md`.

Goal: ship Open Scaffold improvements through Open Scaffold itself.

Deliverables:

- Convert this roadmap into issues.
- Use plans/amendments for meaningful work.
- Record run packets/evidence for agent-assisted changes.
- Open PRs that link roadmap item, issue, task_id, run_id, plan, verification, Codex review, and evidence.
- Publish release notes that cite the loop.

Acceptance criteria:

- At least one public PR demonstrates the full chain.
- The PR can be understood without any owner-local cockpit context (private deployment examples remain examples, not adoption requirements).
- Codex connector review is triggered or explicitly skipped with rationale.
- The release notes explain what was learned from dogfooding.

## V2 roadmap — harden the protocol into a usable product

The v1 baseline proves the model. V2 should make it harder for agents to drift, easier for humans to adopt, and cleaner for runtime harnesses to bind without contaminating core.

### Public roadmap visibility rule

Status: adopted via `.osc/plans/done/024-roadmap-scope-discipline.md`, following the 2026-05-14 external review ingest.

Public roadmap commitments should stay legible: keep at most five planned/backlog milestones visible ahead of the current focus. Completed milestones remain for provenance. Farther speculative ideas belong in the parking lot, research notes, or future ADRs until the owner explicitly promotes them.

### Implementation architecture direction — audit and evaluation envelopes

Status: direction captured through PR #39 scope amendment; first structure-only CLI mechanics shipped through PR #40 (`osc eval init/check`) and the local audit digest-manifest slice (`osc audit init/check`).

Open Scaffold core should own portable standards for audit envelopes, evaluation envelopes, closed evaluation loops, and feedback-based improvement routing. This strengthens the existing slice-close protocol and runtime binding contract: a run should produce enough durable evidence for a postflight to evaluate acceptance criteria, capture human/reviewer feedback, route corrections, and reconstruct what was planned, executed, verified, approved, or carried forward.

Current mechanics are intentionally lightweight and structure-only: `osc eval` drafts/checks acceptance-criteria evaluation envelopes, `osc audit` drafts/checks local artifact digest manifests, and `osc evolve` records multi-attempt improvement loops with attempt journals and frontier promotion. Future mechanics such as envelope self-digests, parent links, Merkle audit manifests, external anchor adapters, richer runtime-event capture, or automated evaluator adapters require separate plans and tests.

This direction does not promote native runtime ownership, model-lab benchmarking, automated compliance judgment, legal audit certification, runtime data permissions, or provider-specific ledger dependencies into core.

### Milestone 7 — CLI validation upgrades

Status: complete via `.osc/plans/done/007-cli-validation-upgrades.md` and `.osc/releases/2026-05-15-public-trust-readiness.md`.

Goal: make stale-state and evidence drift mechanically visible.

Deliverables:

- Validate slice-close evidence and approval status.
- Validate `.osc/releases/` notes for issue/task, plan, run ID, PR, verification, outcome, and follow-up fields.
- Detect stale active plans and active plans with completed/merged evidence.
- Detect cited run IDs with no durable public evidence summary.

### Milestone 8 — User-facing examples

Status: complete via `.osc/plans/done/008-user-facing-examples.md` and `.osc/releases/2026-05-15-adoption-example-path.md`.

Goal: make Open Scaffold adoptable by people who have never seen any owner-local cockpit (i.e. without depending on private deployment examples).

Deliverables:

- Solo developer example.
- Team control-room example.
- GitHub-only workflow example.
- Runtime harness handoff example.

### Milestone 9 — Runtime harness adapter refresh

Status: complete via `.osc/plans/done/009-runtime-harness-adapter-refresh.md` and `.osc/releases/2026-05-15-runtime-adapter-refresh.md`.

Goal: align OMC/OMX bindings with the public runtime binding contract while keeping runtime launch mechanics outside core.

Deliverables:

- Add a core runtime-selection surface for `omc` / `omx` presets that records executor lane and workflow in the run packet.
- Promote runtime selection into schema-backed runtime profiles, including built-in OMC/OMX/plain/human/custom profiles and project-local `.osc/runtimes/*.json` custom profiles.
- Keep real OMC/OMX launch behavior in external adapters or coordinators, not core.
- Ensure adapter evidence returns to `.osc` run/release conventions.

Runtime status after PR #36/#37:

- Runtime selection and runtime profiles are shipped as a run-packet/profile layer, not as core spawning.
- Backlog hypotheses `030-agent-runtime-selection-vision` and `031-agentic-orchestration-model-lab-vision` are not the next implementation queue. Their useful near-term conclusion has been narrowed to: keep Open Scaffold as the source-of-truth work-record layer, let adapters/coordinators launch real runtimes, and require evidence before promoting model-lab or native-runtime claims.
- Future runtime work should start from a specific adapter/evidence slice such as `osc runtimes check <id>` or a fake/local conformance proof, not from broad orchestration promises.

### Milestone 10 — Product packaging and releases

Status: complete for the current readiness slice via `.osc/plans/done/010-product-packaging-release.md`, `.osc/releases/2026-05-15-packaging-release-readiness.md`, and `.osc/releases/2026-05-15-public-trust-readiness.md`. `v0.3.0` baseline release evidence exists at `.osc/releases/2026-05-12-v0.3.0-runtime-neutral-baseline.md`; npm-registry publishing remains parked until a fresh adoption signal.

Goal: package the v1 protocol baseline as a public product release.

Deliverables:

- Publish `v0.3.0 — Runtime-neutral semi-autonomous protocol baseline`.
- Add a sharper “why this exists” product diagram/story.
- Evaluate npm/template packaging readiness.

## Independent review addendum — make the useful parts undeniable

A 2026-05-12 independent two-lane review found the core thesis valid and the mechanics working, but also named the adoption gap clearly: Open Scaffold is strongest as repo-native discipline and core tooling, while examples, adapter proof, packaging, and docs compression must catch up.

The review direction is now part of the public roadmap. The priority is not to turn Open Scaffold core into an agent runtime; it is to make the scaffold easier to trust, easier to try, and harder to misunderstand.

### Milestone 11 — Independent review hardening

Status: complete via `.osc/plans/done/012-independent-review-hardening.md` and `.osc/releases/2026-05-12-independent-review-hardening.md`.

Goal: convert external review findings into source-grounded fixes and a small trust-building hardening release.

Deliverables:

- Confirm every report-flagged hardening issue against current source before patching.
- Resolve confirmed `verify.sh`, stale-state, immutability, dependency-audit, or runtime-state hygiene issues.
- Add regression tests or shell fixtures for confirmed validation behavior where practical.
- Record release/evidence notes for what was confirmed, fixed, deferred, or rejected.

### Milestone 12 — Minimal runtime binding example

Status: complete via `.osc/plans/done/013-binding-example.md` and `.osc/releases/2026-05-12-binding-example.md`.

Goal: prove that `.osc/runs/<run_id>/run.json` can be consumed by an external adapter without making Open Scaffold core the spawner.

Deliverables:

- Add one tiny public binding example or dry-run adapter.
- Show the command path from plan to generated run packet to external runtime handoff.
- Document the safety boundary: core packages work; adapters/harnesses execute it.
- Keep the example credential-free and runnable by a fresh user.

### Milestone 13 — Non-scaffold downstream example

Status: complete via `.osc/plans/done/014-downstream-example-project.md` and `.osc/releases/2026-05-15-adoption-example-path.md`.

Goal: demonstrate Open Scaffold on one tiny project that is not Open Scaffold itself.

Deliverables:

- Add a public-safe example that demonstrates mission → plan → run packet → evidence → close.
- Make the example small enough to understand in one sitting.
- Use it to show when Open Scaffold is valuable and when it is overkill.

### Milestone 14 — CLI and packaging UX

Status: complete for the current tiered-init slice via `.osc/plans/done/015-cli-packaging-ux.md` and `.osc/releases/2026-05-14-tiered-scaffold-init.md`; further packaging/CLI polish returns through a fresh plan only after a new adoption signal.

Goal: reduce day-one friction with first-class `osc` commands and an install path that does not require users to reason about shell helpers first.

Deliverables:

- Evaluate and implement the first high-value CLI commands: `osc init`, `osc plan new`, `osc amend`, `osc close`, `osc evidence`.
- Keep existing shell scripts as compatibility wrappers until CLI replacements are proven.
- Evaluate `npx open-scaffold init`, npm packaging, and GitHub Action checks.

### Milestone 15 — Docs compression and public positioning

Status: complete for the current adoption-path slice via `.osc/plans/done/016-docs-positioning-compression.md` and `.osc/releases/2026-05-15-adoption-example-path.md`; future docs compression should return through a fresh plan after a new adoption signal.

Goal: make the first-read path shorter while surfacing the strongest use cases: multi-session AI development, consulting/client delivery, compliance/audit traceability, and multi-agent handoff.

Deliverables:

- Compress overlapping protocol explanations into a clearer reader path.
- Add or improve the roadmap → issue/task → plan → run → PR → evidence diagram.
- Remove or generalize owner-local/private deployment context in public docs.
- State honestly what exists today versus what is adapter/backlog work.

### Milestone 16 — Runtime strategy and native-runtime exploration

Status: complete / deferred via `.osc/plans/done/017-runtime-strategy-native-runtime-exploration.md`, PR #17 research synthesis, PR #18 spawning boundary, `.osc/releases/2026-05-14-runtime-strategy-boundary.md`, and the 2026-05-14 external review ingest. Regulated-SDLC and hashgraph-style expansion are deferred from the public near-term roadmap.

Goal: preserve the current runtime boundary decision without advertising speculative enterprise/compliance expansion as a near-term product commitment.

Current stance:

- Open Scaffold core does **not** currently provide an autonomous agent runtime.
- That boundary is intentional today, and PR #18 documents the adapter/spawning boundary in `docs/SPAWNING_BOUNDARY.md`.
- PR #17 captured the current runtime strategy research in the runtime strategy research docs (archived 2026-06-10; see git history) and supporting evidence docs.
- A thin `osc spawn` command or native runtime must not be added by drift; any future work starts with explicit adapter/receipt design, safety analysis, and a fake/local dispatch receipt before real runtime mutation.

Discovery tracks:

1. **Product vision** — what would a native runtime make possible that a launch checklist and adapter contract cannot?
2. **Architecture** — whether runtime concerns belong in core, optional packages, adapter repos, or a sibling runtime product.
3. **Technology scan** — compare relevant agent runtimes, coding-agent CLIs, task orchestrators, workflow engines, CI runners, and black-box/evidence systems.
4. **Safety/governance** — credential boundaries, environment allowlists, process supervision, workspace isolation, commit/push/merge authority, audit trails, and failure states.
5. **MVP options** — no-spawn, thin `osc spawn`, adapter package, local daemon, hosted coordinator, or full native runtime.
6. **Adoption impact** — whether spawning makes Open Scaffold meaningfully easier to try, or whether it confuses the runtime-neutral promise.

Deferred research hypotheses:

- Thin `osc spawn --adapter <name>` invocation.
- Official runtime adapter packages, if created later, that consume Open Scaffold run packets without becoming core dependencies.
- Separate Open Scaffold Runtime product.
- Regulated-SDLC / enterprise assurance positioning.
- Hashgraph-style or tamper-evident event graph for task/run/evidence/protocol evolution.

These remain research hypotheses, not planned product scope. Rationale: scope discipline from the 2026-05-14 external review ingest; public v0.3/v0.4 roadmap should make adoption and evidence mechanics undeniable before advertising speculative enterprise expansion.

Acceptance direction:

- No implementation before a written decision.
- No hidden runtime/provider coupling in core.
- Any prototype starts with a fake/local adapter and dispatch receipt, not real autonomous mutation.
- Any regulated-SDLC/hashgraph exploration must be reopened through an explicit ADR/plan before returning to the public near-term roadmap.

### Milestone 17 — Project wiki knowledge seed

Status: complete via `.osc/plans/done/029-project-wiki-knowledge-seed.md`, PR #28, and `.osc/releases/2026-05-15-project-wiki-knowledge-seed.md`; follows the completed project wiki skeleton in `.osc/plans/done/028-project-wiki-skeleton.md`.

Goal: turn the `docs/wiki/` skeleton into a small, public-safe Open Scaffold body-of-work knowledge graph.

Deliverables:

- Seed 8-12 curated wiki pages across concepts, comparisons, and reusable query answers.
- Prioritize durable project concepts: source-of-truth-first development, repo-native work records, agent resumability, evidence-first development, human-in-the-loop governance, glass cockpit, run packets, and scaffold tiers.
- Clarify boundaries through comparison pages such as Open Scaffold versus agent memory, README-driven development, and traditional SDLC.
- Add query pages that help humans and agents answer what Open Scaffold is for, what to read first, and why the project matters.
- Update `docs/wiki/index.md` and `docs/wiki/log.md` so the wiki remains navigable and traceable.

Acceptance criteria:

- `docs/wiki/` contains a coherent seed pack rather than only a schema/skeleton.
- Every new page has schema-compatible frontmatter, owner-neutral public wording, and no private owner context.
- Every new page links to at least two related wiki pages where possible.
- The wiki explains compiled project knowledge; live task state, PR state, release evidence, and private context stay out of `docs/wiki/`.
- `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

### Milestone 18 — historical v1.0.0 stability launch

Status: completed as a historical launch line through `.osc/plans/done/069-v1-launch.md`, `.osc/releases/2026-05-25-v1-launch.md`, PR #113, and later package/release follow-through. As of the `123-evidence-chain-package-release-sync` closeout, the forward-moving channel was intentionally corrected back to pre-1.0 hardening; after the framework cleanup shrink, that current hardening line is `v0.31.x` until the public product surface earns a mature 1.0 contract.

Goal: make the adoption contract explicit before the first major-release experiment.

Deliverables:

- Bump the repository package candidate to `1.0.0`.
- Add `docs/STABILITY.md` with stable, experimental, future, semver, migration, and publication-gate guidance.
- Add `docs/CHANGELOG.md` as a curated release history from v0.1-style foundation through the v1.0.0 candidate.
- Add `docs/index.html` as a landing page that answers the problem, audience, and first command within 30 seconds.
- Update `README.md`, `MISSION.md`, `AGENTS.md`, and `CLAUDE.md` so the v1.0.0 candidate is visible without claiming publication before the owner gates.

Owner gates:

- Publish `open-scaffold@1.0.0` to npm.
- Create or mark the `v1.0.0` GitHub Release as **Latest**.
- Decide whether to launch publicly through a blog, social channel, GitHub Pages, or another site.

### Milestone 19 — Post-v1 adoption workflow target

Status: historical/repositioned after the framework cleanup. Earlier staged work through `.osc/plans/done/099-runtime-adoption-ux-reset.md`, the runtime adoption workflow doc (archived 2026-06-10), and `104-osc-work-dry-run-target` explored `osc work --dry-run` as a natural-language composition layer, but the reduced maintained CLI removed `osc work` from the live command surface. The 2026-05-28 control-loop decision still routes any future execution controller to backlog plan `119-osc-work-execute-controller` while rejecting a native core runtime. The completed MCP readiness decision slice (`.osc/plans/done/131-mcp-integration-surface-readiness.md`) keeps MCP as an integration facet and routes any future write/execution authority downstream of that controller model.

Goal: turn the credible v1 work-record protocol into a smoother adoption path without collapsing Open Scaffold core into a provider-specific runtime.

Historical target workflow (not a live reduced-CLI command):

```bash
osc work "Add a /health endpoint with tests" --runtime codex
```

The target control loop is:

```text
intent
  -> plan draft / scope confirmation
  -> run packet
  -> explicit Codex/OMX adapter dispatch
  -> dispatch receipt + evidence
  -> verification
  -> human gate before commit/push/PR/merge/publish
```

Implementation sequence:

1. Done — verification trust issue: unsafe strict-mode filename quoting fixed.
2. Done — `osc start` added as a no-spawn, paste-ready Codex/OMX agent-entry command.
3. Done — Codex-first adapter package path hardened around `runtime-omx` and the broad `codex` preset.
4. Done — `osc dispatch <run.json> --adapter <id>` added as explicit local-adapter invocation glue.
5. Historical/repositioned — `osc work --dry-run` previously previewed a natural-language task as candidate plan/run/dispatch steps; it is no longer a live reduced-CLI command.
6. Backlog — `119-osc-work-execute-controller`: design and implement a safe `osc work` run-lifecycle controller that owns plan/package/run/receipt/evidence/verification/human gates while explicit adapters own execution, auth, spawning, sandbox translation, and sessions.
7. Later — reconsider native runtime ownership only after at least two credible adapter proofs or one production adapter, closed security P0s, real adoption evidence that adapters are insufficient, and a separate ADR accepting process lifecycle and credential burden.

Acceptance direction:

- Core stays the work record, policy, verification, and evidence layer.
- Runtime execution stays adapter-owned and explicit.
- Non-dry-run `osc work` must include adapter env allowlists, timeout/kill behavior, bounded logs, structured adapter output manifests, path containment, no secrets by default, isolated worktrees for write-capable runs, and human gates for commit/push/PR/merge/publish/release/deploy.
- The next adapter path is Codex-first; Claude Code-specific runtime work is not the default follow-up from this milestone.
- Current `packages/runtime-omx/` is treated as an experimental Codex/OMX proof, not as a broad finished runtime platform.
- Adapter registry work follows at least two credible adapter entries or a clear Codex/OMX package graduation; a registry with only one experimental adapter is not the adoption bottleneck.

## Parking lot

- Deferred regulated-SDLC / hashgraph-style exploration; reopen only through an explicit ADR/plan.
- Runtime/model-lab hypotheses from `030` and `031`: future work only after adapter evidence, explicit safety design, and clear separation between Open Scaffold core, runtime adapters, and model evaluation.
- MCP integration facet: `131-mcp-integration-surface-readiness` / 2026-05-29 ADR keeps `osc mcp serve` optional and read-oriented now; future contract-stable read schemas need conformance fixtures, and any write/execution surface must inherit `119` controller gates.
- Repository-local task database option for users without Hermes Kanban/GitHub Issues.
- Visual dashboard beyond Discord posts.
- Templates for stakeholder/client-facing cockpit modes.
- Metrics: cycle time, stale tasks, evidence freshness, approval latency.
