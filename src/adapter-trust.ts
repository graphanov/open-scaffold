import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { findScaffoldRoot } from './scaffold.js';

export class AdapterTrustError extends Error {}

export interface AdapterTrustRecord {
  adapterId: string;
  digest: string;
  configPath: string;
  trustedAt: string;
}

export interface TrustedAdaptersFile {
  schemaVersion: 'open-scaffold.trusted_adapters.v1';
  adapters: Record<string, AdapterTrustRecord>;
}

export interface AdapterTrustStatus {
  adapterId: string;
  configPath: string;
  digest: string;
  trusted: boolean;
  reason: 'trusted' | 'not_trusted' | 'digest_mismatch';
  record: AdapterTrustRecord | null;
}

const TRUST_SCHEMA: TrustedAdaptersFile['schemaVersion'] = 'open-scaffold.trusted_adapters.v1';

function isSafeAdapterId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes('..');
}

function requireRoot(start: string): string {
  const root = findScaffoldRoot(start);
  if (!root) throw new AdapterTrustError(`No Open Scaffold root found from ${start}.`);
  return root;
}

export function adapterConfigPath(root: string, adapterId: string): string {
  if (!isSafeAdapterId(adapterId)) throw new AdapterTrustError(`Unsafe adapter id: ${adapterId}`);
  return join(root, '.osc', 'adapters', `${adapterId}.json`);
}

export function trustStatePath(root: string): string {
  return join(root, '.osc', 'state', 'trusted-adapters.json');
}

function isInsideOrSame(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || rel === '.' || (!rel.startsWith('..') && !isAbsolute(rel));
}

const localModuleExtensions = ['', '.mjs', '.js', '.cjs', '.ts', '.tsx', '.json'];
const localModuleIndexExtensions = ['index.mjs', 'index.js', 'index.cjs', 'index.ts', 'index.tsx', 'index.json'];
const localModuleSpecifierPattern = /\b(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]|\b(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g;
const pathOperandFlags = new Set(['--require', '-r', '--import', '--loader', '--experimental-loader', '--config', '--config-file', '--hook', '--preload']);

function commandFlagTakesPathOperand(entry: string): boolean {
  return pathOperandFlags.has(entry);
}

function commandEntryLooksLikePath(entry: string): boolean {
  return isAbsolute(entry) || entry.startsWith('./') || entry.startsWith('../') || entry.startsWith('.\\') || entry.startsWith('..\\') || entry.includes('/') || entry.includes('\\') || /\.(?:mjs|js|cjs|ts|tsx|json|sh|py|rb|pl|php|go|rs)$/i.test(entry);
}

function commandEntryPathCandidates(root: string, entry: string): Array<{ path: string; required: boolean }> {
  const candidates = [{ path: isAbsolute(entry) ? resolve(entry) : resolve(root, entry), required: commandEntryLooksLikePath(entry) }];
  const flagValue = entry.match(/^--[^=\s]+=(.+)$/)?.[1];
  if (flagValue) {
    candidates.push({ path: isAbsolute(flagValue) ? resolve(flagValue) : resolve(root, flagValue), required: true });
  }
  return candidates;
}

function localPathResolutionCandidates(file: string): string[] {
  const candidates: string[] = [];
  for (const extension of localModuleExtensions) {
    if (!extension) continue;
    candidates.push(`${file}${extension}`);
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    for (const indexFile of localModuleIndexExtensions) candidates.push(resolve(file, indexFile));
  }
  return candidates;
}

function trustedExistingFile(root: string, file: string): string | null {
  if (!existsSync(file)) return null;
  const resolvedFile = realpathSync.native(file);
  if (!isInsideOrSame(root, resolvedFile)) {
    throw new AdapterTrustError('Adapter command references a file outside the scaffold root. Move adapter payload files under the repository before trusting.');
  }
  if (!statSync(resolvedFile).isFile()) return null;
  return resolvedFile;
}

function resolveLocalModule(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const extension of localModuleExtensions) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const indexFile of localModuleIndexExtensions) {
      const candidate = resolve(base, indexFile);
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

function addAdapterDependencyFiles(root: string, file: string, files: Set<string>, seen = new Set<string>()): void {
  const trustedFile = trustedExistingFile(root, file);
  if (!trustedFile || seen.has(trustedFile)) return;
  seen.add(trustedFile);
  files.add(trustedFile);
  const content = readFileSync(trustedFile, 'utf8');
  for (const match of content.matchAll(localModuleSpecifierPattern)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) continue;
    const dependency = resolveLocalModule(trustedFile, specifier);
    if (dependency) addAdapterDependencyFiles(root, dependency, files, seen);
  }
}

