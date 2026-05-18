import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runNoSpawnOmx } from '../src/index.js';
import { tempRunPacket } from './fixtures.js';

describe('runtime-omx safe output paths', () => {
  it('supports --out for a safe run-directory receipt path', () => {
    const { root, path } = tempRunPacket();
    const out = join(root, '.osc/runs/demo/custom-receipt.json');
    const result = runNoSpawnOmx(path, { receiptPath: out });
    expect(result.receiptPath).toBe(out);
    expect(existsSync(out)).toBe(true);
    expect(existsSync(join(root, '.osc/runs/demo/runtime-omx-evidence.md'))).toBe(true);
  });

  it('resolves relative runtime.repoPath from the packet scaffold root', () => {
    const { root, path } = tempRunPacket({ runtime: { repoPath: '.', worktreePath: '.', branch: 'runtime/omx-package-no-spawn', tmuxSession: null, processId: null } });
    const result = runNoSpawnOmx(path);
    expect(result.receiptPath).toBe(join(root, '.osc/runs/demo/dispatch-receipt.json'));
    expect(existsSync(result.receiptPath)).toBe(true);
  });

  it('rejects receipt output outside the repo', () => {
    const { path } = tempRunPacket();
    const outside = join(mkdtempSync(join(tmpdir(), 'runtime-omx-outside-')), 'receipt.json');
    expect(() => runNoSpawnOmx(path, { receiptPath: outside })).toThrow('output path must stay under the run directory');
    expect(existsSync(outside)).toBe(false);
  });

  it('rejects receipt output outside the run directory', () => {
    const { root, path } = tempRunPacket();
    const outsideRun = join(root, '.osc/runs/receipt.json');
    expect(() => runNoSpawnOmx(path, { receiptPath: outsideRun })).toThrow('output path must stay under the run directory');
    expect(existsSync(outsideRun)).toBe(false);
  });

  it('rejects output paths that collide with run.json', () => {
    const { path } = tempRunPacket();
    expect(() => runNoSpawnOmx(path, { receiptPath: path })).toThrow('output path must not overwrite run.json');
  });

  it('rejects symlinked output parent directories', () => {
    const { root, path } = tempRunPacket();
    const outside = mkdtempSync(join(tmpdir(), 'runtime-omx-symlink-parent-'));
    symlinkSync(outside, join(root, '.osc/runs/demo/link'), 'dir');
    expect(() => runNoSpawnOmx(path, { receiptPath: join(root, '.osc/runs/demo/link/receipt.json') })).toThrow('output parent must not be a symlink');
    expect(existsSync(join(outside, 'receipt.json'))).toBe(false);
  });

  it('rejects symlinked output target files', () => {
    const { root, path } = tempRunPacket();
    const outside = mkdtempSync(join(tmpdir(), 'runtime-omx-symlink-target-'));
    const outsideFile = join(outside, 'receipt.json');
    writeFileSync(outsideFile, 'do not overwrite', 'utf8');
    symlinkSync(outsideFile, join(root, '.osc/runs/demo/dispatch-receipt.json'), 'file');
    expect(() => runNoSpawnOmx(path)).toThrow('output target must not be a symlink');
    expect(readFileSync(outsideFile, 'utf8')).toBe('do not overwrite');
  });

  it('rejects a run packet outside runtime.repoPath', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: mkdtempSync(join(tmpdir(), 'runtime-omx-other-root-')), worktreePath: null, branch: null, tmuxSession: null, processId: null } });
    expect(() => runNoSpawnOmx(path)).toThrow('run packet path must stay under runtime.repoPath');
  });

  it('rejects symlinked run packet files before reading the packet', () => {
    const { root, path } = tempRunPacket();
    const linkDir = join(root, '.osc/runs/link');
    mkdirSync(linkDir, { recursive: true });
    const linkPath = join(linkDir, 'run.json');
    symlinkSync(path, linkPath, 'file');
    expect(() => runNoSpawnOmx(linkPath)).toThrow('run packet must not be a symlink');
    expect(existsSync(join(root, '.osc/runs/link/dispatch-receipt.json'))).toBe(false);
  });

  it('rejects run packets outside .osc/runs', () => {
    const root = mkdtempSync(join(tmpdir(), 'runtime-omx-outside-runs-'));
    mkdirSync(join(root, '.osc/not-runs'), { recursive: true });
    const path = join(root, '.osc/not-runs/run.json');
    writeFileSync(path, JSON.stringify({
      schemaVersion: 'open-scaffold.run.v1',
      runId: 'demo-run',
      taskId: null,
      plan: { path: '.osc/plans/active/042.md', goal: 'Preview.', acceptanceCriteria: ['ok'], verificationSteps: ['verify'], openQuestions: [] },
      packageQuality: { executable: true, blockers: [] },
      runtimeSelection: { runtime: 'omx', workflow: 'plan', profileId: 'omx', profileSource: 'builtin' },
      executor: { lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false },
      runtime: { repoPath: root, worktreePath: root, branch: 'main', tmuxSession: null, processId: null },
      commitPolicy: 'no commit',
    }, null, 2));
    expect(() => runNoSpawnOmx(path)).toThrow('run packet must live under .osc/runs');
  });
});
