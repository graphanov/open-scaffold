import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const maintainedRoots = ['src', 'packages/runtime-omx/src'] as const;
const cleanupBaselineLoc = 20_890;
// Harness command-surface integration deliberately adds maintained backend/router code.
// Controlled runtime parity deliberately adds one bounded adapter launcher and Codex review hardening; keep the cap explicit so future growth must update this test with intent.
// Feedback/handoff parity adds the real retry, repair-hypothesis, handoff, and team feedback wiring instead of leaving those as standalone lab primitives.
const cleanupTargetLoc = 14_630;
const cleanupTargetFiles = 38;

interface MaintainedSourceFile {
  path: string;
  loc: number;
}

function walkTypeScriptFiles(root: string): string[] {
  const absoluteRoot = join(repoRoot, root);
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(entryPath);
    }
  };
  visit(absoluteRoot);
  return files;
}

function physicalLoc(file: string): number {
  const source = readFileSync(file, 'utf8');
  if (source.length === 0) return 0;
  return source.split(/\r?\n/).length - (source.endsWith('\n') ? 1 : 0);
}

function maintainedSourceFiles(): MaintainedSourceFile[] {
  return maintainedRoots
    .flatMap((root) => walkTypeScriptFiles(root))
    .sort()
    .map((file) => ({ path: relative(repoRoot, file), loc: physicalLoc(file) }));
}

describe('framework cleanup maintained-source metric', () => {
  it('measures the maintained TypeScript surface with the agreed roots', () => {
    const files = maintainedSourceFiles();
    const totalLoc = files.reduce((sum, file) => sum + file.loc, 0);

    expect(files.map((file) => file.path)).toContain('src/cli.ts');
    expect(files.map((file) => file.path)).toContain('packages/runtime-omx/src/index.ts');
    expect(files.every((file) => maintainedRoots.some((root) => file.path === root || file.path.startsWith(`${root}/`)))).toBe(true);
    expect(cleanupTargetLoc).toBe(14_630);
    expect(totalLoc).toBeLessThanOrEqual(cleanupTargetLoc);
    expect(totalLoc).toBeLessThanOrEqual(cleanupBaselineLoc);
    expect(files.length).toBeLessThanOrEqual(cleanupTargetFiles);
  });

  it('matches the shell measurement command used by the cleanup baseline on POSIX systems', () => {
    if (process.platform === 'win32') return;

    const files = maintainedSourceFiles();
    const nodeLoc = files.reduce((sum, file) => sum + file.loc, 0);
    const shellOutput = execFileSync('sh', [
      '-c',
      "find src packages/runtime-omx/src -type f -name '*.ts' -print0 | xargs -0 wc -l | tail -1",
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const shellLoc = Number(shellOutput.trim().split(/\s+/)[0]);

    expect(shellLoc).toBe(nodeLoc);
  });
});
