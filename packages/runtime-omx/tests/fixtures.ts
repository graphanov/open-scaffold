import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function tempRunPacket(overrides: Record<string, unknown> = {}) {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'runtime-omx-')));
  const runDir = join(root, '.osc/runs/demo');
  mkdirSync(runDir, { recursive: true });
  const manifest = {
    schemaVersion: 'open-scaffold.run.v1',
    runId: 'demo-run',
    taskId: 'task:demo',
    mode: 'run',
    status: 'created',
    plan: {
      path: '.osc/plans/active/042-reference-adapter-package-no-spawn.md',
      goal: 'Preview an OMX $ralplan dispatch without launching anything.',
      acceptanceCriteria: ['Receipt is written.', 'Evidence artifact is written.'],
      verificationSteps: ['Run runtime-omx package tests.'],
      openQuestions: [],
    },
    packageQuality: { executable: true, blockers: [] },
    runtimeSelection: { runtime: 'omx', workflow: 'plan', profileId: 'omx', profileSource: 'builtin' },
    executor: { lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false },
    runtime: { repoPath: root, worktreePath: root, branch: 'runtime/omx-package-no-spawn', tmuxSession: null, processId: null },
    bindings: { operatorSurface: 'cli' },
    artifacts: { evidence: [] },
    commitPolicy: 'runtime-omx no-spawn preview only; no commit/push/merge',
    ...overrides,
  };
  const path = join(runDir, 'run.json');
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { root, runDir, path, manifest };
}

export function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'));
}
