import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runCli, isCliEntrypoint } from '../src/cli.js';
import { tempRunPacket, readJson } from './fixtures.js';

describe('runtime-omx CLI', () => {
  it('consumes a valid run packet and reports no-spawn artifact paths by default', () => {
    const { root, path } = tempRunPacket();
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = runCli([path], { stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout.join('\n')).toContain('runtime-omx receipt written');
    expect(stdout.join('\n')).toContain('runtime-omx evidence written');
    expect(stdout.join('\n')).toContain('runtime-omx no-spawn preview complete');
    expect(readJson(join(root, '.osc/runs/demo/dispatch-receipt.json')).spawned).toBe(false);
    expect(existsSync(join(root, '.osc/runs/demo/runtime-omx-evidence.md'))).toBe(true);
  });

  it('prints an explicit osc evolve record command from the repo root without mutating the evolution ledger', () => {
    const { root } = tempRunPacket();
    const loopDir = '.osc/evolution/demo-loop';
    const subdir = join(root, 'subdir');
    mkdirSync(join(root, loopDir), { recursive: true });
    mkdirSync(subdir, { recursive: true });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const previousCwd = process.cwd();

    let exitCode = 1;
    try {
      process.chdir(subdir);
      exitCode = runCli([
        '../.osc/runs/demo/run.json',
        '--evolution-loop',
        '../.osc/evolution/demo-loop',
        '--decision',
        'retry',
        '--score',
        '0.42',
        '--rationale',
        'No-spawn preview captured adapter output.',
      ], { stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) });
    } finally {
      process.chdir(previousCwd);
    }

    const output = stdout.join('\n');
    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(output).toContain('runtime-omx evolution record command:');
    expect(output).toContain(`cd ${root} && osc evolve record .osc/evolution/demo-loop`);
    expect(output).toContain('--run .osc/runs/demo/run.json');
    expect(output).toContain('--receipt .osc/runs/demo/dispatch-receipt.json');
    expect(output).toContain('--evidence .osc/runs/demo/runtime-omx-evidence.md');
    expect(output).toContain('--decision retry');
    expect(output).toContain('--score 0.42');
    expect(output).toContain("--rationale 'No-spawn preview captured adapter output.'");
    expect(existsSync(join(root, loopDir, 'attempts.jsonl'))).toBe(false);
  });

  it('rejects evolution-only flags without an evolution loop hint', () => {
    const { root, path } = tempRunPacket();
    const stderr: string[] = [];

    const exitCode = runCli([path, '--decision', 'retry', '--rationale', 'Would be ignored without a loop.'], { stdout: () => undefined, stderr: (message) => stderr.push(message) });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('--decision, --score, and --rationale require --evolution-loop');
    expect(existsSync(join(root, '.osc/runs/demo/dispatch-receipt.json'))).toBe(false);
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
    expect(helpOut.join('\n')).toContain('--allow-spawn');
    expect(helpOut.join('\n')).toContain('--evolution-loop <dir>');

    const missingOut: string[] = [];
    expect(runCli([], { stdout: (message) => missingOut.push(message), stderr: () => undefined })).toBe(1);
    expect(missingOut.join('\n')).toContain('Usage: open-scaffold-runtime-omx');
  });

  it('rejects --allow-spawn safely when the run packet worktree is not a usable git branch', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'runtime/omx-ralplan-adapter-spike', tmuxSession: null, processId: null } });
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = runCli([path, '--allow-spawn', '--omx-command', 'definitely-missing-open-scaffold-omx'], {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
    });

    expect(exitCode).toBe(1);
    expect(stdout.join('\n')).toContain('runtime-omx receipt written');
    expect(stderr.join('\n')).toContain('runtime-omx launch refused');
    expect(stderr.join('\n')).toContain('git_branch_check_failed');
  });

  it('detects CLI self-invocation only when the entrypoint matches this module', () => {
    expect(isCliEntrypoint('/tmp/open-scaffold-runtime-omx/dist/cli.js', 'file:///tmp/open-scaffold-runtime-omx/dist/cli.js')).toBe(true);
    expect(isCliEntrypoint('C:\\tmp\\open-scaffold-runtime-omx\\dist\\cli.js', 'file:///C:/tmp/open-scaffold-runtime-omx/dist/cli.js')).toBe(true);
    expect(isCliEntrypoint('/tmp/host-program/dist/cli.js', 'file:///tmp/open-scaffold-runtime-omx/dist/cli.js')).toBe(false);
    expect(isCliEntrypoint('/tmp/open-scaffold-runtime-omx/dist/index.js', 'file:///tmp/open-scaffold-runtime-omx/dist/cli.js')).toBe(false);
    expect(isCliEntrypoint(undefined, 'file:///tmp/open-scaffold-runtime-omx/dist/cli.js')).toBe(false);
  });

  it('resolves symlinked bin entrypoints before checking module identity', () => {
    const root = mkdtempSync(join(tmpdir(), 'runtime-omx-cli-'));
    try {
      const realCli = join(root, 'package/dist/cli.js');
      const binLink = join(root, 'node_modules/.bin/open-scaffold-runtime-omx');
      mkdirSync(dirname(realCli), { recursive: true });
      mkdirSync(dirname(binLink), { recursive: true });
      writeFileSync(realCli, '#!/usr/bin/env node\n');
      symlinkSync(realCli, binLink);

      expect(isCliEntrypoint(binLink, pathToFileURL(realCli).href)).toBe(true);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
