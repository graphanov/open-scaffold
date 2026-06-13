#!/usr/bin/env node
// Codex notify hook: capture the newest Codex rollout as an
// osc.ambient-work-record.v1 record without blocking the Codex session.
// Register from ~/.codex/config.toml with:
//   notify = ["node", "/absolute/path/to/open-scaffold/examples/hooks/codex-notify.mjs"]

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const distCli = join(repoRoot, 'dist', 'cli.js');

let event = {};
try {
  event = JSON.parse(process.argv[2] ?? '{}');
} catch {
  process.exit(0);
}

// Only act on turn-complete / end-style events; ignore the rest.
if (event.type && !/turn-complete|complete|end/.test(event.type)) process.exit(0);

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

const rollout = newestRollout(join(homedir(), '.codex', 'sessions'));
if (!rollout) process.exit(0);

const cliArgs = existsSync(distCli)
  ? [distCli]
  : ['--import', 'tsx', join(repoRoot, 'src', 'cli.ts')];

spawnSync(process.execPath, [
  ...cliArgs,
  'capture',
  '--from', 'codex',
  '--transcript', rollout.path,
  '--hook-safe',
], { stdio: 'ignore', timeout: 30_000, cwd: process.cwd() });

process.exit(0);
