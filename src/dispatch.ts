import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { findScaffoldRoot } from './scaffold.js';
import { assertAdapterTrusted, type AdapterTrustStatus } from './adapter-trust.js';
import { redactSecrets } from './redaction.js';

export class DispatchUsageError extends Error {}

interface AdapterConfigFile {
  schemaVersion?: unknown;
  id?: unknown;
  command?: unknown;
  envAllowlist?: unknown;
  env?: unknown;
  timeoutMs?: unknown;
  maxStdoutBytes?: unknown;
  maxStderrBytes?: unknown;
  requiresWorktreeIsolation?: unknown;
}

export interface DispatchOptions {
  adapterId: string;
  allowFullEnv?: boolean;
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
  envMode: 'restricted' | 'full-unsafe';
  envKeys: string[];
  unsafeEnvWarning: string | null;
  timeoutMs: number;
  timedOut: boolean;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  adapterTrusted: boolean;
  adapterDigest: string;
  worktreeIsolation: 'not-required' | 'enforced';
}

interface AdapterDefinition {
  id: string;
  command: string[];
  envAllowlist: string[];
  env: Record<string, string>;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  requiresWorktreeIsolation: boolean;
}

interface AdapterEnvBuildResult {
  env: NodeJS.ProcessEnv;
  mode: 'restricted' | 'full-unsafe';
  keys: string[];
  warning: string | null;
}

interface TruncatedLog {
  content: string;
  truncated: boolean;
}

const defaultAdapterEnvAllowlist = ['PATH'];
const defaultAdapterTimeoutMs = 10 * 60 * 1000;
const defaultAdapterMaxLogBytes = 2_000_000;
const maxAdapterTimeoutMs = 30 * 60 * 1000;
const maxAdapterLogBytes = 10_000_000;
const maxAdapterLogSlackBytes = 64 * 1024;
const maxAdapterProcessBufferBytes = maxAdapterLogBytes * 2 + maxAdapterLogSlackBytes;
const safeEnvNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const envControlCharPattern = /[\u0000-\u001F\u007F]/;

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

function isInsideOrSame(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || rel === '.' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function ensureInside(parent: string, child: string, message: string): void {
  if (!isInsideOrSame(parent, child)) throw new DispatchUsageError(message);
}

function toRelative(root: string, path: string | null): string | null {
  if (!path) return null;
  return relative(root, path).split('\\').join('/');
}

function resolveRunPacket(start: string, runPacketArg: string): { root: string; runPacketPath: string; runDir: string; runId: string; runtime: { worktreePath: string | null; branch: string | null; repoPath: string | null } } {
  const candidate = isAbsolute(runPacketArg) ? resolve(runPacketArg) : resolve(start, runPacketArg);
  if (!existsSync(candidate)) throw new DispatchUsageError(`Run packet does not exist: ${runPacketArg}`);
  const runPacketPath = realpathSync.native(candidate);
  if (basename(runPacketPath) !== 'run.json') throw new DispatchUsageError('Dispatch input must be a run.json file.');
  const root = findScaffoldRoot(dirname(runPacketPath)) ?? findScaffoldRoot(start);
  if (!root) throw new DispatchUsageError(`No Open Scaffold root found for run packet: ${runPacketArg}`);
  const realRoot = realpathSync.native(root);
  ensureInside(join(realRoot, '.osc', 'runs'), runPacketPath, 'Run packet must live under .osc/runs.');
  const runDir = dirname(runPacketPath);
  const raw = JSON.parse(readFileSync(runPacketPath, 'utf8')) as { runId?: unknown; schemaVersion?: unknown; runtime?: { worktreePath?: unknown; branch?: unknown; repoPath?: unknown } };
  if (raw.schemaVersion !== 'open-scaffold.run.v1') throw new DispatchUsageError('Dispatch input must use schemaVersion open-scaffold.run.v1.');
  if (typeof raw.runId !== 'string' || !raw.runId.trim()) throw new DispatchUsageError('Dispatch input is missing runId.');
  const runtime = raw.runtime && typeof raw.runtime === 'object' ? raw.runtime : {};
  return {
    root: realRoot,
    runPacketPath,
    runDir,
    runId: raw.runId,
    runtime: {
      worktreePath: typeof runtime.worktreePath === 'string' && runtime.worktreePath.trim() ? runtime.worktreePath : null,
      branch: typeof runtime.branch === 'string' && runtime.branch.trim() ? runtime.branch : null,
      repoPath: typeof runtime.repoPath === 'string' && runtime.repoPath.trim() ? runtime.repoPath : null,
    },
  };
}

function adapterConfigPath(root: string, adapterId: string): string {
  return join(root, '.osc', 'adapters', `${adapterId}.json`);
}

function readOptionalStringArray(value: unknown, field: string, adapterId: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry.trim())) {
    throw new DispatchUsageError(`Adapter ${adapterId} ${field} must be an array of non-empty strings.`);
  }
  const entries = value.map((entry) => entry.trim());
  for (const entry of entries) {
    if (field === 'envAllowlist' && entry === '*') continue;
    if (field === 'envAllowlist' && !safeEnvNamePattern.test(entry)) {
      throw new DispatchUsageError(`Adapter ${adapterId} ${field} contains an invalid environment variable name.`);
    }
  }
  return entries;
}

