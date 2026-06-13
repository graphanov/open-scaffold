#!/usr/bin/env node
// Codex notify hook: capture the rollout for the Codex thread that emitted the
// notify event as an osc.ambient-work-record.v1 record without blocking Codex.
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
const tsxLoader = join(repoRoot, 'node_modules', 'tsx', 'dist', 'loader.mjs');

let event = {};
try {
  event = JSON.parse(process.argv[2] ?? '{}');
} catch {
  process.exit(0);
}

// Only act on turn-complete / end-style events; ignore the rest.
if (event.type && !/turn-complete|complete|end/.test(event.type)) process.exit(0);

function nestedString(source, keys) {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return nestedString(source.payload, keys);
}

function isDirectory(path) {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function findRolloutByThreadId(dir, threadId) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const candidate = findRolloutByThreadId(full, threadId);
      if (candidate) return candidate;
    } else if (
      entry.isFile() &&
      entry.name.startsWith('rollout-') &&
      entry.name.endsWith('.jsonl') &&
      entry.name.includes(threadId)
    ) {
      return full;
    }
  }
  return null;
}

const threadId = nestedString(event, ['thread-id', 'thread_id', 'threadId', 'session_id', 'sessionId']);
if (!threadId) process.exit(0);

const configuredCodexHome = process.env.CODEX_HOME?.trim();
const codexHome = configuredCodexHome || join(homedir(), '.codex');
const rollout = findRolloutByThreadId(join(codexHome, 'sessions'), threadId);
if (!rollout) process.exit(0);

const eventCwd = nestedString(event, ['cwd', 'workdir', 'working_directory', 'workingDirectory']);
const captureCwd = eventCwd && isDirectory(eventCwd) ? eventCwd : process.cwd();

const cliArgs = existsSync(distCli)
  ? [distCli]
  : existsSync(tsxLoader)
    ? ['--import', tsxLoader, join(repoRoot, 'src', 'cli.ts')]
    : null;
if (!cliArgs) process.exit(0);

spawnSync(process.execPath, [
  ...cliArgs,
  'capture',
  '--from', 'codex',
  '--transcript', rollout,
  '--hook-safe',
], { stdio: 'ignore', timeout: 30_000, cwd: captureCwd });

process.exit(0);
