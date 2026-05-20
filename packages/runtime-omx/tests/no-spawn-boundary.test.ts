import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const coreSrcRoot = fileURLToPath(new URL('../../../src/', import.meta.url));
const runtimeSrcRoot = fileURLToPath(new URL('../src/', import.meta.url));

const coreForbiddenPatterns = [
  /node:child_process/,
  /from ['"]child_process['"]/,
  /\bspawnSync\s*\(/,
  /\bexecSync\s*\(/,
];

const coreProcessAllowedFiles = new Set([join(coreSrcRoot, 'evidence.ts')]);

const runtimeForbiddenPatterns = [
  /node:http/,
  /node:https/,
  /node:net/,
  /node:tls/,
  /node:dns/,
  /\bfetch\s*\(/,
  /process\.env/,
  /homedir\s*\(/,
  /dangerously-bypass-approvals-and-sandbox/,
  /--madmax/,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

function isCoreProcessAllowedFile(file: string): boolean {
  return coreProcessAllowedFiles.has(file);
}

describe('runtime-omx source boundary', () => {
  it('only allowlists the intended core evidence collector file', () => {
    expect(isCoreProcessAllowedFile(join(coreSrcRoot, 'evidence.ts'))).toBe(true);
    expect(isCoreProcessAllowedFile(join(coreSrcRoot, 'nested', 'evidence.ts'))).toBe(false);
  });

  it('Open Scaffold core source remains free of runtime process launching code', () => {
    const files = sourceFiles(coreSrcRoot);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      if (isCoreProcessAllowedFile(file)) continue;
      const content = readFileSync(file, 'utf8');
      for (const pattern of coreForbiddenPatterns) {
        if (pattern.test(content)) violations.push(`${file}: ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('runtime package source avoids network, env, home credential APIs, and bypass flags', () => {
    const files = sourceFiles(runtimeSrcRoot);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of runtimeForbiddenPatterns) {
        if (pattern.test(content)) violations.push(`${file}: ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
