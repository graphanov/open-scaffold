#!/usr/bin/env node
import { runNoSpawnOmx, ValidationError } from './index.js';

export interface CliIO {
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function usage(): string {
  return [
    'Usage: open-scaffold-runtime-omx <path-to-run.json> [--out <dispatch-receipt.json>]',
    '',
    'No-spawn OMX $ralplan runtime package scaffold for Open Scaffold run packets.',
    'Validates the handoff shape and writes deterministic receipt/evidence artifacts without launching OMX or Codex.',
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
    stderr(`runtime-omx error: unknown argument ${arg}`);
    return 1;
  }

  try {
    const result = runNoSpawnOmx(runPacketPath!, { receiptPath });
    stdout(`runtime-omx no-spawn preview complete: ${result.receiptPath}`);
    stdout(`runtime-omx evidence written: ${result.evidencePath}`);
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
  return normalizeEntrypoint(argv1) === normalizeEntrypoint(moduleUrl);
}

if (isCliEntrypoint(process.argv[1])) {
  process.exit(runCli(process.argv.slice(2)));
}
