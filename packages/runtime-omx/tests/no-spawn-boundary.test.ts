import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const coreSrcRoot = new URL('../../../src/', import.meta.url);
const runtimeSrcRoot = new URL('../src/', import.meta.url);

const coreForbiddenPatterns = [
  /node:child_process/,
  /from ['"]child_process['"]/,
  /\bspawnSync\s*\(/,
  /\bexecSync\s*\(/,
];

const coreProcessAllowedFiles = new Set(['evidence.ts']);

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

describe('runtime-omx source boundary', () => {
  it('Open Scaffold core source remains free of runtime process launching code', () => {
    const files = sourceFiles(coreSrcRoot.pathname);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      if (coreProcessAllowedFiles.has(file.split('/').at(-1) ?? '')) continue;
      const content = readFileSync(file, 'utf8');
      for (const pattern of coreForbiddenPatterns) {
        if (pattern.test(content)) violations.push(`${file}: ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('runtime package source avoids network, env, home credential APIs, and bypass flags', () => {
    const files = sourceFiles(runtimeSrcRoot.pathname);
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
