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

function commandEntryLooksLikePythonExecutable(entry: string): boolean {
  const command = basename(entry).toLowerCase().replace(/\.exe$/, '');
  return command === 'py' || command === 'python' || /^python\d+(?:\.\d+)?$/.test(command);
}

const pythonOptionsWithSeparateOperands = new Set(['-W', '-X', '--check-hash-based-pycs']);

function commandEntryIsPythonModuleMode(command: unknown[], index: number): boolean {
  if (command[index] !== '-m') return false;
  let pythonIndex = -1;
  for (let candidateIndex = index - 1; candidateIndex >= 0; candidateIndex -= 1) {
    const candidate = command[candidateIndex];
    if (typeof candidate === 'string' && commandEntryLooksLikePythonExecutable(candidate)) {
      pythonIndex = candidateIndex;
      break;
    }
  }
  if (pythonIndex < 0) return false;

  for (let optionIndex = pythonIndex + 1; optionIndex < index; optionIndex += 1) {
    const entry = command[optionIndex];
    if (typeof entry !== 'string' || !entry.trim()) continue;
    if (entry === '--' || entry === '-') return false;
    if (entry === '-c' || entry === '-m') return false;
    if (pythonOptionsWithSeparateOperands.has(entry)) {
      optionIndex += 1;
      continue;
    }
    if (entry.startsWith('-')) continue;
    return false;
  }
  return true;
}

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

function resolveLocalPythonModuleBase(base: string): string | null {
  const moduleFile = `${base}.py`;
  if (existsSync(moduleFile) && statSync(moduleFile).isFile()) return moduleFile;
  const packageInit = resolve(base, '__init__.py');
  if (existsSync(packageInit) && statSync(packageInit).isFile()) return packageInit;
  return null;
}

function resolvePythonModuleFromRoot(root: string, specifier: string): string | null {
  const normalizedSpecifier = specifier.replace(/^\.+/, '');
  if (!normalizedSpecifier) return null;
  return resolveLocalPythonModuleBase(resolve(root, ...normalizedSpecifier.split('.')));
}

function resolvePythonModuleEntrypointFromRoot(root: string, specifier: string): string | null {
  const normalizedSpecifier = specifier.replace(/^\.+/, '');
  if (!normalizedSpecifier) return null;
  const base = resolve(root, ...normalizedSpecifier.split('.'));
  const moduleFile = `${base}.py`;
  if (existsSync(moduleFile) && statSync(moduleFile).isFile()) return moduleFile;
  const packageMain = resolve(base, '__main__.py');
  if (existsSync(packageMain) && statSync(packageMain).isFile()) return packageMain;
  return null;
}

function resolvePythonPackageInitializersFromBase(baseRoot: string, specifier: string): string[] {
  if (!specifier) return [];
  const initializers: string[] = [];
  let packageDir = baseRoot;
  for (const part of specifier.split('.')) {
    packageDir = resolve(packageDir, part);
    if (!existsSync(packageDir) || !statSync(packageDir).isDirectory()) break;
    const initializer = resolve(packageDir, '__init__.py');
    if (existsSync(initializer) && statSync(initializer).isFile()) initializers.push(initializer);
  }
  return initializers;
}

function resolvePythonPackageInitializersFromRoot(root: string, specifier: string): string[] {
  const normalizedSpecifier = specifier.replace(/^\.+/, '');
  if (!normalizedSpecifier) return [];
  return resolvePythonPackageInitializersFromBase(root, normalizedSpecifier);
}

function resolveLocalPythonModule(root: string, fromFile: string, specifier: string): string | null {
  const leadingDots = specifier.match(/^\.+/)?.[0]?.length ?? 0;
  if (leadingDots > 0) {
    let baseDir = dirname(fromFile);
    for (let level = 1; level < leadingDots; level += 1) baseDir = dirname(baseDir);
    const remainingSpecifier = specifier.slice(leadingDots);
    if (!remainingSpecifier) return resolveLocalPythonModuleBase(baseDir);
    return resolveLocalPythonModuleBase(resolve(baseDir, ...remainingSpecifier.split('.')));
  }

  const normalizedSpecifier = specifier;
  if (!normalizedSpecifier) return null;
  const fromDir = dirname(fromFile);
  for (const base of [resolve(fromDir, ...normalizedSpecifier.split('.')), resolve(root, ...normalizedSpecifier.split('.'))]) {
    const resolvedModule = resolveLocalPythonModuleBase(base);
    if (resolvedModule) return resolvedModule;
  }
  return null;
}

