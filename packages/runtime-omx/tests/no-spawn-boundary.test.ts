import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const srcRoot = new URL('../src/', import.meta.url);
const forbiddenPatterns = [
  /node:child_process/,
  /from ['"]child_process['"]/,
  /node:http/,
  /node:https/,
  /node:net/,
  /node:tls/,
  /node:dns/,
  /\bfetch\s*\(/,
  /process\.env/,
  /homedir\s*\(/,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('runtime-omx no-spawn source boundary', () => {
  it('package source does not import process spawning, network, env, or home credential APIs', () => {
    const files = sourceFiles(srcRoot.pathname);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) violations.push(`${file}: ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
