import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function writeRunPacket(root: string, runId: string) {
  const runDir = join(root, `.osc/runs/${runId}`);
  mkdirSync(runDir, { recursive: true });
  const runPath = join(runDir, 'run.json');
  const proofPath = join(root, `docs/evidence/${runId}-proof.md`);
  writeFileSync(runPath, JSON.stringify({
    schemaVersion: 'open-scaffold.run.v1',
    runId,
    taskId: 'task-123',
    plan: { slug: '087-demo', path: '.osc/plans/active/087-demo.md', acceptanceCriteria: ['Loop state is created.', 'Frontier promotion is explicit.'] },
    artifacts: { evidence: [`docs/evidence/${runId}-proof.md`] },
  }, null, 2));
  writeFileSync(proofPath, `${runId} proof`);
  return runPath;
}

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-cli-evolution-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/runs/demo-run'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  const planPath = join(root, '.osc/plans/active/087-demo.md');
  writeFileSync(planPath, `# Plan: 087-demo

## Status

active

## Context

Demo.

## Goal

Improve the run contract.

## Constraints / Out of scope

- Do not spawn runtimes.

## Files to touch

- src/evolution.ts

## Acceptance criteria

- [ ] Loop state is created.
- [ ] Frontier promotion is explicit.

## Verification steps

1. Run tests.

## Open questions

- None.
`);
  const runPath = writeRunPacket(root, 'demo-run');
  const evalPath = join(root, 'docs/evidence/evaluation.json');
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: 'eval-001',
    subject: { source: 'run', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo', task_id: 'task-123', run_id: 'demo-run', run_packet: '.osc/runs/demo-run/run.json' },
    decision: { status: 'approved', approver: 'human', rationale: 'Evidence reviewed.' },
    improvement: { route: 'close', target: null, carried_forward: [], do_not_assume: ['No model benchmark claim.'] },
  }, null, 2));
  const receiptPath = join(root, '.osc/runs/demo-run/dispatch-receipt.json');
  const adapterEvidencePath = join(root, '.osc/runs/demo-run/runtime-omx-evidence.md');
  const adapterLogPath = join(root, '.osc/runs/demo-run/runtime-omx.log');
  writeFileSync(receiptPath, JSON.stringify({
    schema_version: 'open-scaffold.dispatch-receipt.v1',
    receipt_id: 'runtime-omx:no-spawn-preview:demo-run',
    run_id: 'demo-run',
    adapter_id: 'runtime-omx',
    runtime_backend: 'omx',
    artifacts: ['.osc/runs/demo-run/runtime-omx-evidence.md', '.osc/runs/demo-run/runtime-omx.log'],
    status: 'dry_run',
  }, null, 2));
  writeFileSync(adapterEvidencePath, 'runtime omx evidence');
  writeFileSync(adapterLogPath, 'runtime omx log');
  return { root, planPath, runPath, evalPath, receiptPath, adapterEvidencePath, adapterLogPath };
}

