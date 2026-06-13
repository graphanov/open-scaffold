# Open Scaffold stability

This page is the single home for Open Scaffold's maturity boundary: what is stable, what is experimental, what is future, and what the project does not claim. Other surfaces state their promise once and link here.

The short version: Open Scaffold is on a pre-1.0 line (`v0.31.x`). The stable core is the work loop and its record — `MISSION.md` → plan → run packet or amendment → evidence → verification → close — plus the handoff/review/gate helpers (`osc first-run`, `osc handoff`, `osc review`, `osc gate`, `osc pr check`, `osc compare`, `osc trace`). Core runtime launch, root adapter dispatch, and the old harness command grammar are not current-package promises.

## Honest limits

Everything Open Scaffold does not claim, in one place:

- **It does not make your model smarter — now measured, not just stated.** The 2026-06 preregistered benchmark program found naked strong-model runs matched or beat scaffolded arms on in-session task performance across three benchmark families; that is an explicit non-goal. The measured value lives elsewhere: a fresh reviewer reconstructs the work from the record at 94% vs 30% accuracy at half the review cost (pilot-grade). Full claim ledger with boundaries: [`PROOF_HARNESS.md`](PROOF_HARNESS.md).
- **Receipts prove handoff and execution facts, not correctness.** Verification against acceptance criteria is a separate, recorded step — and a human still owns the judgment call.
- **The benchmark program is pilot-grade and partly self-run.** One worker model, n=1 cells, owner-built instrument (preregistration, hidden inputs, blind double-implementation, and kill rules as mitigations); replication with humans and larger n is open work. The older bounded `examples/proof/` fixture remains a separate, narrower surface.
- **It is not a compliance certification, sandbox, or security guarantee.** It produces structural evidence a process can build on; it does not replace the process.
- **Humans own merge, publish, release, and deployment.** Nothing in the harness self-approves.
- **Historical `v1.0.x` packages exist** as immutable publication history; the forward line is `v0.31.x` and the next 1.0 will be cut when the contract has earned it.

## Release status

- Current cadence: pre-1.0 hardening on the `v0.31.x` line.
- Historical note: `v1.0.x` exists as a previously published launch line (most recent tag: `v1.0.5`) and remains immutable package/release history.
- Current repository package version: check `package.json`.
- Live npm package truth: check `npm view open-scaffold version dist-tags --json`.
- Live GitHub release truth: check the GitHub Releases page and the release marked **Latest**.

Do not treat repo version alone as proof that npm publication or GitHub Release latest movement has happened. Verify the registry and release surfaces separately.

## Stable-enough core in the current line

These surfaces are intended to remain usable across the current pre-1.0 hardening line, but the project is not yet making the broad promise implied by a mature 1.0 release.

### Repository protocol

- `MISSION.md` as mission/goals/non-goals/changelog source of truth.
- `ROADMAP.md` as direction and product-history source of truth.
- `.osc/plans/{active,backlog,blocked,done}/` as the folder state machine.
- The Status + seven content-heading plan schema in `.osc/plans/handoff-template.md` (`Status`, then the seven required content headings from `Context` through `Open questions`).
- Mechanical amendments and closures through `osc amend`, `osc close`, `./amend.sh`, and `./close.sh`.
- `.osc/releases/` as curated release/evidence notes.
- `.osc/runs/<run_id>/run.json` as a repo-native handoff package record. Core commands can create the package; external agents or adapters do the work and return receipts/evidence.

### CLI and shell floor

The stable day-two CLI surface is:

- `osc init`
- `osc resume` as the read-only resume packet that lets a fresh session continue from repo truth
- `osc status`
- `osc plan new`
- `osc plan validate`
- `osc plan move`
- `osc amend`
- `osc close`
- `osc evidence new`
- `osc evidence collect`
- `osc verify`
- `osc first-run` as guided repo initialization for the minimum work record
- `osc pr check` as a PR-native structural check surface
- `osc schemas list` and `osc schemas show` for package-visible schema discovery
- `osc compare` as a read-only first-read demo for comparing two recorded attempts
- `osc trace` as a read-only replay of one plan's local work-record chain

The zero-dependency shell helpers remain a stable fallback floor:

- `bootstrap.sh`
- `amend.sh`
- `close.sh`
- `delegate.sh`
- `verify.sh`

### Verification expectations

- `./verify.sh --quick`, `--standard`, and `--strict` remain the canonical repository compliance tiers.
- `npm test` and `npm run build` remain the package-level local gates for this repository.
- Public PRs should cite the plan, evidence note, verification commands, review state, and owner gates.
- `osc trace <plan-slug>` is a reconstruction aid; `osc verify --evidence-chain` remains the structural integrity check.

## Lab / experimental in the current line

These surfaces are usable but not promised as final API shape. They may change while the project is still below a mature 1.0 contract; pin exact package versions if you depend on their current output shape.