function adapterDigestFiles(root: string, rawConfig: Buffer): string[] {
  const realRoot = realpathSync.native(root);
  let parsed: { command?: unknown };
  try {
    parsed = JSON.parse(rawConfig.toString('utf8')) as { command?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.command)) return [];
  const files = new Set<string>();
  for (let index = 0; index < parsed.command.length; index += 1) {
    const entry = parsed.command[index];
    if (typeof entry !== 'string' || !entry.trim()) continue;
    const candidates = commandEntryPathCandidates(root, entry);
    const nextEntry = parsed.command[index + 1];
    if (commandFlagTakesPathOperand(entry) && typeof nextEntry === 'string' && nextEntry.trim() && !nextEntry.startsWith('-')) {
      candidates.push({ path: isAbsolute(nextEntry) ? resolve(nextEntry) : resolve(root, nextEntry), required: true });
    }
    for (const candidate of candidates) {
      if (candidate.required && !existsSync(candidate.path)) {
        const lexicalRoot = resolve(root);
        if (!isInsideOrSame(lexicalRoot, candidate.path) && !isInsideOrSame(realRoot, candidate.path)) {
          throw new AdapterTrustError('Adapter command references a file outside the scaffold root. Move adapter payload files under the repository before trusting.');
        }
      }
      let trustedFile: string | null = null;
      try {
        trustedFile = trustedExistingFile(realRoot, candidate.path);
        if (!trustedFile && candidate.required) {
          for (const resolvedCandidate of localPathResolutionCandidates(candidate.path)) {
            trustedFile = trustedExistingFile(realRoot, resolvedCandidate);
            if (trustedFile) break;
          }
        }
      } catch (error) {
        if (candidate.required) throw error;
        continue;
      }
      if (!trustedFile) continue;
      addAdapterDependencyFiles(realRoot, trustedFile, files);
    }
  }
  return [...files].sort();
}

export function adapterConfigDigest(root: string, adapterId: string): { path: string; digest: string } {
  const path = adapterConfigPath(root, adapterId);
  if (!existsSync(path)) throw new AdapterTrustError(`Adapter config not found: .osc/adapters/${adapterId}.json`);
  const raw = readFileSync(path);
  const realRoot = realpathSync.native(root);
  const hash = createHash('sha256').update('open-scaffold.adapter-trust.v2\0').update(raw);
  for (const digestFile of adapterDigestFiles(root, raw)) {
    hash.update('\0adapter-file:').update(relative(realRoot, digestFile).replace(/\\/g, '/')).update('\0').update(readFileSync(digestFile));
  }
  const digest = `sha256:${hash.digest('hex')}`;
  return { path, digest };
}

export function readTrustedAdapters(root: string): TrustedAdaptersFile {
  const path = trustStatePath(root);
  if (!existsSync(path)) return { schemaVersion: TRUST_SCHEMA, adapters: {} };
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<TrustedAdaptersFile>;
  if (parsed.schemaVersion !== TRUST_SCHEMA || !parsed.adapters || typeof parsed.adapters !== 'object') {
    throw new AdapterTrustError('Trusted adapter state has unsupported schema; remove .osc/state/trusted-adapters.json and re-trust adapters.');
  }
  return { schemaVersion: TRUST_SCHEMA, adapters: parsed.adapters as Record<string, AdapterTrustRecord> };
}