describe('osc evolve CLI', () => {
  it('initializes and checks an evolution loop without spawning a runtime', () => {
    const { root, planPath } = tempRepo();
    const outDir = join(root, '.osc/evolution/demo-loop');

    const output = execFileSync(tsx, [cli, 'evolve', 'init', planPath, '--out', outDir, '--strategy', 'greedy'], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Created evolution loop:');
    expect(existsSync(join(outDir, 'loop.json'))).toBe(true);
    expect(existsSync(join(outDir, 'attempts.jsonl'))).toBe(true);
    expect(existsSync(join(outDir, 'frontier.json'))).toBe(true);
    const loop = JSON.parse(readFileSync(join(outDir, 'loop.json'), 'utf8'));
    expect(loop.strategy).toMatchObject({ name: 'greedy', executes_in_core: false });
    expect(JSON.stringify(loop)).not.toContain('dangerously-bypass');

    const check = execFileSync(tsx, [cli, 'evolve', 'check', outDir], { cwd: root, encoding: 'utf8' });
    expect(check).toContain('PASS evolution loop structure valid');
    expect(check).toContain('does not execute attempts, rank models, certify compliance, or approve release');
  });

  it('uses a loop-id subdirectory under .osc/evolution by default', () => {
    const { root, planPath } = tempRepo();

    const output = execFileSync(tsx, [cli, 'evolve', 'init', planPath], { cwd: root, encoding: 'utf8' });
    const createdLine = output.split('\n').find((line) => line.startsWith('Created evolution loop: '));
    const loopDir = createdLine?.replace('Created evolution loop: ', '').trim();

    expect(loopDir).toBeTruthy();
    expect(realpathSync(dirname(loopDir!))).toBe(realpathSync(join(root, '.osc/evolution')));
    expect(loopDir).toMatch(/087-demo-evolution$/);
    expect(existsSync(join(loopDir!, 'loop.json'))).toBe(true);
    expect(existsSync(join(root, '.osc/evolution/loop.json'))).toBe(false);
  });

  it('preserves relative evolve paths from a subdirectory before using the scaffold root', () => {
    const { root } = tempRepo();
    const subdir = join(root, 'subdir');
    mkdirSync(subdir, { recursive: true });

    const output = execFileSync(tsx, [cli, 'evolve', 'init', '../.osc/plans/active/087-demo.md'], { cwd: subdir, encoding: 'utf8' });
    const createdLine = output.split('\n').find((line) => line.startsWith('Created evolution loop: '));
    const loopDir = createdLine?.replace('Created evolution loop: ', '').trim();
    expect(loopDir).toBeTruthy();
    expect(realpathSync(dirname(loopDir!))).toBe(realpathSync(join(root, '.osc/evolution')));

    const relativeLoopDir = `../.osc/evolution/${basename(loopDir!)}`;
    const record = execFileSync(tsx, [
      cli,
      'evolve',
      'record',
      relativeLoopDir,
      '--run',
      '../.osc/runs/demo-run/run.json',
      '--evaluation',
      '../docs/evidence/evaluation.json',
      '--decision',
      'promote',
      '--rationale',
      'Best subdir evidence.',
    ], { cwd: subdir, encoding: 'utf8' });
    expect(record).toContain('Recorded evolution attempt: demo-run');

    const check = execFileSync(tsx, [cli, 'evolve', 'check', relativeLoopDir], { cwd: subdir, encoding: 'utf8' });
    expect(check).toContain('PASS evolution loop structure valid');
    const frontier = JSON.parse(readFileSync(join(loopDir!, 'frontier.json'), 'utf8'));
    expect(frontier.current).toMatchObject({ attempt_id: 'demo-run', rationale: 'Best subdir evidence.' });
  });

  it('records a promoted attempt and updates frontier with explicit rationale', () => {
    const { root, planPath, runPath, evalPath } = tempRepo();
    const outDir = join(root, '.osc/evolution/demo-loop');
    execFileSync(tsx, [cli, 'evolve', 'init', planPath, '--out', outDir], { cwd: root, encoding: 'utf8' });

    const output = execFileSync(tsx, [cli, 'evolve', 'record', outDir, '--run', runPath, '--evaluation', evalPath, '--decision', 'promote', '--score', '0.93', '--rationale', 'Best evidence so far.'], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Recorded evolution attempt: demo-run');
    expect(output).toContain('Updated frontier: demo-run');
    const frontier = JSON.parse(readFileSync(join(outDir, 'frontier.json'), 'utf8'));
    expect(frontier.current).toMatchObject({ attempt_id: 'demo-run', run_id: 'demo-run', score: 0.93, rationale: 'Best evidence so far.' });
  });

  it('records adapter receipts and evidence through CLI options with subdirectory-relative paths', () => {
    const { root, receiptPath } = tempRepo();
    const subdir = join(root, 'subdir');
    mkdirSync(subdir, { recursive: true });
    const init = execFileSync(tsx, [cli, 'evolve', 'init', '../.osc/plans/active/087-demo.md'], { cwd: subdir, encoding: 'utf8' });
    const createdLine = init.split('\n').find((line) => line.startsWith('Created evolution loop: '));
    const loopDir = createdLine?.replace('Created evolution loop: ', '').trim();
    expect(loopDir).toBeTruthy();
    const relativeLoopDir = `../.osc/evolution/${basename(loopDir!)}`;

    const output = execFileSync(tsx, [
      cli,
      'evolve',
      'record',
      relativeLoopDir,
      '--run',
      '../.osc/runs/demo-run/run.json',
      '--receipt',
      '../.osc/runs/demo-run/dispatch-receipt.json',
      '--evidence',
      '../.osc/runs/demo-run/runtime-omx-evidence.md',
      '--evidence',
      '../.osc/runs/demo-run/runtime-omx.log',
      '--decision',
      'retry',
      '--rationale',
      'Record runtime OMX adapter output refs.',
    ], { cwd: subdir, encoding: 'utf8' });

    expect(output).toContain('Recorded evolution attempt: demo-run');
    const attempts = readFileSync(join(loopDir!, 'attempts.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(attempts[0].adapter_receipts).toEqual(['.osc/runs/demo-run/dispatch-receipt.json']);
    expect(attempts[0].evidence_refs).toEqual(expect.arrayContaining([
      '.osc/runs/demo-run/dispatch-receipt.json',
      '.osc/runs/demo-run/runtime-omx-evidence.md',
      '.osc/runs/demo-run/runtime-omx.log',
    ]));
    expect(receiptPath).toContain('dispatch-receipt.json');
  });

  it('rejects promotion without rationale instead of silently updating frontier', () => {
    const { root, planPath, runPath } = tempRepo();
    const outDir = join(root, '.osc/evolution/demo-loop');
    execFileSync(tsx, [cli, 'evolve', 'init', planPath, '--out', outDir], { cwd: root, encoding: 'utf8' });

    const result = spawnSync(tsx, [cli, 'evolve', 'record', outDir, '--run', runPath, '--decision', 'promote'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Promotion, rejection, retry, and block decisions require a rationale');
    const frontier = JSON.parse(readFileSync(join(outDir, 'frontier.json'), 'utf8'));
    expect(frontier.current).toBeNull();
  });

  it('compares evolution attempts and writes markdown output', () => {
    const { root, planPath, runPath } = tempRepo();
    const runB = writeRunPacket(root, 'attempt-b');
    const outDir = join(root, '.osc/evolution/demo-loop');
    const reportPath = join(root, 'docs/evidence/evolution-compare.md');
    execFileSync(tsx, [cli, 'evolve', 'init', planPath, '--out', outDir, '--strategy', 'greedy'], { cwd: root, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'evolve', 'record', outDir, '--run', runPath, '--decision', 'promote', '--score', '0.62', '--rationale', 'First promoted frontier.'], { cwd: root, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'evolve', 'record', outDir, '--run', runB, '--decision', 'promote', '--score', '0.94', '--rationale', 'Better frontier.'], { cwd: root, encoding: 'utf8' });

    const output = execFileSync(tsx, [cli, 'evolve', 'compare', outDir, '--format', 'markdown', '--out', reportPath], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Wrote evolution comparison:');
    const report = readFileSync(reportPath, 'utf8');
    expect(report).toContain('# Evolution loop: demo-loop — A vs B');
    expect(report).toContain('| Score | 0.62 | 0.94 | +0.32 ▲ |');
    expect(report).toContain('**B (promote):** Better frontier.');
  });

  it('rejects unknown strategies and prints evolve usage', () => {
    const { root, planPath } = tempRepo();
    const result = spawnSync(tsx, [cli, 'evolve', 'init', planPath, '--strategy', 'magical'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Invalid value for --strategy: magical');
    expect(result.stderr).toContain('Usage: osc evolve init');
  });
});
