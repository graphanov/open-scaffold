import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from '../src/cli.js';
import { tempRunPacket, readJson } from './fixtures.js';

describe('runtime-omx CLI', () => {
  it('consumes a valid run packet and reports no-spawn artifact paths', () => {
    const { root, path } = tempRunPacket();
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = runCli([path], { stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout.join('\n')).toContain('runtime-omx no-spawn preview complete');
    expect(stdout.join('\n')).toContain('runtime-omx evidence written');
    expect(readJson(join(root, '.osc/runs/demo/dispatch-receipt.json')).spawned).toBe(false);
    expect(existsSync(join(root, '.osc/runs/demo/runtime-omx-evidence.md'))).toBe(true);
  });

  it('supports --out for a safe run-directory receipt path', () => {
    const { root, path } = tempRunPacket();
    const stdout: string[] = [];
    const out = join(root, '.osc/runs/demo/omx-preview-receipt.json');

    const exitCode = runCli([path, '--out', out], { stdout: (message) => stdout.push(message), stderr: () => undefined });

    expect(exitCode).toBe(0);
    expect(stdout.join('\n')).toContain(out);
    expect(existsSync(out)).toBe(true);
  });

  it('exits 1 with a clear validation failure for invalid packets', () => {
    const { path } = tempRunPacket({ executor: { lane: 'omx-codex', harnessSkill: '$ralplan', spawning: true } });
    const stderr: string[] = [];

    const exitCode = runCli([path], { stdout: () => undefined, stderr: (message) => stderr.push(message) });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('runtime-omx validation failed');
    expect(stderr.join('\n')).toContain('executor.spawning must be false');
  });

  it('prints usage for --help and refuses missing arguments', () => {
    const helpOut: string[] = [];
    expect(runCli(['--help'], { stdout: (message) => helpOut.push(message), stderr: () => undefined })).toBe(0);
    expect(helpOut.join('\n')).toContain('Usage: open-scaffold-runtime-omx');

    const missingOut: string[] = [];
    expect(runCli([], { stdout: (message) => missingOut.push(message), stderr: () => undefined })).toBe(1);
    expect(missingOut.join('\n')).toContain('Usage: open-scaffold-runtime-omx');
  });
});
