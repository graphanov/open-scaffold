import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { CommandRunner } from '../src/index.js';
import { runOmxRalplan } from '../src/index.js';
import { tempRunPacket, readJson } from './fixtures.js';

function runnerFrom(responses: Array<{ status: number | null; stdout?: string; stderr?: string; error?: NodeJS.ErrnoException }>) {
  const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
  const runner: CommandRunner = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    return responses.shift() ?? { status: 0, stdout: '', stderr: '' };
  };
  return { runner, calls };
}

describe('runtime-omx explicit launch path', () => {
  it('does not invoke the command runner unless --allow-spawn behavior is explicitly enabled', () => {
    const { path } = tempRunPacket();
    const { runner, calls } = runnerFrom([{ status: 0, stdout: 'should not run' }]);

    const result = runOmxRalplan(path, { commandRunner: runner });

    expect(result.receipt.status).toBe('dry_run');
    expect(result.receipt.spawned).toBe(false);
    expect(result.logPath).toBeNull();
    expect(calls).toEqual([]);
  });

  it('launches OMX $ralplan only after explicit opt-in, version check, and safe branch checks pass', () => {
    const { root, path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'runtime/omx-ralplan-adapter-spike', tmuxSession: null, processId: null } });
    const { runner, calls } = runnerFrom([
      { status: 0, stdout: 'runtime/omx-ralplan-adapter-spike\n' },
      { status: 0, stdout: 'oh-my-codex v0.17.3\nNode.js v25.8.1\n' },
      { status: 0, stdout: 'ralplan complete', stderr: '' },
    ]);

    const result = runOmxRalplan(path, { allowSpawn: true, commandRunner: runner, invokedAt: '2026-05-18T00:00:00.000Z' });
    const receipt = readJson(result.receiptPath);
    const log = readFileSync(result.logPath!, 'utf8');

    expect(result.receipt.status).toBe('completed');
    expect(result.receipt.spawned).toBe(true);
    expect(receipt.runtime_version.detected_version).toBe('0.17.3');
    expect(receipt.runtime_omx).toMatchObject({ kind: 'explicit-launch', adapter_spawned_runtime: true, exit_status: 0, source_mutation: false });
    expect(receipt.spawn_command_redacted.slice(0, 7)).toEqual(['omx', 'exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-C', root]);
    expect(receipt.spawn_command_redacted.at(-1)).toContain('redacted');
    expect(receipt.logs).toEqual(['.osc/runs/demo/runtime-omx.log']);
    expect(existsSync(result.evidencePath)).toBe(true);
    expect(log).toContain('ralplan complete');
    expect(calls).toHaveLength(3);
    expect(calls[0]).toMatchObject({ command: 'git', args: ['-C', root, 'rev-parse', '--abbrev-ref', 'HEAD'], cwd: root });
    expect(calls[1]).toMatchObject({ command: 'omx', args: ['--version'], cwd: root });
    expect(calls[2].command).toBe('omx');
    expect(calls[2].args.slice(0, 6)).toEqual(['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-C', root]);
    expect(calls[2].args.at(-1)).toContain('$ralplan');
  });

  it('refuses explicit launch from main-like branches before checking or running OMX', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'main', tmuxSession: null, processId: null } });
    const { runner, calls } = runnerFrom([{ status: 0, stdout: 'oh-my-codex v0.17.3' }]);

    const result = runOmxRalplan(path, { allowSpawn: true, commandRunner: runner, invokedAt: '2026-05-18T00:00:00.000Z' });

    expect(result.receipt.status).toBe('refused');
    expect(result.receipt.spawned).toBe(false);
    expect(result.receipt.failure.code).toBe('unsafe_branch');
    expect(calls).toEqual([]);
  });

  it('refuses explicit launch when the actual worktree branch differs from runtime.branch', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'runtime/omx-ralplan-adapter-spike', tmuxSession: null, processId: null } });
    const { runner, calls } = runnerFrom([{ status: 0, stdout: 'feature/not-the-packet-branch\n' }]);

    const result = runOmxRalplan(path, { allowSpawn: true, commandRunner: runner, invokedAt: '2026-05-18T00:00:00.000Z' });

    expect(result.receipt.status).toBe('refused');
    expect(result.receipt.failure.code).toBe('branch_mismatch');
    expect(result.receipt.failure.message).toContain('does not match actual worktree branch');
    expect(calls).toHaveLength(1);
  });

  it('refuses explicit launch when the worktree path is missing', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: './missing-worktree', branch: 'runtime/omx-ralplan-adapter-spike', tmuxSession: null, processId: null } });
    const { runner, calls } = runnerFrom([{ status: 0, stdout: 'runtime/omx-ralplan-adapter-spike\n' }]);

    const result = runOmxRalplan(path, { allowSpawn: true, commandRunner: runner, invokedAt: '2026-05-18T00:00:00.000Z' });

    expect(result.receipt.status).toBe('refused');
    expect(result.receipt.failure.code).toBe('missing_worktree');
    expect(calls).toEqual([]);
  });

  it('refuses explicit launch when OMX is missing', () => {
    const missing: NodeJS.ErrnoException = new Error('spawn omx ENOENT');
    missing.code = 'ENOENT';
    const { path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'runtime/omx-ralplan-adapter-spike', tmuxSession: null, processId: null } });
    const { runner, calls } = runnerFrom([
      { status: 0, stdout: 'runtime/omx-ralplan-adapter-spike\n' },
      { status: null, stdout: '', stderr: '', error: missing },
    ]);

    const result = runOmxRalplan(path, { allowSpawn: true, commandRunner: runner, invokedAt: '2026-05-18T00:00:00.000Z' });

    expect(result.receipt.status).toBe('refused');
    expect(result.receipt.failure.code).toBe('omx_not_found');
    expect(result.receipt.runtime_version?.version_ok).toBe(false);
    expect(calls).toHaveLength(2);
  });

  it('refuses older OMX versions before the launch command is attempted', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'runtime/omx-ralplan-adapter-spike', tmuxSession: null, processId: null } });
    const { runner, calls } = runnerFrom([
      { status: 0, stdout: 'runtime/omx-ralplan-adapter-spike\n' },
      { status: 0, stdout: 'oh-my-codex v0.16.3\n' },
    ]);

    const result = runOmxRalplan(path, { allowSpawn: true, commandRunner: runner, invokedAt: '2026-05-18T00:00:00.000Z' });

    expect(result.receipt.status).toBe('refused');
    expect(result.receipt.failure.code).toBe('omx_version_too_old');
    expect(result.receipt.runtime_version?.detected_version).toBe('0.16.3');
    expect(calls).toHaveLength(2);
  });

  it('records non-zero OMX exits as factual failed launch receipts and logs', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'runtime/omx-ralplan-adapter-spike', tmuxSession: null, processId: null } });
    const { runner } = runnerFrom([
      { status: 0, stdout: 'runtime/omx-ralplan-adapter-spike\n' },
      { status: 0, stdout: 'oh-my-codex v0.17.3\n' },
      { status: 7, stdout: 'partial output', stderr: 'missing Codex auth' },
    ]);

    const result = runOmxRalplan(path, { allowSpawn: true, commandRunner: runner, invokedAt: '2026-05-18T00:00:00.000Z' });
    const log = readFileSync(result.logPath!, 'utf8');

    expect(result.receipt.status).toBe('failed');
    expect(result.receipt.spawned).toBe(true);
    expect(result.receipt.failure.code).toBe('omx_launch_failed');
    expect(result.receipt.failure.message).toContain('missing Codex auth');
    expect(result.receipt.runtime_omx.exit_status).toBe(7);
    expect(log).toContain('partial output');
    expect(log).toContain('missing Codex auth');
  });
});
