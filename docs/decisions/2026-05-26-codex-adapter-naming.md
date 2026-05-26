# Codex adapter naming: `codex` preset, `runtime-omx` adapter

## Decision

Open Scaffold now treats `--runtime codex` as the broad user-facing Codex preset.

That preset maps to the existing `omx-codex` lane and the current `packages/runtime-omx/` adapter package because OMX / oh-my-codex is the tested Codex harness path.

`--runtime omx` remains available as the explicit harness-name preset for operators who know they want the OMX path directly.

A separate direct `@open-scaffold/runtime-codex` package is deferred until source-grounded evidence shows a cleaner direct Codex adapter that can share the same `open-scaffold.dispatch-receipt.v1` receipt contract without weakening Open Scaffold's no-spawn/core-boundary rules.

## Why

The post-v1 adoption target is simple for users:

```bash
osc work "Add a /health endpoint with tests" --runtime codex
```

But the real tested adapter today is not a generic Codex package. It is `runtime-omx`, which validates and optionally launches the OMX / oh-my-codex `$ralplan` path. Hiding that behind a direct `runtime-codex` package too early would imply broader support than exists.

So the split is:

```text
codex = user-facing preset / product language
omx = explicit harness-name preset
runtime-omx = current adapter package and receipt producer
runtime-codex = future direct adapter only if evidence justifies it
```

## Boundary

This decision does not add core spawning. Open Scaffold core still packages run packets and records evidence expectations. Runtime launch remains adapter-owned and explicit.

The current `runtime-omx` package accepts both `runtimeSelection.runtime = "codex"` and `"omx"` for the first `$ralplan` proof lane, but it continues to emit `adapter_id = "runtime-omx"` and `runtime_backend = "omx"` so receipts stay truthful.
