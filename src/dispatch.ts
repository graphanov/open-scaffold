import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { findScaffoldRoot } from './scaffold.js';

export class DispatchUsageError extends Error {}

interface AdapterConfigFile {
  schemaVersion?: unknown;
  id?: unknown;
  command?: unknown;
}

export interface DispatchOptions {
  adapterId: string;
}

export interface DispatchResult {
  adapterId: string;
  runId: string;
  runPacketPath: string;
  receiptPath: string | null;
  evidencePaths: string[];
  stdoutLogPath: string;
  stderrLogPath: string;
  exitStatus: number | null;
  signal: string | null;
}

interface AdapterDefinition {
  id: string;
  command: string[];
}

const forbiddenAdapterExecutables = new Set([
  'npx',
  'npm',
  'pnpm',
  'pnpx',
  'yarn',
  'bun',
  'bunx',
  'curl',
  'wget',
  'sh',
  'bash',
  'zsh',
  'fish',
  'cmd',
  'cmd.exe',
  'powershell',
  'powershell.exe',
  'pwsh',
  'env',
  'corepack',
]);

function normalizeAdapterExecutableName(command: string): string {
  let name = basename(command.replace(/\\/g, '/')).toLowerCase();
  for (const extension of ['.cmd', '.exe', '.bat', '.com']) {
    if (name.endsWith(extension)) {
      name = name.slice(0, -extension.length);
      break;
    }
  }
  return name;
}

function isSafeId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes('..');
}

function ensureInside(parent: string, child: string, message: string): void {
  const rel = relative(parent, child);
  if (rel === '' || rel === '.') return;
  if (rel.startsWith('..') || isAbsolute(rel)) throw new DispatchUsageError(message);
}

function toRelative(root: string, path: string | null): string | null {
  if (!path) return null;
  return relative(root, path).split('\\').join('/');
}

function resolveRunPacket(start: string, runPacketArg: string): { root: string; runPacketPath: string; runDir: string; runId: string } {
  const candidate = isAbsolute(runPacketArg) ? resolve(runPacketArg) : resolve(start, runPacketArg);
  if (!existsSync(candidate)) throw new DispatchUsageError(`Run packet does not exist: ${runPacketArg}`);
  const runPacketPath = realpathSync.native(candidate);
  if (basename(runPacketPath) !== 'run.json') throw new DispatchUsageError('Dispatch input must be a run.json file.');
  const root = findScaffoldRoot(dirname(runPacketPath)) ?? findScaffoldRoot(start);
  if (!root) throw new DispatchUsageError(`No Open Scaffold root found for run packet: ${runPacketArg}`);
  const realRoot = realpathSync.native(root);
  ensureInside(join(realRoot, '.osc', 'runs'), runPacketPath, 'Run packet must live under .osc/runs.');
  const runDir = dirname(runPacketPath);
  const raw = JSON.parse(readFileSync(runPacketPath, 'utf8')) as { runId?: unknown; schemaVersion?: unknown };
  if (raw.schemaVersion !== 'open-scaffold.run.v1') throw new DispatchUsageError('Dispatch input must use schemaVersion open-scaffold.run.v1.');
  if (typeof raw.runId !== 'string' || !raw.runId.trim()) throw new DispatchUsageError('Dispatch input is missing runId.');
  return { root: realRoot, runPacketPath, runDir, runId: raw.runId };
}

function adapterConfigPath(root: string, adapterId: string): string {
  return join(root, '.osc', 'adapters', `${adapterId}.json`);
}

function loadProjectAdapter(root: string, adapterId: string): AdapterDefinition | null {
  const path = adapterConfigPath(root, adapterId);
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as AdapterConfigFile;
  if (parsed.schemaVersion !== 'open-scaffold.adapter.v1') {
    throw new DispatchUsageError(`Adapter ${adapterId} has unsupported schemaVersion; expected open-scaffold.adapter.v1.`);
  }
  if (parsed.id !== adapterId) throw new DispatchUsageError(`Adapter config id mismatch: expected ${adapterId}.`);
  if (!Array.isArray(parsed.command) || parsed.command.length === 0 || parsed.command.some((part) => typeof part !== 'string' || !part.trim())) {
    throw new DispatchUsageError(`Adapter ${adapterId} command must be a non-empty string array.`);
  }
  return { id: adapterId, command: parsed.command };
}

function resolveAdapter(root: string, adapterId: string): AdapterDefinition {
  if (!isSafeId(adapterId)) throw new DispatchUsageError(`Unsafe adapter id: ${adapterId}`);
  const adapter = loadProjectAdapter(root, adapterId);
  if (!adapter) throw new DispatchUsageError(`Unknown adapter: ${adapterId}`);
  const first = adapter.command[0];
  if (!first) throw new DispatchUsageError(`Adapter ${adapter.id} command is empty.`);
  const executableName = normalizeAdapterExecutableName(first);
  if (forbiddenAdapterExecutables.has(executableName)) {
    throw new DispatchUsageError(`Adapter ${adapter.id} uses forbidden adapter executable: ${executableName}`);
  }
  if (/^https?:/i.test(first)) throw new DispatchUsageError(`Adapter ${adapter.id} command must be local, not a URL.`);
  return adapter;
}

function assertNoSymlinksUnder(path: string, message: string): void {
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(path);
  } catch {
    return;
  }
  if (stat.isSymbolicLink()) throw new DispatchUsageError(message);
  if (!stat.isDirectory()) return;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    assertNoSymlinksUnder(join(path, entry.name), message);
  }
}