function resolveLocalPythonPackageInitializers(root: string, fromFile: string, specifier: string): string[] {
  const leadingDots = specifier.match(/^\.+/)?.[0]?.length ?? 0;
  if (leadingDots > 0) {
    let baseDir = dirname(fromFile);
    for (let level = 1; level < leadingDots; level += 1) baseDir = dirname(baseDir);
    const remainingSpecifier = specifier.slice(leadingDots);
    if (!remainingSpecifier) {
      const initializer = resolve(baseDir, '__init__.py');
      return existsSync(initializer) && statSync(initializer).isFile() ? [initializer] : [];
    }
    return resolvePythonPackageInitializersFromBase(baseDir, remainingSpecifier);
  }

  if (!specifier) return [];
  const fromDir = dirname(fromFile);
  for (const baseRoot of [fromDir, root]) {
    const base = resolve(baseRoot, ...specifier.split('.'));
    if (resolveLocalPythonModuleBase(base)) return resolvePythonPackageInitializersFromBase(baseRoot, specifier);
  }
  return [];
}

function pythonImportedModuleSpecifier(moduleName: string, importedName: string): string {
  return `${moduleName}${moduleName.endsWith('.') ? '' : '.'}${importedName}`;
}

function localPythonDependencySpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const fromMatch = line.match(/^\s*from\s+([A-Za-z_.][A-Za-z0-9_.]*)\s+import\s+(.+)$/);
    if (fromMatch) {
      const moduleName = fromMatch[1]!;
      specifiers.push(moduleName);
      for (const importedName of fromMatch[2]!.split(',')) {
        const name = importedName.trim().split(/\s+as\s+/i)[0]?.trim();
        if (name && name !== '*' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) specifiers.push(pythonImportedModuleSpecifier(moduleName, name));
      }
      continue;
    }

    const importMatch = line.match(/^\s*import\s+(.+)$/);
    if (importMatch) {
      specifiers.push(...importMatch[1]!.split(',').map((value) => value.trim().split(/\s+as\s+/i)[0]?.trim() ?? '').filter(Boolean));
    }
  }
  return specifiers;
}

function localDependencySpecifiers(file: string, content: string): string[] {
  if (/\.py$/i.test(file)) return localPythonDependencySpecifiers(content);

  const specifiers: string[] = [];
  for (const match of content.matchAll(localModuleSpecifierPattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

function resolveLocalDependency(root: string, fromFile: string, specifier: string): string | null {
  if (/\.py$/i.test(fromFile)) return resolveLocalPythonModule(root, fromFile, specifier);
  return resolveLocalModule(fromFile, specifier);
}

function addAdapterDependencyFiles(root: string, file: string, files: Set<string>, seen = new Set<string>()): void {
  const trustedFile = trustedExistingFile(root, file);
  if (!trustedFile || seen.has(trustedFile)) return;
  seen.add(trustedFile);
  files.add(trustedFile);
  const content = readFileSync(trustedFile, 'utf8');
  for (const specifier of localDependencySpecifiers(trustedFile, content)) {
    if (/\.py$/i.test(trustedFile)) {
      for (const initializer of resolveLocalPythonPackageInitializers(root, trustedFile, specifier)) {
        addAdapterDependencyFiles(root, initializer, files, seen);
      }
    }
    const dependency = resolveLocalDependency(root, trustedFile, specifier);
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
    if (commandEntryIsPythonModuleMode(parsed.command, index) && typeof nextEntry === 'string' && nextEntry.trim() && !nextEntry.startsWith('-')) {
      const moduleEntrypoint = resolvePythonModuleEntrypointFromRoot(realRoot, nextEntry);
      if (!moduleEntrypoint) {
        throw new AdapterTrustError('Adapter command references a Python module entrypoint that is not a repo-local file under the scaffold root. Use a repo-local script/module before trusting.');
      }
      for (const initializer of resolvePythonPackageInitializersFromRoot(realRoot, nextEntry)) candidates.push({ path: initializer, required: true });
      candidates.push({ path: moduleEntrypoint, required: true });
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
        throw error;
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
