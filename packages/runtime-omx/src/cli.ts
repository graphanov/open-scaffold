#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { runOmxRalplan, ValidationError } from './index.js';

export interface CliIO {
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function usage(): string {
  return [
    'Usage: open-scaffold-runtime-omx <path-to-run.json> [--out <dispatch-receipt.json>] [--allow-spawn] [--omx-command <path>]',
    '',
    'OMX $ralplan runtime package for Open Scaffold run packets.',
    'Default behavior validates the handoff shape and writes deterministic receipt/evidence artifacts without launching OMX or Codex.',
    'Use --allow-spawn to launch OMX explicitly after package, branch, version, and safety checks pass.',
  ].join('\n');
}

export function runCli(argv: string[], io: CliIO = {}): number {
  const stdout = io.stdout ?? ((message: string) => console.log(message));
  const stderr = io.stderr ?? ((message: string) => console.error(message));
  const args = [...argv];
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    stdout(usage());
    return args.length === 0 ? 1 : 0;
  }

  const runPacketPath = args.shift();
  let receiptPath: string | undefined;
  let allowSpawn = false;
  let omxCommand: string | undefined;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--out') {
      receiptPath = args.shift();
      if (!receiptPath) {
        stderr('runtime-omx error: --out requires a path');
        return 1;
      }
      continue;
    }
    if (arg === '--allow-spawn') {
      allowSpawn = true;
      continue;
    }
    if (arg === '--omx-command') {
      omxCommand = args.shift();
      if (!omxCommand) {
        stderr('runtime-omx error: --omx-command requires a path or command name');
        return 1;
      }
      continue;
    }
    stderr(`runtime-omx error: unknown argument ${arg}`);
    return 1;
  }

  try {
    const result = runOmxRalplan(runPacketPath!, { receiptPath, allowSpawn, omxCommand });
    stdout(`runtime-omx receipt written: ${result.receiptPath}`);
    stdout(`runtime-omx evidence written: ${result.evidencePath}`);
    if (result.logPath) stdout(`runtime-omx log written: ${result.logPath}`);
    if (result.receipt.status === 'dry_run') stdout('runtime-omx no-spawn preview complete');
    if (result.receipt.status === 'completed') stdout('runtime-omx OMX $ralplan launch completed');
    if (result.receipt.status === 'refused') {
      stderr(`runtime-omx launch refused: ${result.receipt.failure.code}: ${result.receipt.failure.message}`);
      return 1;
    }
    if (result.receipt.status === 'failed') {
      stderr(`runtime-omx launch failed: ${result.receipt.failure.code}: ${result.receipt.failure.message}`);
      return 1;
    }
    return 0;
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr(`runtime-omx validation failed: ${error.issues.join('; ')}`);
      return 1;
    }
    stderr(`runtime-omx error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

export function isCliEntrypoint(argv1: string | undefined, moduleUrl: string = import.meta.url): boolean {
  if (!argv1) return false;
  const normalizeEntrypoint = (value: string) => {
    const withoutFileScheme = value.startsWith('file://') ? value.slice('file://'.length) : value;
    return decodeURIComponent(withoutFileScheme).replace(/\\/g, '/').replace(/^\/([A-Za-z]:\/)/, '$1');
  };
  const resolveEntrypoint = (value: string) => {
    const normalized = normalizeEntrypoint(value);
    try {
      return realpathSync.native(normalized).replace(/\\/g, '/');
    } catch {
      return normalized;
    }
  };
  return resolveEntrypoint(argv1) === resolveEntrypoint(moduleUrl);
}

if (isCliEntrypoint(process.argv[1])) {
  process.exit(runCli(process.argv.slice(2)));
}
