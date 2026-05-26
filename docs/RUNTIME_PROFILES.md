# Runtime Profiles

Runtime profiles are the configuration layer behind `--runtime`. They make runtime selection declarative and extensible without making Open Scaffold core an installer, marketplace, or process supervisor.

A runtime profile is a data record behind `--runtime`. It tells Open Scaffold how a selected execution target, or lane, should be recorded in a `run.json` package (run packet). A coordinator or adapter may later consume that package and launch the real runtime outside core.

```text
User selects a runtime / outside tool
  -> Open Scaffold reads its runtime profile
  -> Open Scaffold creates the run.json work package (run packet)
  -> Adapter/coordinator launches the actual runtime outside core
  -> Runtime does the work
  -> Evidence comes back into Open Scaffold
```

Layer map:

- [`RUNTIME_SELECTION.md`](RUNTIME_SELECTION.md) — user-facing `--runtime` / `--workflow` choice.
- `RUNTIME_PROFILES.md` — profile schema, built-ins, and project-local `.osc/runtimes/*.json`.
- [`RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md) — adapter/coordinator responsibilities after the `run.json` package exists.
- [`AGENTIC_RUNTIME_LAYER.md`](AGENTIC_RUNTIME_LAYER.md) — accepted executable architecture: in-repo agentic runtime packages, OMX first.

Keep the roles separate:

- **Profile** = declarative data that records a lane/workflow in a run packet.
- **Adapter / agentic runtime package** = consumer that may translate, preview, or launch that packet when explicitly allowed.
- **Launch** = outside Open Scaffold core.

## Commands

```bash
osc runtimes list
osc runtimes list --json
osc runtimes show codex
osc runtimes show omx
osc run .osc/plans/active/001-demo.md --runtime codex --workflow plan
```

`osc runtimes list` prints the visible profile id, source, executor lane, status, and display name as TSV for quick terminal scans. `osc runtimes list --json` prints the same summary as parseable JSON for coordinators and automation.

`osc runtimes show <id>` prints the selected profile JSON plus its source.

## Profile sources

Runtime profiles currently resolve from two scopes:

1. **Built-in profiles** shipped with Open Scaffold:
   - `omc` — OMC / oh-my-claudecode lane for Claude Code-oriented workflows.
   - `codex` — broad user-facing Codex preset; currently backed by the OMX / oh-my-codex adapter path.
   - `omx` — explicit OMX / oh-my-codex harness-name lane for Codex-oriented workflows.
   - `plain` — runtime-neutral prompt package for any capable agent.
   - `human` — manual execution with evidence gates.
   - `custom` — placeholder for adapter-defined execution.
2. **Project-local profiles** under `.osc/runtimes/*.json`.

Project-local profiles are checked into the repo and should be reviewed like other project configuration. They are useful for company agents, private wrappers, or experimental runtimes that are not built into Open Scaffold.

Built-in profile ids are reserved. A project-local profile cannot silently override `omc`, `codex`, `omx`, `plain`, `human`, or `custom`.

## Runtime profile schema

Minimal project-local example:

```json
{
  "schemaVersion": "open-scaffold.runtime-profile.v1",
  "id": "company-review-bot",
  "displayName": "Company Review Bot",
  "lane": "plain-agent",
  "status": "user-defined",
  "description": "Project-local review bot profile.",
  "links": {
    "homepage": "https://internal.example.com/review-bot"
  },
  "workflows": {
    "plan": "company-review-bot plan",
    "execute": "company-review-bot run"
  },
  "defaults": {
    "workflow": "plan",
    "harnessSkill": "company-review-bot plan",
    "operatorSurface": "none"
  },
  "install": {
    "humanHint": "Install through the internal developer portal.",
    "auto": false
  },
  "launch": {
    "owner": "external-adapter",
    "commandTemplate": "company-review-bot run <run.json>",
    "expectedAdapterId": null,
    "spawning": false
  },
  "evidence": {
    "receiptSchema": "open-scaffold.dispatch-receipt.v1",
    "expectedPaths": [".osc/runs/<run_id>/dispatch-receipt.json"]
  },
  "compatibility": {
    "minScaffoldSchema": "open-scaffold.run.v1"
  },
  "lastReviewed": "2026-05-15",
  "notes": "User-defined profile. Open Scaffold core validates the package; the adapter owns runtime behavior."
}
```

### Required fields

- `schemaVersion`: must be `open-scaffold.runtime-profile.v1`.
- `id`: lowercase profile id used by `--runtime <id>`.
- `displayName`: human-readable name.
- `lane`: one of `omc-claude`, `omx-codex`, `plain-agent`, `human`, or `custom`.
- `status`: one of `builtin`, `adapter-candidate` (possible external adapter, not certified core integration), or `user-defined`.
- `description`: short public-safe description.

### Workflow mapping

`workflows` maps Open Scaffold workflow names to the runtime/harness command token — the runtime command or mode — that an adapter should use.

Supported workflow keys are:

- `interview`
- `plan`
- `team`
- `loop`
- `execute`
- `goal`
- `custom`

For example, the built-in `codex` and `omx` profiles map `plan` to `$ralplan`; the built-in `omc` profile maps `plan` to `/ralplan`.

If a profile has `defaults.workflow`, then `osc run --runtime <id>` can infer the workflow when the user does not provide `--workflow`.

## Security and boundary rules

Runtime profiles are treated as untrusted project configuration.

In v0:

- Profiles are JSON data only.
- Open Scaffold core validates profiles before use.
- `install.auto` must be `false`.
- `launch.spawning` must be `false`.
- Open Scaffold may display `install.humanHint` or `launch.commandTemplate`, but it does not execute them.
- Profiles cannot grant commit, push, merge, or publish authority.
- Runtime-local logs/session state are forensic — useful for investigation, not durable project truth — until promoted into `.osc/runs`, tracked evidence docs, GitHub artifacts, or release notes.

This is deliberate. Open Scaffold's job is to preserve the source-of-truth chain and package dispatchable intent. Runtime-specific adapters own installation, authentication, session lifecycle, tmux/process management, and provider-specific launch details.

## OMC, Codex, OMX, GSD, and custom runtimes

OMC, Codex, and OMX are built-in adapter-candidate profiles — selectable lane metadata with fake/local fixture coverage for their lane tokens, not certified launch integrations and not evidence that OMC/OMX/Codex processes were run.

The current Codex-first naming decision is: `codex` is the broad user-facing preset; `omx` is the explicit harness-name preset; both map to `omx-codex` and the same `$ralplan` workflow token today.

The accepted first executable package track is [`packages/runtime-omx/`](https://github.com/graphanov/open-scaffold/tree/main/packages/runtime-omx): an in-repo GitHub source package that consumes the `codex` or `omx` profile data, validates `$ralplan` as the first workflow, writes receipt/evidence without spawning by default, and launches only through an explicit `--allow-spawn` package gate. It is not included in the root `open-scaffold` npm payload today; separate runtime-package publication remains owner-gated.

A separate direct `runtime-codex` package is deferred until source-grounded evidence shows a cleaner direct Codex adapter that preserves the same no-spawn and dispatch-receipt boundaries.

GSD and other frameworks can be represented as project-local `user-defined` profiles today. They should not be described as certified or built-in integrations until an adapter has passed the conformance expectations and produced public evidence.

## Non-goals for runtime profiles v0

Runtime profiles v0 does not add:

- `osc runtimes install`
- `osc runtimes add https://...`
- hosted registries or marketplace behavior
- network fetching
- arbitrary script execution
- automatic runtime spawning
- credential handling
- model/task benchmarking claims

Those are future roadmap questions that require separate safety design, adapter evidence, and owner approval.
