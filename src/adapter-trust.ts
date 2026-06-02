import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

function addAdapterLocalFiles(root: string, commandFile: string, files: Set<string>): void {
  const adaptersRoot = resolve(root, '.osc', 'adapters');
  const commandDir = dirname(commandFile);
  if (!isInsideOrSame(adaptersRoot, commandDir)) {
    files.add(commandFile);
    return;
  }

  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const candidate = resolve(dir, entry);
      if (!isInsideOrSame(root, candidate)) continue;
      const stat = statSync(candidate);
      if (stat.isDirectory()) visit(candidate);
      else if (stat.isFile()) files.add(candidate);
    }
  };
  visit(commandDir);
}

function adapterDigestFiles(root: string, rawConfig: Buffer): string[] {
  let parsed: { command?: unknown };
  try {
    parsed = JSON.parse(rawConfig.toString('utf8')) as { command?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.command)) return [];
  const files = new Set<string>();
  for (const entry of parsed.command) {
    if (typeof entry !== 'string' || !entry.trim()) continue;
    const candidate = isAbsolute(entry) ? resolve(entry) : resolve(root, entry);
    if (!isInsideOrSame(root, candidate)) continue;
    if (!existsSync(candidate)) continue;
    if (!statSync(candidate).isFile()) continue;
    addAdapterLocalFiles(root, candidate, files);
  }
  return [...files].sort();
}

export function adapterConfigDigest(root: string, adapterId: string): { path: string; digest: string } {
  const path = adapterConfigPath(root, adapterId);
  if (!existsSync(path)) throw new AdapterTrustError(`Adapter config not found: .osc/adapters/${adapterId}.json`);
  const raw = readFileSync(path);
  const hash = createHash('sha256').update('open-scaffold.adapter-trust.v2\0').update(raw);
  for (const digestFile of adapterDigestFiles(root, raw)) {
    hash.update('\0adapter-file:').update(relative(root, digestFile).replace(/\\/g, '/')).update('\0').update(readFileSync(digestFile));
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
