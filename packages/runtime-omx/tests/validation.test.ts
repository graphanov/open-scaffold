import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runNoSpawnOmx, ValidationError } from '../src/index.js';
import { tempRunPacket, readJson } from './fixtures.js';

function expectValidationError(fn: () => unknown, message: string) {
  try {
    fn();
    throw new Error('expected validation error');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect(String((error as Error).message)).toContain(message);
  }
}

describe('runtime-omx validation and default no-spawn receipt', () => {
  it('accepts a valid OMX $ralplan run packet and writes deterministic artifacts', () => {
    const { root, path } = tempRunPacket();

    const result = runNoSpawnOmx(path);
    const receipt = readJson(result.receiptPath);
    const evidence = readFileSync(result.evidencePath, 'utf8');

    expect(result.runId).toBe('demo-run');
    expect(result.receiptPath).toBe(join(root, '.osc/runs/demo/dispatch-receipt.json'));
    expect(result.evidencePath).toBe(join(root, '.osc/runs/demo/runtime-omx-evidence.md'));
    expect(result.logPath).toBeNull();
    expect(receipt).toMatchObject({
      schema_version: 'open-scaffold.dispatch-receipt.v1',
      receipt_id: 'runtime-omx:no-spawn-preview:demo-run',
      run_id: 'demo-run',
      task_id: 'task:demo',
      adapter_id: 'runtime-omx',
      runtime_backend: 'omx',
      invoked_by: '@open-scaffold/runtime-omx',
      invoked_at: '1970-01-01T00:00:00.000Z',
      working_directory: root,
      run_packet_path: '.osc/runs/demo/run.json',
      spawned: false,
      status: 'dry_run',
      runtime_selection: { runtime: 'omx', workflow: 'plan', profile_id: 'omx', profile_source: 'builtin' },
      official_continuity: {
        repo: 'https://github.com/Yeachan-Heo/oh-my-codex',
        inspected_commit: 'ffef59333bccc0fc3175439f1c4892522412d29e',
        package: 'oh-my-codex',
        version: '0.17.3',
      },
      runtime_version: null,
      runtime_omx: {
        kind: 'no-spawn-preview',
        workflow: '$ralplan',
        canonical_equivalent: '$plan --consensus',
        adapter_spawned_runtime: false,
        network_required: false,
        credentials_required: false,
        tmux_used: false,
        source_mutation: false,
        exit_status: null,
      },
    });
    expect(receipt.command_preview).toMatchObject({ spawned: false, attempted: false });
    expect(receipt.command_preview.argv.slice(0, 7)).toEqual(['omx', 'exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-C', root]);
    expect(receipt.command_preview.argv.at(-1)).toContain('redacted');
    expect(receipt.artifacts).toEqual(['.osc/runs/demo/runtime-omx-evidence.md']);
    expect(receipt.logs).toEqual([]);
    expect(evidence).toContain('Schema: open-scaffold.adapter-evidence.v1');
    expect(evidence).toContain('Runtime backend: omx');
    expect(evidence).toContain('Workflow: $ralplan');
    expect(evidence).toContain('Spawned: false');
    expect(evidence).toContain('Commit/push/merge/publish authority: false');
  });

  it('rejects unsupported schemaVersion', () => {
    const { path } = tempRunPacket({ schemaVersion: 'wrong' });
    expectValidationError(() => runNoSpawnOmx(path), 'schemaVersion must be open-scaffold.run.v1');
  });

  it('rejects missing plan goal, acceptance criteria, or verification steps', () => {
    const { path } = tempRunPacket({
      plan: { path: '.osc/plans/active/042.md', goal: '', acceptanceCriteria: [], verificationSteps: [], openQuestions: [] },
    });
    expectValidationError(() => runNoSpawnOmx(path), 'goal must be a non-empty string');
    expectValidationError(() => runNoSpawnOmx(path), 'plan.acceptanceCriteria must be a non-empty string array');
  });

  it('rejects non-executable packets and blockers', () => {
    const { path } = tempRunPacket({ packageQuality: { executable: false, blockers: ['missing acceptance criteria'] } });
    expectValidationError(() => runNoSpawnOmx(path), 'packageQuality.executable must be true');
    expectValidationError(() => runNoSpawnOmx(path), 'packageQuality.blockers must be an empty array');
  });

  it('rejects blocking open questions', () => {
    const { path } = tempRunPacket({
      plan: {
        path: '.osc/plans/active/042.md',
        goal: 'Preview.',
        acceptanceCriteria: ['ok'],
        verificationSteps: ['verify'],
        openQuestions: ['BLOCKING: choose a runtime first'],
      },
    });
    expectValidationError(() => runNoSpawnOmx(path), 'plan.openQuestions must not contain blocking questions');
  });

  it('rejects blocking open questions wherever the marker appears in the string', () => {
    const { path } = tempRunPacket({
      plan: {
        path: '.osc/plans/active/042.md',
        goal: 'Preview.',
        acceptanceCriteria: ['ok'],
        verificationSteps: ['verify'],
        openQuestions: ['Needs approval (blocking) before dispatch'],
      },
    });
    expectValidationError(() => runNoSpawnOmx(path), 'plan.openQuestions must not contain blocking questions');
  });

  it('allows explicit no-blocking open question placeholders', () => {
    const { path } = tempRunPacket({
      plan: {
        path: '.osc/plans/active/042.md',
        goal: 'Preview.',
        acceptanceCriteria: ['ok'],
        verificationSteps: ['verify'],
        openQuestions: ['No blocking questions.'],
      },
    });
    expect(() => runNoSpawnOmx(path)).not.toThrow();
  });

  it('allows non-blocking follow-up notes', () => {
    const { path } = tempRunPacket({
      plan: {
        path: '.osc/plans/active/042.md',
        goal: 'Preview.',
        acceptanceCriteria: ['ok'],
        verificationSteps: ['verify'],
        openQuestions: ['Non-blocking: follow-up later'],
      },
    });
    expect(() => runNoSpawnOmx(path)).not.toThrow();
  });

  it('accepts the user-facing Codex runtime alias while retaining the runtime-omx adapter boundary', () => {
    const { path } = tempRunPacket({ runtimeSelection: { runtime: 'codex', workflow: 'plan', profileId: 'codex', profileSource: 'builtin' } });

    const result = runNoSpawnOmx(path);
    const receipt = readJson(result.receiptPath);
    const evidence = readFileSync(result.evidencePath, 'utf8');

    expect(receipt).toMatchObject({
      adapter_id: 'runtime-omx',
      runtime_backend: 'omx',
      invoked_by: '@open-scaffold/runtime-omx',
      runtime_selection: { runtime: 'codex', workflow: 'plan', profile_id: 'codex', profile_source: 'builtin' },
      spawned: false,
      status: 'dry_run',
    });
    expect(evidence).toContain('Adapter ID: runtime-omx');
    expect(evidence).toContain('Selected runtime: codex');
    expect(evidence).toContain('Runtime backend: omx');
  });

  it('rejects unsupported runtime selections', () => {
    const { path } = tempRunPacket({ runtimeSelection: { runtime: 'omc', workflow: 'plan', profileId: 'omc', profileSource: 'builtin' } });
    expectValidationError(() => runNoSpawnOmx(path), 'runtimeSelection.runtime must be omx or codex');
  });

  it('rejects unsupported OMX workflows before later slices', () => {
    const { path } = tempRunPacket({ runtimeSelection: { runtime: 'omx', workflow: 'loop', profileId: 'omx', profileSource: 'builtin' } });
    expectValidationError(() => runNoSpawnOmx(path), 'runtimeSelection.workflow must be plan');
  });

  it('rejects mismatched executor lane or missing $ralplan harness skill', () => {
    const lane = tempRunPacket({ executor: { lane: 'plain-agent', harnessSkill: '$ralplan', spawning: false } });
    expectValidationError(() => runNoSpawnOmx(lane.path), 'executor.lane must be omx-codex');

    const skill = tempRunPacket({ executor: { lane: 'omx-codex', harnessSkill: '$team', spawning: false } });
    expectValidationError(() => runNoSpawnOmx(skill.path), 'executor.harnessSkill must be $ralplan');
  });

  it('rejects executor spawning true and runtime process handles', () => {
    const spawning = tempRunPacket({ executor: { lane: 'omx-codex', harnessSkill: '$ralplan', spawning: true } });
    expectValidationError(() => runNoSpawnOmx(spawning.path), 'executor.spawning must be false');

    const handle = tempRunPacket({ runtime: { repoPath: spawning.root, worktreePath: spawning.root, branch: 'main', tmuxSession: 'omx-demo', processId: 123 } });
    expectValidationError(() => runNoSpawnOmx(handle.path), 'runtime.tmuxSession must be null');
    expectValidationError(() => runNoSpawnOmx(handle.path), 'runtime.processId must be null');
  });

  it('requires runtime.repoPath and commitPolicy', () => {
    const { path } = tempRunPacket({ runtime: { repoPath: null, worktreePath: null, branch: null, tmuxSession: null, processId: null }, commitPolicy: '' });
    expectValidationError(() => runNoSpawnOmx(path), 'repoPath must be a non-empty string');
    expectValidationError(() => runNoSpawnOmx(path), 'commitPolicy must be a non-empty string');
  });

  it('writes no artifacts when validation fails', () => {
    const { root, path } = tempRunPacket({ executor: { lane: 'omx-codex', harnessSkill: '$ralplan', spawning: true } });
    expectValidationError(() => runNoSpawnOmx(path), 'executor.spawning must be false');
    expect(existsSync(join(root, '.osc/runs/demo/dispatch-receipt.json'))).toBe(false);
    expect(existsSync(join(root, '.osc/runs/demo/runtime-omx-evidence.md'))).toBe(false);
    expect(existsSync(join(root, '.osc/runs/demo/runtime-omx.log'))).toBe(false);
  });
});
