import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRunArtifacts, previewRunArtifacts } from '../src/artifacts.js';

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-artifacts-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  return root;
}

const plan = {
  path: '.osc/plans/active/001-demo.md',
  slug: '001-demo',
  status: 'active',
  goal: 'Demo artifacts.',
  sections: new Map<string, string>(),
  filesToTouch: [],
  acceptanceCriteria: ['Run manifest exists.'],
  verificationSteps: ['Run npm test.'],
  openQuestions: [],
  executionStrategy: {
    groups: [
      { name: 'Group A', rationale: 'foundation', tasks: 'T1 — parse first', dependsOnPrevious: false },
    ],
    dependencies: ['T1 has no dependencies.'],
    delegationNotes: ['Use prompt executor.'],
  },
};

const ambiguousPlan = {
  ...plan,
  slug: '002-ambiguous',
  goal: '',
  acceptanceCriteria: [],
  verificationSteps: [],
  openQuestions: ['BLOCKING: Which runtime should execute this?'],
};

describe('run artifact generation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a run directory with manifest and prompt files without spawning agents', () => {
    const root = tempRepo();

    const run = createRunArtifacts(root, plan as any, 'delegate');

    expect(run.runDir).toContain(join(root, '.osc/runs/'));
    expect(existsSync(join(run.runDir, 'run.json'))).toBe(true);
    expect(existsSync(join(run.runDir, 'prompts/group-a.md'))).toBe(true);
    expect(readdirSync(join(run.runDir, 'prompts'))).toEqual(['group-a.md']);
  });

  it('suffixes same-timestamp run ids instead of overwriting existing run artifacts', () => {
    const root = tempRepo();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T10:00:00.000Z'));

    const first = createRunArtifacts(root, plan as any, 'run');
    const second = createRunArtifacts(root, plan as any, 'run');

    expect(first.runId).toBe('20260526T100000Z-001-demo-run');
    expect(second.runId).toBe('20260526T100000Z-001-demo-run-2');
    expect(first.runDir).not.toBe(second.runDir);
    expect(existsSync(join(first.runDir, 'run.json'))).toBe(true);
    expect(existsSync(join(second.runDir, 'run.json'))).toBe(true);
  });

  it('records canonical task/run bindings for a harness dispatch package', () => {
    const root = tempRepo();

    const run = createRunArtifacts(root, plan as any, 'run', {
      taskId: 'TASK-2026-0511-demo',
      sourceRef: ['kanban:card-123', 'github:issue/42'],
      executor: 'omx-codex',
      harnessSkill: '$ralplan',
      repo: '/tmp/demo-repo',
      worktree: '/tmp/demo-worktree',
      branch: 'feat/demo',
      operatorSurface: 'discord',
      operatorThread: 'thread-456',
      issue: '42',
      commitPolicy: 'no commit without approval',
    });

    const manifest = JSON.parse(readFileSync(run.manifestPath, 'utf8'));
    expect(manifest.schemaVersion).toBe('open-scaffold.run.v1');
    expect(manifest.taskId).toBe('TASK-2026-0511-demo');
    expect(manifest.status).toBe('created');
    expect(manifest.executor).toMatchObject({ lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false });
    expect(manifest.runtimeSelection).toMatchObject({ runtime: null, workflow: null });
    expect(manifest.bindings).toMatchObject({ operatorSurface: 'discord', operatorThreadId: 'thread-456', githubIssue: '42' });
    expect(manifest.runtime).toMatchObject({ repoPath: '/tmp/demo-repo', worktreePath: '/tmp/demo-worktree', branch: 'feat/demo' });
    expect(manifest.sourceRefs).toContain('kanban:card-123');
    expect(manifest.sourceRefs).toContain('github:issue/42');
    expect(manifest.sourceRefs).toContain('task:TASK-2026-0511-demo');
    expect(manifest.lifecycleStates).toContain('waiting_on_operator');
    expect(manifest.packageQuality.executable).toBe(true);

    const prompt = readFileSync(run.promptPaths[0], 'utf8');
    expect(prompt).toContain(`Run ID: ${run.runId}`);
    expect(prompt).toContain('Task ID: TASK-2026-0511-demo');
    expect(prompt).toContain('## Execution lane');
    expect(prompt).toContain('- Executor: omx-codex');
  });

  it('previews packages with missing executable context as requiring clarification before dispatch', () => {
    const root = tempRepo();

    const preview = previewRunArtifacts(root, ambiguousPlan as any, 'run', { executor: 'omc-claude', harnessSkill: '/deep-interview' });

    expect(preview.manifest.packageQuality.executable).toBe(false);
    expect(preview.manifest.packageQuality.requiredAction).toBe('clarify-or-deep-interview-before-dispatch');
    expect(preview.manifest.packageQuality.blockers).toContain('missing goal');
    expect(preview.manifest.packageQuality.blockers).toContain('missing acceptance criteria');
    expect(preview.manifest.packageQuality.blockers).toContain('missing verification steps');
    expect(preview.manifest.packageQuality.blockers).toContain('blocking open questions present');
  });

  it('refuses to write non-executable run artifacts', () => {
    const root = tempRepo();

    expect(() => createRunArtifacts(root, ambiguousPlan as any, 'run', { executor: 'omc-claude', harnessSkill: '/deep-interview' }))
      .toThrow(/Run package is not executable/);
    expect(existsSync(join(root, '.osc/runs'))).toBe(false);
  });

  it('blocks verification steps that defer proof to an external runner', () => {
    const root = tempRepo();
    const deferringPlan = {
      ...plan,
      slug: '003-defers-proof',
      verificationSteps: ['External runner executes the scorer after the model turn.'],
    };

    const preview = previewRunArtifacts(root, deferringPlan as any, 'run');

    expect(preview.manifest.packageQuality.executable).toBe(false);
    expect(preview.manifest.packageQuality.blockers).toContain('verification steps defer execution outside the run packet');
    expect(() => createRunArtifacts(root, deferringPlan as any, 'run')).toThrow(/verification steps defer execution outside the run packet/);
  });

  it('recognizes labeled osc commands as executable verification', () => {
    const root = tempRepo();
    const labeledOscPlan = {
      ...plan,
      slug: '004-labeled-osc-verification',
      verificationSteps: ['**Search:** Run `osc runtimes search omx`. Verify output includes the adapter.'],
    };

    const preview = previewRunArtifacts(root, labeledOscPlan as any, 'run');

    expect(preview.manifest.packageQuality.executable).toBe(true);
    expect(preview.manifest.packageQuality.blockers).toEqual([]);
  });

  it('allows verification policy text that rejects deferred external proof', () => {
    const root = tempRepo();
    const scorerPlan = {
      ...plan,
      slug: '005-scorer-in-loop',
      verificationSteps: [
        'Run `cargo run -p m2000-v3-conformance --quiet -- artifact --json-out reports/result.json` before final handoff.',
        'If the scorer command cannot run, record exact command, exit status, and stderr; do not count a later operator or external runner as verification.',
      ],
    };

    const preview = previewRunArtifacts(root, scorerPlan as any, 'run');

    expect(preview.manifest.packageQuality.executable).toBe(true);
    expect(preview.manifest.packageQuality.blockers).toEqual([]);
  });

  it('still blocks instructions that explicitly say not to run verification because an external runner will run it', () => {
    const root = tempRepo();
    const deferringPlan = {
      ...plan,
      slug: '006-do-not-run-defers-proof',
      verificationSteps: ['Do not run `npm test`; the external runner will run it after your turn.'],
    };

    const preview = previewRunArtifacts(root, deferringPlan as any, 'run');

    expect(preview.manifest.packageQuality.executable).toBe(false);
    expect(preview.manifest.packageQuality.blockers).toContain('verification steps defer execution outside the run packet');
  });

  it('still blocks non-runnable deferred steps even when they disclaim the external result', () => {
    const root = tempRepo();
    const deferringPlan = {
      ...plan,
      slug: '007-do-not-run-disclaims-deferral',
      verificationSteps: ['Do not run `npm test`; the external runner will run it after your turn and does not count as verification.'],
    };

    const preview = previewRunArtifacts(root, deferringPlan as any, 'run');

    expect(preview.manifest.packageQuality.executable).toBe(false);
    expect(preview.manifest.packageQuality.blockers).toContain('verification steps defer execution outside the run packet');
  });

  it('still blocks external-only commands even when they disclaim the external result', () => {
    const root = tempRepo();
    const deferringPlan = {
      ...plan,
      slug: '008-external-only-command-disclaims-deferral',
      verificationSteps: ['External runner will run `npm test` after your turn and does not count as verification.'],
    };

    const preview = previewRunArtifacts(root, deferringPlan as any, 'run');

    expect(preview.manifest.packageQuality.executable).toBe(false);
    expect(preview.manifest.packageQuality.blockers).toContain('verification steps defer execution outside the run packet');
  });

  it('allows non-blocking open questions while only blocking explicit BLOCKING questions', () => {
    const root = tempRepo();
    const planWithFutureQuestion = {
      ...plan,
      openQuestions: ['Future: should this become a GitHub Action later?'],
    };

    const run = createRunArtifacts(root, planWithFutureQuestion as any, 'run');
    const manifest = JSON.parse(readFileSync(run.manifestPath, 'utf8'));

    expect(manifest.packageQuality.executable).toBe(true);
    expect(manifest.packageQuality.blockers).toEqual([]);
  });


  it('records runtime preset and workflow selection for adapter dispatch', () => {
    const root = tempRepo();

    const run = createRunArtifacts(root, plan as any, 'run', {
      runtime: 'omx',
      workflow: 'plan',
      executor: 'omx-codex',
      harnessSkill: '$ralplan',
    });

    const manifest = JSON.parse(readFileSync(run.manifestPath, 'utf8'));

    expect(manifest.runtimeSelection).toMatchObject({ runtime: 'omx', workflow: 'plan' });
    expect(manifest.executor).toMatchObject({ lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false });
  });

  it('previews run artifacts in memory without creating .osc/runs files', () => {
    const root = tempRepo();
    const planWithFiles = {
      ...plan,
      filesToTouch: ['src/artifacts.ts', 'src/cli.ts'],
    };

    const preview = previewRunArtifacts(root, planWithFiles as any, 'run', {
      runtime: 'omx',
      workflow: 'plan',
      executor: 'omx-codex',
      harnessSkill: '$ralplan',
    });

    expect(existsSync(join(root, '.osc/runs'))).toBe(false);
    expect(preview.runId).toContain('001-demo-run');
    expect(preview.manifest.runId).toBe(preview.runId);
    expect(preview.manifest.artifacts.runDir).toContain('.osc/runs/');
    expect(preview.manifest.artifacts.manifest).toContain('run.json');
    expect(preview.manifest.executor).toMatchObject({ lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false });
    expect(preview.manifest.runtimeSelection).toMatchObject({ runtime: 'omx', workflow: 'plan' });
    expect(preview.manifest.plan.filesToTouch).toEqual(['src/artifacts.ts', 'src/cli.ts']);
    expect(preview.packageMarkdown).toContain('# Open Scaffold Prompt: Group A');
    expect(preview.promptFiles).toHaveLength(1);
    expect(preview.promptFiles[0].relativePath).toBe('.osc/runs/' + preview.runId + '/prompts/group-a.md');
  });

});