function readOptionalStringRecord(value: unknown, field: string, adapterId: string): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DispatchUsageError(`Adapter ${adapterId} ${field} must be an object with string values.`);
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!key.trim() || typeof entry !== 'string') {
      throw new DispatchUsageError(`Adapter ${adapterId} ${field} must be an object with string values.`);
    }
    if (field === 'env' && !safeEnvNamePattern.test(key)) {
      throw new DispatchUsageError(`Adapter ${adapterId} ${field} contains an invalid environment variable name.`);
    }
    if (field === 'env' && envControlCharPattern.test(entry)) {
      throw new DispatchUsageError(`Adapter ${adapterId} ${field} contains a value with unsupported control characters.`);
    }
    result[key] = entry;
  }
  return result;
}

function readOptionalPositiveInteger(value: unknown, field: string, adapterId: string, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || typeof value !== 'number' || value <= 0) {
    throw new DispatchUsageError(`Adapter ${adapterId} ${field} must be a positive integer.`);
  }
  if (value > maximum) {
    throw new DispatchUsageError(`Adapter ${adapterId} ${field} must be at most ${maximum}.`);
  }
  return value;
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
  return {
    id: adapterId,
    command: parsed.command,
    envAllowlist: readOptionalStringArray(parsed.envAllowlist, 'envAllowlist', adapterId),
    env: readOptionalStringRecord(parsed.env, 'env', adapterId),
    timeoutMs: readOptionalPositiveInteger(parsed.timeoutMs, 'timeoutMs', adapterId, defaultAdapterTimeoutMs, maxAdapterTimeoutMs),
    maxStdoutBytes: readOptionalPositiveInteger(parsed.maxStdoutBytes, 'maxStdoutBytes', adapterId, defaultAdapterMaxLogBytes, maxAdapterLogBytes),
    maxStderrBytes: readOptionalPositiveInteger(parsed.maxStderrBytes, 'maxStderrBytes', adapterId, defaultAdapterMaxLogBytes, maxAdapterLogBytes),
    requiresWorktreeIsolation: parsed.requiresWorktreeIsolation === true,
  };
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

function buildAdapterEnv(adapter: AdapterDefinition, parentEnv: NodeJS.ProcessEnv, allowFullEnv = false): AdapterEnvBuildResult {
  if (allowFullEnv) {
    if (parentEnv.CI && parentEnv.OPEN_SCAFFOLD_ALLOW_FULL_ENV_IN_CI !== '1') {
      throw new DispatchUsageError('Refusing --allow-full-env in CI unless OPEN_SCAFFOLD_ALLOW_FULL_ENV_IN_CI=1 is set.');
    }
    const env = { ...parentEnv, ...adapter.env };
    return {
      env,
      mode: 'full-unsafe',
      keys: Object.keys(env).sort(),
      warning: 'Warning: --allow-full-env passed the full parent environment to the adapter.',
    };
  }

  if (adapter.envAllowlist.includes('*')) {
    throw new DispatchUsageError(`Adapter ${adapter.id} uses wildcard envAllowlist; use --allow-full-env for unsafe local override.`);
  }

  const env: NodeJS.ProcessEnv = {};
  const allowlist = new Set([...defaultAdapterEnvAllowlist, ...adapter.envAllowlist]);
  for (const key of allowlist) {
    const value = parentEnv[key];
    if (value !== undefined) env[key] = value;
  }
  for (const [key, value] of Object.entries(adapter.env)) {
    env[key] = value;
  }
  return { env, mode: 'restricted', keys: Object.keys(env).sort(), warning: null };
}

