import { constants, closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, statSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

export interface SafeOutputRoot {
  root: string;
  absolutePath: string;
  relativePath: string;
}

export function toPosix(value: string): string {
  return value.split('\\').join('/');
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || rel === '.' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function realOrResolve(path: string): string {
  const resolved = resolve(path);
  return existsSync(resolved) ? realpathSync.native(resolved) : resolved;
}

function assertSafeRelativePath(path: string, label: string): void {
  if (typeof path !== 'string' || !path.trim()) throw new Error(`${label} must be a non-empty relative path`);
  if (isAbsolute(path)) throw new Error(`${label} must be relative: ${path}`);
  const normalized = toPosix(path).replace(/^\.\//, '');
  if (normalized === '..' || normalized.split('/').includes('..')) throw new Error(`${label} must not contain ..: ${path}`);
}

function assertNoSymlinkComponents(baseRoot: string, target: string, label: string): void {
  const base = resolve(baseRoot);
  const absoluteTarget = resolve(target);
  if (!isInside(base, absoluteTarget)) throw new Error(`${label} must stay inside its root: ${target}`);
  if (existsSync(base) && lstatSync(base).isSymbolicLink()) throw new Error(`${label} root must not be a symlink: ${base}`);

  const rel = relative(base, absoluteTarget);
  const parts = rel === '' ? [] : rel.split(sep).filter(Boolean);
  let cursor = base;
  const realBase = realOrResolve(base);
  for (const part of parts) {
    cursor = resolve(cursor, part);
    if (!existsSync(cursor)) continue;
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error(`${label} must not pass through a symlink parent or target: ${toPosix(relative(base, cursor))}`);
    const real = realOrResolve(cursor);
    if (!isInside(realBase, real)) throw new Error(`${label} must stay inside its root after realpath: ${toPosix(relative(base, cursor))}`);
  }
}

export function createSafeOutputRoot(repoRoot: string, outDir: string, label = 'output root'): SafeOutputRoot {
  if (typeof outDir !== 'string' || !outDir.trim()) throw new Error(`${label} must be a non-empty path`);
  const root = realOrResolve(repoRoot);
  const absolutePath = isAbsolute(outDir) ? resolve(outDir) : resolve(root, outDir);
  if (!isInside(root, absolutePath)) throw new Error(`${label} must stay inside the repository root`);
  const relativePath = toPosix(relative(root, absolutePath));
  if (!relativePath || relativePath === '.') throw new Error(`${label} cannot be the repository root`);
  if (relativePath === '.git' || relativePath.startsWith('.git/') || relativePath === 'node_modules' || relativePath.startsWith('node_modules/')) {
    throw new Error(`${label} is unsafe: ${relativePath}`);
  }
  assertNoSymlinkComponents(root, absolutePath, label);
  mkdirSync(absolutePath, { recursive: true });
  assertNoSymlinkComponents(root, absolutePath, label);
  if (!statSync(absolutePath).isDirectory()) throw new Error(`${label} must be a directory: ${relativePath}`);
  return { root, absolutePath, relativePath };
}

export function writeFileUnder(root: string, relativePath: string, content: string, label = 'artifact path'): string {
  assertSafeRelativePath(relativePath, label);
  const base = realOrResolve(root);
  const target = resolve(base, relativePath);
  assertNoSymlinkComponents(base, dirname(target), label);
  mkdirSync(dirname(target), { recursive: true });
  assertNoSymlinkComponents(base, dirname(target), label);
  assertNoSymlinkComponents(base, target, label);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW ?? 0);
  let handle: number | null = null;
  try {
    handle = openSync(target, flags, 0o666);
    writeSync(handle, content, undefined, 'utf8');
  } catch (error) {
    if ((error as { code?: string })?.code === 'ELOOP') throw new Error(`${label} must not be a symlink: ${relativePath}`);
    throw error;
  } finally {
    if (handle !== null) closeSync(handle);
  }
  assertNoSymlinkComponents(base, target, label);
  return target;
}

export function writeJsonUnder(root: string, relativePath: string, value: unknown, label = 'json artifact path'): string {
  return writeFileUnder(root, relativePath, `${JSON.stringify(value, null, 2)}\n`, label);
}

export function appendJsonLineUnder(root: string, relativePath: string, value: unknown, label = 'jsonl artifact path'): string {
  assertSafeRelativePath(relativePath, label);
  const base = realOrResolve(root);
  const target = resolve(base, relativePath);
  assertNoSymlinkComponents(base, dirname(target), label);
  mkdirSync(dirname(target), { recursive: true });
  assertNoSymlinkComponents(base, dirname(target), label);
  assertNoSymlinkComponents(base, target, label);
  const flags = constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0);
  let handle: number | null = null;
  try {
    handle = openSync(target, flags, 0o666);
    writeSync(handle, `${JSON.stringify(value)}\n`, undefined, 'utf8');
  } catch (error) {
    if ((error as { code?: string })?.code === 'ELOOP') throw new Error(`${label} must not be a symlink: ${relativePath}`);
    throw error;
  } finally {
    if (handle !== null) closeSync(handle);
  }
  return target;
}

export function readJsonUnder<T = unknown>(root: string, relativePath: string, label = 'json read path'): T {
  assertSafeRelativePath(relativePath, label);
  const base = realOrResolve(root);
  const target = resolve(base, relativePath);
  assertNoSymlinkComponents(base, target, label);
  return JSON.parse(readFileSync(target, 'utf8')) as T;
}

export function readJsonlUnder<T = unknown>(root: string, relativePath: string): T[] {
  assertSafeRelativePath(relativePath, 'jsonl read path');
  const target = resolve(realOrResolve(root), relativePath);
  if (!existsSync(target)) return [];
  assertNoSymlinkComponents(realOrResolve(root), target, 'jsonl read path');
  return readFileSync(target, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}
