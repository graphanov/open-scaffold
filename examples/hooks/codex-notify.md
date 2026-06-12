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

A minimal, hook-safe program. It reads the newest rollout and runs capture with
`--hook-safe`, so it can never break a Codex session.

```js
#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Only act on turn-complete / end-style events; ignore the rest.
let event = {};
try { event = JSON.parse(process.argv[2] ?? '{}'); } catch { process.exit(0); }
if (event.type && !/turn-complete|complete|end/.test(event.type)) process.exit(0);

// Find the newest rollout under ~/.codex/sessions/**.
const root = join(homedir(), '.codex', 'sessions');
function newestRollout(dir) {
  let best = null;
  if (!existsSync(dir)) return best;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const candidate = newestRollout(full);
      if (candidate && (!best || candidate.mtime > best.mtime)) best = candidate;
    } else if (entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) {
      const mtime = statSync(full).mtimeMs;
      if (!best || mtime > best.mtime) best = { path: full, mtime };
    }
  }
  return best;
}
const rollout = newestRollout(root);
if (!rollout) process.exit(0);

// Adjust this path to your open-scaffold checkout.
const distCli = '/absolute/path/to/open-scaffold/dist/cli.js';
spawnSync(process.execPath, [
  distCli, 'capture',
  '--from', 'codex',
  '--transcript', rollout.path,
  '--hook-safe',
], { stdio: 'ignore', timeout: 30_000 });
process.exit(0);
```

## Boundary

The record is observed facts, not approval. Capture reads the rollout read-only and writes
one record under `.osc-dev/ambient/` (or the cwd outside an `.osc` repo).