function truncateLog(content: string, maxBytes: number): TruncatedLog {
  const data = Buffer.from(content, 'utf8');
  if (data.length <= maxBytes) return { content, truncated: false };
  const marker = `\n[open-scaffold: log truncated to ${maxBytes} bytes from ${data.length} bytes]\n`;
  const retained = data.subarray(0, maxBytes).toString('utf8');
  const lastNewline = retained.lastIndexOf('\n');
  const completeLinePrefix = lastNewline >= 0 ? retained.slice(0, lastNewline + 1) : '';
  return { content: `${completeLinePrefix}${marker}`, truncated: true };
}

function processErrorDetails(error: Error | undefined): string | null {
  if (!error) return null;
  const coded = error as Error & { code?: unknown };
  const code = typeof coded.code === 'string' ? `${coded.code}: ` : '';
  return `[open-scaffold: adapter process error] ${code}${error.message}`;
}

function isTimeoutError(error: Error | undefined): boolean {
  const coded = error as (Error & { code?: unknown }) | undefined;
  return coded?.code === 'ETIMEDOUT';
}

function resolveExistingOrLexical(base: string, path: string): string {
  const absolute = isAbsolute(path) ? resolve(path) : resolve(base, path);
  if (existsSync(absolute)) return realpathSync.native(absolute);

  let existingParent = dirname(absolute);
  while (!existsSync(existingParent)) {
    const next = dirname(existingParent);
    if (next === existingParent) return absolute;
    existingParent = next;
  }

  return resolve(realpathSync.native(existingParent), relative(existingParent, absolute));
}

function isProtectedBranchRef(branch: string): boolean {
  const normalized = branch.trim().replace(/\\/g, '/');
  const protectedName = /^(?:main|master|trunk|release)$/i;
  if (protectedName.test(normalized)) return true;
  const localRef = normalized.match(/^refs\/heads\/(.+)$/i);
  if (localRef) return protectedName.test(localRef[1]!);
  const remoteRef = normalized.match(/^(?:refs\/remotes\/[^/]+|remotes\/[^/]+|origin|upstream)\/(.+)$/i);
  return Boolean(remoteRef && protectedName.test(remoteRef[1]!));
}

function assertWorktreeIsolation(adapter: AdapterDefinition, run: { root: string; runtime: { worktreePath: string | null; branch: string | null; repoPath: string | null } }): 'not-required' | 'enforced' {
  if (!adapter.requiresWorktreeIsolation) return 'not-required';
  const { worktreePath, branch, repoPath } = run.runtime;
  if (!worktreePath) throw new DispatchUsageError(`Adapter ${adapter.id} requires runtime.worktreePath in the run packet.`);
  if (!branch) throw new DispatchUsageError(`Adapter ${adapter.id} requires runtime.branch in the run packet.`);
  if (isProtectedBranchRef(branch)) throw new DispatchUsageError(`Adapter ${adapter.id} refuses protected branch execution: ${branch}. Use an isolated non-main branch.`);
  const resolvedRepoPath = resolveExistingOrLexical(run.root, repoPath ?? '.');
  const resolvedWorktreePath = resolveExistingOrLexical(run.root, worktreePath);
  if (isInsideOrSame(resolvedRepoPath, resolvedWorktreePath)) {
    throw new DispatchUsageError(`Adapter ${adapter.id} requires an isolated worktree path outside runtime.repoPath.`);
  }
  return 'enforced';
}