function writeTrustedAdapters(root: string, state: TrustedAdaptersFile): void {
  const path = trustStatePath(root);
  mkdirSync(join(root, '.osc', 'state'), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

export function checkAdapterTrust(adapterId: string, start = process.cwd()): AdapterTrustStatus {
  const root = requireRoot(start);
  const { path, digest } = adapterConfigDigest(root, adapterId);
  const state = readTrustedAdapters(root);
  const record = state.adapters[adapterId] ?? null;
  const rel = relative(root, path).replace(/\\/g, '/');
  if (!record) return { adapterId, configPath: rel, digest, trusted: false, reason: 'not_trusted', record: null };
  if (record.digest !== digest) return { adapterId, configPath: rel, digest, trusted: false, reason: 'digest_mismatch', record };
  return { adapterId, configPath: rel, digest, trusted: true, reason: 'trusted', record };
}

export function trustAdapter(adapterId: string, start = process.cwd(), now = new Date()): AdapterTrustStatus {
  const root = requireRoot(start);
  const { path, digest } = adapterConfigDigest(root, adapterId);
  const state = readTrustedAdapters(root);
  state.adapters[adapterId] = {
    adapterId,
    digest,
    configPath: relative(root, path).replace(/\\/g, '/'),
    trustedAt: now.toISOString(),
  };
  writeTrustedAdapters(root, state);
  return checkAdapterTrust(adapterId, root);
}

export function listTrustedAdapters(start = process.cwd()): AdapterTrustStatus[] {
  const root = requireRoot(start);
  const state = readTrustedAdapters(root);
  return Object.keys(state.adapters).sort().map((id) => {
    try {
      return checkAdapterTrust(id, root);
    } catch {
      const record = state.adapters[id]!;
      return { adapterId: id, configPath: record.configPath, digest: record.digest, trusted: false, reason: 'not_trusted', record } satisfies AdapterTrustStatus;
    }
  });
}

export function assertAdapterTrusted(adapterId: string, root: string): AdapterTrustStatus {
  const status = checkAdapterTrust(adapterId, root);
  if (status.trusted) return status;
  if (status.reason === 'digest_mismatch') {
    throw new AdapterTrustError(`Adapter ${adapterId} trusted digest no longer matches ${basename(status.configPath)}. Run \`osc adapter check ${adapterId}\` and \`osc adapter trust ${adapterId}\` after reviewing the config.`);
  }
  throw new AdapterTrustError(`Adapter ${adapterId} is not trusted. Review \`${status.configPath}\`, then run \`osc adapter trust ${adapterId}\` to store its local digest.`);
}

export function formatAdapterTrustStatus(status: AdapterTrustStatus): string {
  const trusted = status.trusted ? 'yes' : 'no';
  const lines = [
    `Adapter: ${status.adapterId}`,
    `Config: ${status.configPath}`,
    `Digest: ${status.digest}`,
    `Trusted: ${trusted}`,
  ];
  if (!status.trusted && status.reason === 'digest_mismatch') lines.push('Reason: trusted digest no longer matches current config');
  if (!status.trusted && status.reason === 'not_trusted') lines.push('Reason: no matching local trust record');
  lines.push('Trust records are local state under .osc/state/trusted-adapters.json and must not be committed.');
  return `${lines.join('\n')}\n`;
}

export function formatTrustedAdapterList(statuses: AdapterTrustStatus[]): string {
  if (statuses.length === 0) return 'Trusted adapters: (none)\n';
  return `${['Trusted adapters:', ...statuses.map((status) => `- ${status.adapterId} ${status.trusted ? 'trusted' : 'invalid'} ${status.digest} (${status.configPath})`)].join('\n')}\n`;
}
