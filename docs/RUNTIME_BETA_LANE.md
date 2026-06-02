# Runtime beta lane: Codex/OMX dispatch

This is the current beta lane for a hardened, reviewable runtime handoff. It is intentionally conservative: one explicit adapter, one run packet, one isolated worktree, bounded logs, restricted environment, and no commit/push/PR/merge/publish authority.

## Status

- Lane: Codex via the existing OMX package path.
- Maturity: beta/lab.
- Core command: `osc run` to create the run packet, then `osc dispatch` to invoke a reviewed adapter.
- Runtime package: `packages/runtime-omx/` / `@open-scaffold/runtime-omx` from the GitHub source tree.
- Default behavior: validate packet and write receipt/evidence. Real spawn remains separately gated by the runtime package and operator approval.

## Trust prerequisites

1. Use a non-main branch and isolated worktree.
2. Review `.osc/adapters/omx.json`.
3. Trust the adapter digest locally:

```bash
osc adapter check omx
osc adapter trust omx
osc adapter list --trusted
```

4. Ensure the adapter config uses restricted environment defaults:

```json
{
  "schemaVersion": "open-scaffold.adapter.v1",
  "id": "omx",
  "command": ["open-scaffold-runtime-omx"],
  "envAllowlist": ["PATH", "HOME", "TMPDIR"],
  "env": {
    "OPEN_SCAFFOLD_ADAPTER": "omx"
  },
  "timeoutMs": 600000,
  "maxStdoutBytes": 2000000,
  "maxStderrBytes": 2000000,
  "requiresWorktreeIsolation": true
}
```

Do not use `--allow-full-env` in reusable docs, workflows, or review examples.

## Demo flow

```bash
osc run .osc/plans/active/<plan-slug>.md \
  --runtime codex \
  --workflow plan \
  --repo "$PWD" \
  --worktree "../<repo>-<plan-slug>-worktree" \
  --branch "blueprint/<plan-slug>"

osc adapter check omx
osc adapter trust omx
osc dispatch .osc/runs/<run_id>/run.json --adapter omx
```

Expected dispatch output includes:

- `Adapter trusted: yes`
- `Environment: restricted`
- timeout/log-bound facts;
- receipt path under `.osc/runs/<run_id>/`;
- evidence paths under `.osc/runs/<run_id>/`.

## What success proves

A successful beta-lane run proves only that a reviewed adapter consumed a valid run packet, stayed within the declared environment/log/worktree boundaries, and produced structural receipt/evidence artifacts.

It does **not** prove:

- the agent implementation is correct;
- the task acceptance criteria passed;
- compliance or production readiness;
- merge/publish/release authority;
- that Open Scaffold core is a default runtime.

Postflight must still run project verification, inspect evidence, update `.osc/releases/` or the PR body, and ask for owner approval before any commit/push/PR/merge/publish/release/deploy action.

## Related docs

- [`docs/TRUST_BOUNDARIES.md`](TRUST_BOUNDARIES.md)
- [`docs/RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md)
- [`docs/RUNTIME_ADOPTION_WORKFLOW.md`](RUNTIME_ADOPTION_WORKFLOW.md)
- [`docs/SPAWNING_BOUNDARY.md`](SPAWNING_BOUNDARY.md)
