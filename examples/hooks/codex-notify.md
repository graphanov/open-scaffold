# Codex capture via the `notify` hook

Codex can run an external program on lifecycle events via its `notify` config. On
`agent-turn-complete` (or session end), run `osc capture --from codex` against the newest
rollout so the finished session becomes an `osc.ambient-work-record.v1` record — no worker
cooperation, never modifying the rollout.

## How Codex `notify` works

Codex invokes the configured program with a single argument: a JSON string describing the
event, e.g.:

```json
{ "type": "agent-turn-complete", "turn-id": "…", "input-messages": ["…"], "last-assistant-message": "…" }
```

Codex writes session rollouts to `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl`.
The notify program picks the newest rollout and captures it.

## Registration

In `~/.codex/config.toml` (owner-local):

```toml
notify = ["node", "/absolute/path/to/open-scaffold/examples/hooks/codex-notify.mjs"]
```

## Notify program (`codex-notify.mjs`)

The checked-in `examples/hooks/codex-notify.mjs` is the program referenced above. It:

- ignores non-complete events;
- finds the newest `~/.codex/sessions/**/rollout-*.jsonl`;
- invokes this checkout's built `dist/cli.js` (or `src/cli.ts` via `tsx` in development);
- runs `osc capture --from codex --hook-safe`, so it can never break a Codex session.

## Boundary

The record is observed facts, not approval. Capture reads the rollout read-only and writes
one record under `.osc-dev/ambient/` (or the cwd outside an `.osc` repo).