function assertSafeExistingOutput(root: string, runDir: string, outputPath: string, message: string): string {
  const candidate = resolve(outputPath);
  ensureInside(runDir, candidate, message);
  ensureInside(root, candidate, 'Adapter output path must stay under the scaffold root.');
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(candidate);
  } catch {
    throw new DispatchUsageError('Adapter-reported output path does not exist.');
  }
  if (stat.isSymbolicLink()) throw new DispatchUsageError('Adapter output path must not be a symlink.');
  const realCandidate = realpathSync.native(candidate);
  ensureInside(runDir, realCandidate, message);
  ensureInside(root, realCandidate, 'Adapter output path must stay under the scaffold root.');
  return realCandidate;
}

function resolveOutputPath(root: string, runDir: string, value: string): string {
  const candidate = isAbsolute(value) ? resolve(value) : resolve(root, value);
  return assertSafeExistingOutput(root, runDir, candidate, 'Adapter-reported output path must stay under the run directory.');
}

function extractReportedPaths(output: string, kind: 'receipt' | 'evidence'): string[] {
  const pattern = kind === 'receipt' ? /receipt written:\s*(.+)$/gim : /evidence written:\s*(.+)$/gim;
  return Array.from(output.matchAll(pattern), (match) => match[1]?.trim()).filter((value): value is string => Boolean(value));
}

function extractReportedPath(output: string, kind: 'receipt' | 'evidence'): string | null {
  return extractReportedPaths(output, kind).at(-1) ?? null;
}

function discoverReceipt(root: string, runDir: string, stdout: string): string | null {
  const reported = extractReportedPath(stdout, 'receipt');
  return reported ? resolveOutputPath(root, runDir, reported) : null;
}

function discoverEvidence(root: string, runDir: string, stdout: string): string[] {
  return extractReportedPaths(stdout, 'evidence').map((reported) => resolveOutputPath(root, runDir, reported));
}

function prepareDispatchDir(runDir: string): string {
  const dispatchDir = join(runDir, 'dispatch');
  if (existsSync(dispatchDir) && lstatSync(dispatchDir).isSymbolicLink()) throw new DispatchUsageError('Dispatch log directory must not be a symlink.');
  mkdirSync(dispatchDir, { recursive: true });
  const realDispatchDir = realpathSync.native(dispatchDir);
  ensureInside(runDir, realDispatchDir, 'Dispatch log directory must stay under the run directory.');
  return realDispatchDir;
}

function writeLogFile(dispatchDir: string, adapterId: string, kind: 'stdout' | 'stderr', content: string): string {
  const path = join(dispatchDir, `${adapterId}-${kind}.log`);
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new DispatchUsageError('Dispatch log path must not be a symlink.');
  writeFileSync(path, content, 'utf8');
  return path;
}

export function runDispatch(runPacketArg: string, options: DispatchOptions, start = process.cwd()): DispatchResult {
  if (!runPacketArg) throw new DispatchUsageError('Missing required argument: run-json');
  const run = resolveRunPacket(start, runPacketArg);
  assertNoSymlinksUnder(run.runDir, 'Run directory must not contain symlinks before adapter dispatch.');
  const adapter = resolveAdapter(run.root, options.adapterId);
  prepareDispatchDir(run.runDir);

  const result = spawnSync(adapter.command[0]!, [...adapter.command.slice(1), run.runPacketPath], {
    cwd: run.root,
    encoding: 'utf8',
    env: process.env,
  });
  const stdout = String(result.stdout ?? '');
  const stderr = result.error ? String(result.error.message) : String(result.stderr ?? '');
  const finalDispatchDir = prepareDispatchDir(run.runDir);
  const stdoutLogPath = writeLogFile(finalDispatchDir, adapter.id, 'stdout', stdout);
  const stderrLogPath = writeLogFile(finalDispatchDir, adapter.id, 'stderr', stderr);

  const receiptPath = discoverReceipt(run.root, run.runDir, stdout);
  const evidencePaths = discoverEvidence(run.root, run.runDir, stdout);

  return {
    adapterId: adapter.id,
    runId: run.runId,
    runPacketPath: run.runPacketPath,
    receiptPath,
    evidencePaths,
    stdoutLogPath,
    stderrLogPath,
    exitStatus: result.status,
    signal: result.signal,
  };
}

export function formatDispatchSummary(result: DispatchResult, root: string): string {
  const evidence = result.evidencePaths.length ? result.evidencePaths.map((path) => `Evidence: ${toRelative(root, path)}`).join('\n') : 'Evidence: (none reported)';
  return [
    'Open Scaffold dispatch complete',
    `Adapter: ${result.adapterId}`,
    `Run ID: ${result.runId}`,
    `Run packet: ${toRelative(root, result.runPacketPath)}`,
    `Dispatch receipt: ${toRelative(root, result.receiptPath) ?? '(none reported)'}`,
    evidence,
    `Stdout log: ${toRelative(root, result.stdoutLogPath)}`,
    `Stderr log: ${toRelative(root, result.stderrLogPath)}`,
    `Exit status: ${result.exitStatus ?? '(none)'}`,
    result.signal ? `Signal: ${result.signal}` : null,
    'Next: inspect the adapter evidence, run verification, then ask before commit/push/PR/merge/publish.',
    '',
  ].filter((line): line is string => line !== null).join('\n');
}
