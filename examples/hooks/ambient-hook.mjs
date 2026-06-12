#!/usr/bin/env node
// Claude Code SessionEnd (or Stop) hook: turn a finished session into an
// osc.ambient-work-record.v1 record by calling `osc capture --from claude-code`.
// Promoted from examples/spikes/ambient-hook.mjs (plan 170) to drive the product
// command instead of the spike extractor.
//
// Claude Code feeds hook JSON on stdin including transcript_path, session_id, and cwd.
// Records land under .osc-dev/ambient/<session-id>.json (gitignored owner notes).
// Owner-scoped registration (.claude/settings.local.json, gitignored):
//   { "hooks": { "SessionEnd": [ { "hooks": [ { "type": "command",
//     "command": "node examples/hooks/ambient-hook.mjs" } ] } ] } }
//
// The hook never blocks or fails the session: every exit is 0, and capture is invoked
// with --hook-safe so even a malformed transcript records nothing rather than erroring.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// examples/hooks -> repo root -> dist/cli.js (built) with a src fallback via tsx.
const repoRoot = join(here, '..', '..');
const distCli = join(repoRoot, 'dist', 'cli.js');

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
const cwd = payload.cwd && existsSync(join(payload.cwd, '.osc')) ? payload.cwd : process.cwd();

if (!transcript || !existsSync(transcript)) process.exit(0);

const cliArgs = existsSync(distCli)
  ? [distCli]
  : ['--import', 'tsx', join(repoRoot, 'src', 'cli.ts')];

spawnSync(process.execPath, [
  ...cliArgs,
  'capture',
  '--from', 'claude-code',
  '--transcript', transcript,
  '--session-id', sessionId,
  '--repo', cwd,
  '--hook-safe',
], { stdio: 'ignore', timeout: 30_000, cwd });

process.exit(0);