- Runtime profiles and runtime selection beyond run-packet metadata.
- `osc run` and `osc delegate` as no-spawn package-generation helpers.
- Historical/repositioned: `osc harness`, root `osc dispatch`, root `osc adapter`, runtime-package `osc review`/`osc ultrareview`, and `osc work --dry-run` are no longer live maintained commands after plan 168; future work execution remains external-runner/coordinator-owned unless a new plan restores a controller with fresh evidence.
- `osc evolve` ledger helpers for repeated attempts; they record attempt/frontier decisions but do not execute or approve work.
- Evaluation and audit envelope helpers.
- Optional MCP server interface.
- Glass cockpit webhook examples for Discord and Slack.
- Historical/repositioned local task database helpers and TUI/web dashboards; they are not live reduced-CLI commands after the framework cleanup.
- Runtime-specific packages such as `packages/runtime-omx/`.
- Python reference parser packaging until it is promoted through separate packaging evidence.

Experimental does not mean unsupported; it means users should avoid building irreversible external dependencies on exact output shapes without pinning the package version and reading the relevant docs.

## Future / not included in the current line

These are explicitly not current-package guarantees:

- Native autonomous agent spawning in Open Scaffold core.
- Non-dry-run `osc work` execution as a stable guarantee; a future controller may be added only as an explicit, gated, adapter-owned execution path with env allowlists, timeouts, bounded logs, manifests, path containment, isolated worktrees, and human gates.
- Hosted orchestration services.
- Compliance certification or legal audit certification.
- Provider-specific model benchmarking or model-ranking claims.
- Tamper-evident external ledger anchoring.
- Network-backed GitHub/API verification for trace output.
- Marketplace, network registry, or installer behavior for runtimes.

Future work can explore those areas only through explicit plans, evidence, safety analysis, and owner approval.

## Versioning policy

Open Scaffold uses npm package versions as public distribution coordinates. The current `v0.31.x` line is intentionally pre-1.0: it communicates that the core work-record pattern is usable and the framework cleanup has narrowed/reduced the package surface, but the product is still earning its long-term stable contract.

The previously published `v1.0.x` packages remain immutable historical artifacts. They should be treated as an over-eager launch line, not as a reason to force every future change through mature-1.0 pressure. A future real 1.0 should be cut only after the adoption path, public package surfaces, runtime boundaries, and evidence/tracing primitives feel durable enough to sustain that promise.

### Patch releases

Patch releases may fix bugs, documentation drift, packaging defects, validation errors, or security posture without changing the public contract.

Examples:

- Correcting help output.
- Fixing platform-specific path handling.
- Tightening validation for malformed files while preserving valid existing projects.
- Updating dependencies within the supported Node engine range.

### Minor releases

While Open Scaffold remains below 1.0, minor releases may add commands, flags, docs, templates, schemas, or optional integrations. They may also tighten experimental surfaces when needed for product trust, with release notes calling out any migration risk.

Examples:

- Adding a new `osc` subcommand.
- Adding optional fields to run packets or evidence notes.
- Adding new scaffold tiers or templates.
- Adding optional cockpit transports.

### Future major releases

A future real 1.0 or later major release should be reserved for a deliberate maturity claim or a breaking change to stable-enough surfaces.

Examples:

- Changing the Status + seven content-heading plan schema in a way that invalidates existing plans.
- Renaming stable `.osc/` folders or changing folder-as-status semantics.
- Removing stable CLI commands or changing required arguments incompatibly.
- Changing `verify.sh --standard` or `--strict` so a previously valid stable scaffold becomes invalid without a migration path.

## Migration guidance

Future breaking changes must provide:

1. A documented reason for the break.
2. A migration guide or automated migration helper where practical.
3. A verification path that lets users prove the migrated scaffold is valid.
4. Release notes that call out stable, experimental, and removed surfaces.

## Publication gates

The owner must explicitly approve and perform or authorize these external side effects:

- npm publication for any new package version.
- GitHub Release creation or marking a release as **Latest**.
- Any website deployment or public launch announcement.

A version is live only after the registry/package smoke checks and GitHub Release truth are verified.

## Command maturity

The core surface is `osc help`; the full backend/lab surface is `osc help --all`.

Pivot note (plan 168): the core surface is `handoff` / `review` / `gate` plus
the structured-intent commands. `osc analyze` remains a synonym for `osc review`.
The old harness grammar, root adapter commands, root dispatch command, and
runtime-package `review`/`ultrareview` command names were removed/repositioned.
Migration recipe for external execution now stops at a reviewable run packet:

```bash
osc plan new <slug> --stage active
osc run .osc/plans/active/<slug>.md --runtime codex --workflow plan
# hand .osc/runs/RUN_ID/run.json to the external worker/coordinator, then record evidence
```

Use `osc run ... --dry-run` only to preview the run packet; rerun without
`--dry-run` only when you want the package written under `.osc/runs/`.

Labels:

- `stable` — day-one/day-two workflow path; safe for normal examples.
- `lab` — useful backend surface still proving product shape, runtime behavior, or evidence value.
- `advanced` — specialized maintenance, analysis, or power-user surface.
- `future` — direction only; not a current stable behavior.

Rules:

- Stable commands appear first in top-level help.
- Lab commands say what is experimental or structurally limited.
- Runtime/spawn-capable commands point at the trust boundaries.
- Help wording must not imply semantic correctness, compliance, merge/publish authority, or default runtime spawning.

Retired command migration notes live here: use `osc plan new/validate/move`, `osc run` for no-spawn run packets, `osc evidence collect`, `osc trace`, `osc verify --evidence-chain`, `osc review`, `osc gate`, external task trackers, and external runtime/coordinator routes instead of retired framework-cleanup commands.
