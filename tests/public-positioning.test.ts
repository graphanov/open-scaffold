import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function firstLines(text: string, count: number): string {
  return text.split('\n').slice(0, count).join('\n');
}

describe('public work-record positioning', () => {
  it('leads the README with the repo-native work-record promise', () => {
    const firstScreen = firstLines(read('README.md'), 80);

    expect(firstScreen).toContain("Your AI agent's work belongs in your repo, not its chat history.");
    expect(firstScreen).toContain('repo-native work record');
    expect(firstScreen).toContain('goal');
    expect(firstScreen).toContain('plan');
    expect(firstScreen).toContain('handoff');
    expect(firstScreen).toContain('evidence');
    expect(firstScreen).toContain('approval');
    expect(firstScreen).toContain('lessons');

    expect(firstScreen).not.toMatch(/agent OS|control plane|compliance-grade|operating system|tamper-proof/i);
  });

  it('documents auditability as evidence substrate, not a compliance program', () => {
    const auditability = read('docs/AUDITABILITY.md');

    expect(auditability).toContain('evidence substrate');
    expect(auditability).toContain('does not prove the work is correct');
    expect(auditability).toContain('human approval');
    expect(auditability).toContain('compliance program');
    expect(auditability).not.toMatch(/compliance-grade|tamper-proof|certif(y|ies|ied)/i);
  });

  it('positions comparison tools as adjacent layers rather than enemies', () => {
    const comparison = read('docs/COMPARISON.md');

    expect(comparison).toContain('adjacent layers');
    expect(comparison).toContain('not enemies');
    expect(comparison).toContain('repo record layer');
    expect(comparison).toContain('durable notebook next to the code');
  });
});
