import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSafeOutputRoot, writeFileUnder } from '../src/path-safety.js';

describe('safe harness artifact writes', () => {
  it('rejects symlinked output roots', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-path-root-'));
    const outside = mkdtempSync(join(tmpdir(), 'osc-path-outside-'));
    symlinkSync(outside, join(root, 'bench-link'));

    expect(() => createSafeOutputRoot(root, 'bench-link')).toThrow(/symlink/i);
  });

  it('rejects symlinked method directories, lane roots, child parents, and final targets', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-path-'));
    const outside = mkdtempSync(join(tmpdir(), 'osc-path-outside-'));
    const output = createSafeOutputRoot(root, '.osc/bench/safe');

    symlinkSync(outside, join(output.absolutePath, 'methods'));
    expect(() => writeFileUnder(output.absolutePath, 'methods/01/resume.md', 'x')).toThrow(/symlink/i);

    const output2 = createSafeOutputRoot(root, '.osc/bench/safe2');
    symlinkSync(outside, join(output2.absolutePath, 'lane-root'));
    expect(() => writeFileUnder(output2.absolutePath, 'lane-root/final-output.md', 'x')).toThrow(/symlink/i);

    const output3 = createSafeOutputRoot(root, '.osc/bench/safe3');
    writeFileUnder(output3.absolutePath, 'tests/fixture/john/placeholder.txt', 'ok');
    symlinkSync(outside, join(output3.absolutePath, 'tests/fixture/john/artifacts'));
    expect(() => writeFileUnder(output3.absolutePath, 'tests/fixture/john/artifacts/out.md', 'x')).toThrow(/symlink/i);

    const output4 = createSafeOutputRoot(root, '.osc/bench/safe4');
    symlinkSync(join(outside, 'report.md'), join(output4.absolutePath, 'REPORT.md'));
    expect(() => writeFileUnder(output4.absolutePath, 'REPORT.md', 'x')).toThrow(/symlink/i);
    expect(existsSync(join(outside, 'report.md'))).toBe(false);
  });

  it('rejects traversal and absolute artifact paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-path-traversal-'));
    const output = createSafeOutputRoot(root, '.osc/bench/safe');

    expect(() => writeFileUnder(output.absolutePath, '../escape.md', 'x')).toThrow(/relative|\.\./i);
    expect(() => writeFileUnder(output.absolutePath, join(root, 'absolute.md'), 'x')).toThrow(/relative/i);
  });
});
