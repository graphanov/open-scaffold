import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

export interface SafeOutputPaths {
  repoRoot: string;
  runDir: string;
  runPacketPath: string;
  receiptPath: string;
  evidencePath: string;
  relativeRunPacketPath: string;
  relativeReceiptPath: string;
  relativeEvidencePath: string;
}

function ensureInside(parent: string, child: string, message: string): void {
  const rel = relative(parent, child);
  if (rel === '' || rel === '.') return;
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(message);
}

function assertNoSymlinkTarget(path: string): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error('output target must not be a symlink');
}

export function assertRunPacketInputPath(runPacketInputPath: string): void {
  const resolved = resolve(runPacketInputPath);
  if (!existsSync(resolved)) throw new Error('run packet does not exist');
  if (lstatSync(resolved).isSymbolicLink()) throw new Error('run packet must not be a symlink');
}

function assertDirectoryNotSymlink(path: string): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error('output parent must not be a symlink');
}

function findScaffoldRootFromRunPacket(runPacketPath: string): string {
  let cursor = dirname(runPacketPath);
  while (true) {
    if (existsSync(join(cursor, '.osc'))) return cursor;
    const parent = dirname(cursor);
    if (parent === cursor) return dirname(runPacketPath);
    cursor = parent;
  }
}

function resolveRepoRoot(repoPath: string, runPacketPath: string): string {
  const repoRootCandidate = isAbsolute(repoPath)
    ? resolve(repoPath)
    : resolve(findScaffoldRootFromRunPacket(runPacketPath), repoPath);
  return realpathSync.native(repoRootCandidate);
}

function resolveOutput(repoRoot: string, runDir: string, runPacketPath: string, outputPath: string | undefined, defaultName: string): string {
  const requested = outputPath ? (isAbsolute(outputPath) ? resolve(outputPath) : resolve(repoRoot, outputPath)) : resolve(runDir, defaultName);
  const parent = dirname(requested);
  if (!existsSync(parent)) throw new Error('output parent directory must already exist');
  const realParent = realpathSync.native(parent);
  assertDirectoryNotSymlink(parent);
  const candidate = join(realParent, basename(requested));
  ensureInside(runDir, realParent, 'output path must stay under the run directory');
  if (realParent !== runDir) throw new Error('output path must be directly under the run directory');
  if (candidate === runPacketPath) throw new Error('output path must not overwrite run.json');
  assertNoSymlinkTarget(candidate);
  ensureInside(repoRoot, candidate, 'output path must stay under runtime.repoPath');
  return candidate;
}

export function safeOutputPaths(runPacketInputPath: string, repoPath: string, receiptOutput?: string): SafeOutputPaths {
  assertRunPacketInputPath(runPacketInputPath);
  const runPacketPath = realpathSync.native(resolve(runPacketInputPath));
  const repoRoot = resolveRepoRoot(repoPath, runPacketPath);
  ensureInside(repoRoot, runPacketPath, 'run packet path must stay under runtime.repoPath');
  if (lstatSync(runPacketPath).isSymbolicLink()) throw new Error('run packet must not be a symlink');
  const runDir = realpathSync.native(dirname(runPacketPath));
  ensureInside(repoRoot, runDir, 'run directory must stay under runtime.repoPath');
  ensureInside(resolve(repoRoot, '.osc', 'runs'), runDir, 'run packet must live under .osc/runs');

  const receiptPath = resolveOutput(repoRoot, runDir, runPacketPath, receiptOutput, 'dispatch-receipt.json');
  const evidencePath = resolveOutput(repoRoot, runDir, runPacketPath, undefined, 'runtime-omx-evidence.md');
  if (receiptPath === evidencePath) throw new Error('dispatch receipt and evidence paths must be distinct');

  return {
    repoRoot,
    runDir,
    runPacketPath,
    receiptPath,
    evidencePath,
    relativeRunPacketPath: relative(repoRoot, runPacketPath),
    relativeReceiptPath: relative(repoRoot, receiptPath),
    relativeEvidencePath: relative(repoRoot, evidencePath),
  };
}
