# Open Scaffold stability

This page defines what Open Scaffold v1.0.0 means for adopters.

The short version: the repo protocol, folder state machine, core plan schema, evidence notes, and day-two CLI helpers are the stable contract. Runtime launch, provider-specific automation, and external cockpit transports remain opt-in or experimental unless a later release explicitly promotes them.

## Release status

- Repository candidate on `main`: `1.0.0`.
- Live npm package truth: check `npm view open-scaffold version dist-tags --json`.
- Live GitHub release truth: check the GitHub Releases page and the release marked **Latest**.

The repository may carry `package.json` version `1.0.0` before the owner completes the external publication gates. Do not treat repo version alone as proof that npm publication or GitHub Release latest movement has happened.

## Stable in v1.0.0

These surfaces are covered by semantic-versioning expectations.

### Repository protocol

- `MISSION.md` as mission/goals/non-goals/changelog source of truth.
- `ROADMAP.md` as direction and product-history source of truth.
- `.osc/plans/{active,backlog,blocked,done}/` as the folder state machine.
- The 7-section plan schema in `.osc/plans/handoff-template.md`.
- Mechanical amendments and closures through `osc amend`, `osc close`, `./amend.sh`, and `./close.sh`.
- `.osc/releases/` as curated release/evidence notes.
- `.osc/runs/<run_id>/run.json` as a handoff package format produced by core commands.

### CLI and shell floor

The stable day-two CLI surface is:

- `osc init`
- `osc status`
- `osc plan new`
- `osc plan validate`
- `osc plan move`
- `osc amend`
- `osc close`
- `osc evidence new`
- `osc evidence collect`
- `osc verify`

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

## Experimental in v1.0.0

These surfaces are usable but not promised as final API shape. They may change in minor versions when the change is additive or in a future major version if the contract changes.

- Runtime profiles and runtime selection beyond run-packet metadata.
- `osc run`, `osc delegate`, `osc review`, and `osc ultrareview` beyond their current no-spawn artifact-generation role.
- Evaluation and audit envelope helpers.
- Optional MCP server interface.
- Glass cockpit webhook examples for Discord and Slack.
- Local task database helpers.
- TUI or web dashboards.
- Runtime-specific packages such as `packages/runtime-omx/`.
- Python reference parser packaging until it is promoted through separate packaging evidence.

Experimental does not mean unsupported; it means users should avoid building irreversible external dependencies on exact output shapes without pinning the package version and reading the relevant docs.

## Future / not included in v1.0.0

These are explicitly not v1.0.0 guarantees:

- Native autonomous agent spawning in Open Scaffold core.
- Hosted orchestration services.
- Compliance certification or legal audit certification.
- Provider-specific model benchmarking or model-ranking claims.
- Tamper-evident external ledger anchoring.
- Marketplace, network registry, or installer behavior for runtimes.

Future work can explore those areas only through explicit plans, evidence, safety analysis, and owner approval.

## Semantic versioning policy

Open Scaffold uses semver for the public npm package and core repository protocol.

### Patch releases

Patch releases may fix bugs, documentation drift, packaging defects, validation errors, or security posture without changing the public contract.

Examples:

- Correcting help output.
- Fixing platform-specific path handling.
- Tightening validation for malformed files while preserving valid existing projects.
- Updating dependencies within the supported Node engine range.

### Minor releases

Minor releases may add commands, flags, docs, templates, schemas, or optional integrations without breaking existing valid projects.

Examples:

- Adding a new `osc` subcommand.
- Adding optional fields to run packets or evidence notes.
- Adding new scaffold tiers or templates.
- Adding optional cockpit transports.

### Major releases

Major releases are required for breaking changes to stable surfaces.

Examples:

- Changing the 7-section plan schema in a way that invalidates existing plans.
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

- `npm publish` for `open-scaffold@1.0.0`.
- GitHub Release creation or marking `v1.0.0` as **Latest**.
- Any website deployment or public launch announcement.

Until those gates happen, v1.0.0 is a repository release candidate, not a live public package release.
