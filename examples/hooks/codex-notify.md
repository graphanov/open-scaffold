# Codex capture via the `notify` hook

Codex can run an external program on lifecycle events via its `notify` config. On
`agent-turn-complete` (or session end), run `osc capture --from codex` against the
rollout named by the event `thread-id` so the finished session becomes an
`osc.ambient-work-record.v1` record — no worker cooperation, never modifying the rollout.

## How Codex `notify` works

Codex invokes the configured program with a single argument: a JSON string describing the
event, e.g.:

```json
{ "type": "agent-turn-complete", "thread-id": "…", "cwd": "/path/to/repo", "turn-id": "…", "input-messages": ["…"], "last-assistant-message": "…" }
```

Codex writes session rollouts to `${CODEX_HOME:-~/.codex}/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl`.
The notify program matches the rollout filename containing `thread-id`; if the event has
no thread id or the matching rollout is not present yet, it exits 0 without capturing
rather than risking the wrong concurrent session.

## Registration

Prefer the setup helper. It dry-runs by default and prints only generated setup data,
not unrelated local config values:

```bash
osc capture setup codex
osc capture setup codex --write
```

Manual fallback in `~/.codex/config.toml` (owner-local):

```toml
notify = ["/path/to/node", "/absolute/path/to/open-scaffold/examples/hooks/codex-notify.mjs"]
```

The helper inserts the top-level `notify` before the first table and refuses to rewrite
a different existing top-level `notify`. Absolute hook paths should point at an installed
package or checkout you intend to keep.

## Notify program (`codex-notify.mjs`)

The checked-in `examples/hooks/codex-notify.mjs` is the program referenced above. It:

- ignores non-complete events;
- finds `${CODEX_HOME:-~/.codex}/sessions/**/rollout-*<thread-id>*.jsonl` for the event thread;
- runs from event `cwd` when Codex provides it, so default output lands in the project scaffold;
- invokes this checkout's built `dist/cli.js` (or this checkout's absolute `tsx` loader in development);
- runs `osc capture --from codex --hook-safe`, so it can never break a Codex session.

## Boundary

The record is observed facts, not approval. Capture reads the rollout read-only and writes
one record under `.osc/state/ambient/` in an `.osc` repo (covered by `.osc/.gitignore`'s
`state/` rule), or the cwd outside an `.osc` repo.