export function runDispatch(runPacketArg: string, options: DispatchOptions, start = process.cwd()): DispatchResult {
  if (!runPacketArg) throw new DispatchUsageError('Missing required argument: run-json');
  const run = resolveRunPacket(start, runPacketArg);
  assertNoSymlinksUnder(run.runDir, 'Run directory must not contain symlinks before adapter dispatch.');
  const adapter = resolveAdapter(run.root, options.adapterId);
  const trust = assertAdapterTrusted(adapter.id, run.root);
  const worktreeIsolation = assertWorktreeIsolation(adapter, run);
  const adapterEnv = buildAdapterEnv(adapter, process.env, options.allowFullEnv);
  prepareDispatchDir(run.runDir);

  const result = spawnSync(adapter.command[0]!, [...adapter.command.slice(1), run.runPacketPath], {
    cwd: run.root,
    encoding: 'utf8',
    env: adapterEnv.env,
    timeout: adapter.timeoutMs,
    killSignal: 'SIGKILL',
    maxBuffer: maxAdapterProcessBufferBytes,
  });
  const stdoutForDiscovery = truncateLog(String(result.stdout ?? ''), adapter.maxStdoutBytes);
  const stdout = truncateLog(redactSecrets(String(result.stdout ?? '')), adapter.maxStdoutBytes);
  const stderrParts = [String(result.stderr ?? ''), processErrorDetails(result.error)].filter((part): part is string => Boolean(part));
  const stderr = truncateLog(redactSecrets(stderrParts.join(stderrParts.length > 1 ? '\n' : '')), adapter.maxStderrBytes);
  const finalDispatchDir = prepareDispatchDir(run.runDir);
  const stdoutLogPath = writeLogFile(finalDispatchDir, adapter.id, 'stdout', stdout.content);
  const stderrLogPath = writeLogFile(finalDispatchDir, adapter.id, 'stderr', stderr.content);

  const receiptPath = discoverReceipt(run.root, run.runDir, stdoutForDiscovery.content);
  const evidencePaths = discoverEvidence(run.root, run.runDir, stdoutForDiscovery.content);

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
    envMode: adapterEnv.mode,
    envKeys: adapterEnv.keys,
    unsafeEnvWarning: adapterEnv.warning,
    timeoutMs: adapter.timeoutMs,
    timedOut: isTimeoutError(result.error),
    maxStdoutBytes: adapter.maxStdoutBytes,
    maxStderrBytes: adapter.maxStderrBytes,
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
    adapterTrusted: trust.trusted,
    adapterDigest: trust.digest,
    worktreeIsolation,
  };
}

export function formatDispatchSummary(result: DispatchResult, root: string): string {
  const evidence = result.evidencePaths.length ? result.evidencePaths.map((path) => `Evidence: ${toRelative(root, path)}`).join('\n') : 'Evidence: (none reported)';
  const envLabel = result.envMode === 'full-unsafe' ? 'full (unsafe override)' : 'restricted';
  return [
    'Open Scaffold dispatch complete',
    `Adapter: ${result.adapterId}`,
    `Run ID: ${result.runId}`,
    `Run packet: ${toRelative(root, result.runPacketPath)}`,
    `Environment: ${envLabel}`,
    `Environment keys: ${result.envKeys.length ? result.envKeys.join(', ') : '(none)'}`,
    `Adapter trusted: ${result.adapterTrusted ? 'yes' : 'no'} (${result.adapterDigest})`,
    `Worktree isolation: ${result.worktreeIsolation}`,
    result.unsafeEnvWarning,
    `Timeout: ${result.timeoutMs} ms`,
    `Timed out: ${result.timedOut ? 'yes' : 'no'}`,
    `Stdout limit: ${result.maxStdoutBytes} bytes`,
    `Stderr limit: ${result.maxStderrBytes} bytes`,
    `Stdout truncated: ${result.stdoutTruncated ? 'yes' : 'no'}`,
    `Stderr truncated: ${result.stderrTruncated ? 'yes' : 'no'}`,
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
