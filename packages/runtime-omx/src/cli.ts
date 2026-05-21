#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { runOmxRalplan, ValidationError } from './index.js';

export interface CliIO {
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function usage(): string {
  return [
    'Usage: open-scaffold-runtime-omx <path-to-run.json> [--out <dispatch-receipt.json>] [--evolution-loop <dir> --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text>] [--allow-spawn] [--omx-command <path>]',
    '',
    'OMX $ralplan runtime package for Open Scaffold run packets.',
    'Default behavior validates the handoff shape and writes deterministic receipt/evidence artifacts without launching OMX or Codex.',
    'Use --allow-spawn to launch OMX explicitly after package, branch, version, and safety checks pass.',
    'Use --evolution-loop <dir> with --decision and --rationale to print an explicit osc evolve record command; this does not mutate the ledger.',
  ].join('\n');
}

const EVOLUTION_DECISIONS = ['promote', 'reject', 'retry', 'block'] as const;
type EvolutionDecision = (typeof EVOLUTION_DECISIONS)[number];

function isEvolutionDecision(value: string | undefined): value is EvolutionDecision {
  return Boolean(value) && (EVOLUTION_DECISIONS as readonly string[]).includes(value!);
}

function toPosix(path: string): string {
  return path.split('\\').join('/');
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function pathForRepoRootCommand(repoRoot: string, inputPath: string): string {
  const absolute = isAbsolute(inputPath) ? resolve(inputPath) : resolve(process.cwd(), inputPath);
  const rel = relative(repoRoot, absolute);
  if (rel === '' || rel === '.') return '.';
  if (!rel.startsWith('..') && !isAbsolute(rel)) return toPosix(rel);
  return toPosix(absolute);
}

function renderRepoRootCommand(repoRoot: string, args: string[]): string {
  return `cd ${shellQuote(repoRoot)} && ${args.map(shellQuote).join(' ')}`;
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
  let evolutionLoop: string | undefined;
  let evolutionDecision: EvolutionDecision | undefined;
  let evolutionScore: number | undefined;
  let evolutionRationale: string | undefined;
  let evolutionOnlyFlagUsed = false;
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
    if (arg === '--evolution-loop') {
      evolutionLoop = args.shift();
      if (!evolutionLoop) {
        stderr('runtime-omx error: --evolution-loop requires a loop directory');
        return 1;
      }
      continue;
    }
    if (arg === '--decision') {
      evolutionOnlyFlagUsed = true;
      const value = args.shift();
      if (!isEvolutionDecision(value)) {
        stderr(`runtime-omx error: --decision must be one of: ${EVOLUTION_DECISIONS.join(', ')}`);
        return 1;
      }
      evolutionDecision = value;
      continue;
    }
    if (arg === '--score') {
      evolutionOnlyFlagUsed = true;
      const raw = args.shift();
      const parsed = Number(raw);
      if (!raw || !Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        stderr('runtime-omx error: --score requires a number between 0 and 1');
        return 1;
      }
      evolutionScore = parsed;
      continue;
    }
    if (arg === '--rationale') {
      evolutionOnlyFlagUsed = true;
      evolutionRationale = args.shift();
      if (!evolutionRationale) {
        stderr('runtime-omx error: --rationale requires text');
        return 1;
      }
      continue;
    }
    stderr(`runtime-omx error: unknown argument ${arg}`);
    return 1;
  }

  if (!evolutionLoop && evolutionOnlyFlagUsed) {
    stderr('runtime-omx error: --decision, --score, and --rationale require --evolution-loop so evolution intent is not silently ignored.');
    return 1;
  }
  if (evolutionLoop && (!evolutionDecision || !evolutionRationale)) {
    stderr('runtime-omx error: --evolution-loop requires --decision and --rationale so adapter output is not recorded as fake evidence.');
    return 1;
  }

  try {
    const result = runOmxRalplan(runPacketPath!, { receiptPath, allowSpawn, omxCommand });
    stdout(`runtime-omx receipt written: ${result.receiptPath}`);
    stdout(`runtime-omx evidence written: ${result.evidencePath}`);
    if (result.logPath) stdout(`runtime-omx log written: ${result.logPath}`);
    if (evolutionLoop && evolutionDecision && evolutionRationale) {
      const repoRoot = result.receipt.working_directory;
      const loopPath = pathForRepoRootCommand(repoRoot, evolutionLoop);
      const receiptPathForCommand = pathForRepoRootCommand(repoRoot, result.receiptPath);
      const args = [
        'osc',
        'evolve',
        'record',
        loopPath,
        '--run',
        result.receipt.run_packet_path,
        '--receipt',
        receiptPathForCommand,
        ...result.receipt.artifacts.flatMap((artifact) => ['--evidence', artifact]),
        '--decision',
        evolutionDecision,
        ...(evolutionScore !== undefined ? ['--score', String(evolutionScore)] : []),
        '--rationale',
        evolutionRationale,
      ];
      stdout('runtime-omx evolution record command:');
      stdout(renderRepoRootCommand(repoRoot, args));
      stdout('runtime-omx did not mutate .osc/evolution; run the command explicitly to record the attempt.');
    }
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
