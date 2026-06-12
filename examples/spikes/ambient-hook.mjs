#!/usr/bin/env node
// Spike A live wiring (plan 167, owner answer F1): a Claude Code hook adapter
// that turns a finished session into an ambient work record with zero worker
// cooperation. Register it as a SessionEnd (or Stop) hook; Claude Code feeds
// hook JSON on stdin including transcript_path and session_id, and this
// adapter runs the existing transcript extractor on it.
//
// Owner-scoped registration example (.claude/settings.local.json, gitignored):
//   { "hooks": { "SessionEnd": [ { "hooks": [ { "type": "command",
//     "command": "node examples/spikes/ambient-hook.mjs" } ] } ] } }
//
// Records land under .osc-dev/ambient/ (gitignored owner notes), one file per
// session. The hook never blocks or fails the session: every exit is 0.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const extractor = join(here, 'ambient-from-transcript.mjs');

let payload = {};
try {
  const stdin = await new Promise((resolvePromise) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolvePromise(data));
    process.stdin.on('error', () => resolvePromise(data));
  });
  payload = JSON.parse(stdin);
} catch {
  // Malformed or missing hook payload: nothing to record, never break the session.
  process.exit(0);
}

const transcript = payload.transcript_path;
const sessionId = payload.session_id ?? 'unknown-session';
const repoRoot = payload.cwd && existsSync(join(payload.cwd, '.osc')) ? payload.cwd : process.cwd();

if (!transcript || !existsSync(transcript)) process.exit(0);

const outDir = join(repoRoot, '.osc-dev', 'ambient');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${sessionId}.json`);

spawnSync(process.execPath, [extractor, '--transcript', transcript, '--out', out], {
  stdio: 'ignore',
  timeout: 30_000,
});
process.exit(0);
