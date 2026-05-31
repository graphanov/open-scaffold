import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const evolutionDemoLoop = join(repoRoot, 'examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer');
const evolutionDemoExpectedCompare = join(repoRoot, 'examples/evolution-ledger-demo/docs/evidence/evolution-compare-expected.md');

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
    acceptance_criteria: [
      {
        id: 'AC1',
        text: 'Loop state is created.',
        status: 'pass',
        evaluator: { kind: 'human', name: 'reviewer', ref: null },
        evidence: [{ kind: 'path', ref: 'docs/evidence/demo-run-proof.md', summary: 'Synthetic CLI evidence.' }],
        rationale: 'Loop state exists.',
      },
      {
        id: 'AC2',
        text: 'Frontier promotion is explicit.',
        status: 'fail',
        evaluator: { kind: 'human', name: 'reviewer', ref: null },
        evidence: [{ kind: 'path', ref: 'docs/evidence/demo-run-proof.md', summary: 'Synthetic CLI evidence.' }],
        rationale: 'Frontier rationale needs a clearer comparison.',
      },
    ],
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

function writePlateauCliEvaluation(root: string, runId: string, ac2Status: 'pass' | 'fail') {
  const evalPath = join(root, `docs/evidence/${runId}-evaluation.json`);
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: `eval-${runId}`,
    subject: { source: 'run', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo', task_id: 'task-123', run_id: runId, run_packet: `.osc/runs/${runId}/run.json` },
    acceptance_criteria: [
      {
        id: 'AC1',
        text: 'Loop state is created.',
        status: 'pass',
        evaluator: { kind: 'human', name: 'reviewer', ref: null },
        evidence: [{ kind: 'path', ref: 'docs/evidence/demo-run-proof.md', summary: 'Synthetic CLI evidence.' }],
        rationale: 'Loop state exists.',
      },
      {
        id: 'AC2',
        text: 'Frontier promotion is explicit.',
        status: ac2Status,
        evaluator: { kind: 'human', name: 'reviewer', ref: null },
        evidence: [{ kind: 'path', ref: 'docs/evidence/demo-run-proof.md', summary: 'Synthetic CLI evidence.' }],
        rationale: ac2Status === 'pass' ? 'Reachable criterion fixed.' : 'Reachable criterion failed.',
      },
      {
        id: 'AC28',
        text: 'Renderer probe returns a playable visual artifact.',
        status: 'fail',
        evaluator: { kind: 'domain-tool', name: 'synthetic-scorer', ref: 'docs/evidence/scorer.md' },
        evidence: [{ kind: 'path', ref: 'docs/evidence/scorer.md', summary: 'Probe-only criterion is hardcoded pass=false for headless JSON drivers.' }],
        rationale: 'Probe-only and impossible for the current artifact type.',
        analysis: { score_sensitivity: 'none', impossible: true, reason: 'probe_only', source: 'docs/evidence/scorer.md#AC28' },
      },
    ],
    decision: { status: 'rejected', approver: 'human', rationale: 'Score frontier is not acceptance approval.' },
    improvement: { route: 'create_next_slice', target: null, carried_forward: [], do_not_assume: ['No raw benchmark win.'] },
  }, null, 2));
  return evalPath;
}

function writePlateauCliLoop() {
  const { root, planPath } = tempRepo();
  const outDir = join(root, '.osc/evolution/plateau-loop');
  writeFileSync(join(root, 'docs/evidence/scorer.md'), 'AC28 is probe-only/pass-false for this synthetic driver.');
  execFileSync(tsx, [cli, 'evolve', 'init', planPath, '--out', outDir, '--strategy', 'greedy'], { cwd: root, encoding: 'utf8' });
  const attempts = [
    { runId: 'attempt-a', score: '0.9', ac2Status: 'fail' as const, decision: 'promote', rationale: 'First score frontier.' },
    { runId: 'attempt-b', score: '0.944893', ac2Status: 'pass' as const, decision: 'promote', rationale: 'Improved reachable AC2.' },
    { runId: 'attempt-c', score: '0.944893', ac2Status: 'pass' as const, decision: 'retry', rationale: 'Retry plateaued.' },
    { runId: 'attempt-d', score: '0.944893', ac2Status: 'pass' as const, decision: 'retry', rationale: 'Remaining failure is probe-only.' },
  ];
  for (const attempt of attempts) {
    const runPath = writeRunPacket(root, attempt.runId);
    const evalPath = writePlateauCliEvaluation(root, attempt.runId, attempt.ac2Status);
    execFileSync(tsx, [cli, 'evolve', 'record', outDir, '--run', runPath, '--evaluation', evalPath, '--decision', attempt.decision, '--score', attempt.score, '--rationale', attempt.rationale], { cwd: root, encoding: 'utf8' });
  }
  return { root, outDir };
}

describe('checked-in evolution ledger demo fixture through the CLI', () => {
  it('checks the committed fixture and renders the expected markdown exactly', () => {
    const check = execFileSync(tsx, [cli, 'evolve', 'check', evolutionDemoLoop], { cwd: repoRoot, encoding: 'utf8' });
    expect(check).toContain('PASS evolution loop structure valid; 0 warning(s)');

    const markdown = execFileSync(tsx, [cli, 'evolve', 'compare', evolutionDemoLoop, '--format', 'markdown'], { cwd: repoRoot, encoding: 'utf8' });
    const expected = readFileSync(evolutionDemoExpectedCompare, 'utf8');

    expect(markdown).toBe(expected);
    expect(markdown).toContain('# Evolution loop: reviewable-csv-importer — A vs B');
    expect(markdown).toContain('| Score | 0.62 | 0.94 | +0.32 ▲ |');
    expect(markdown).toContain('| AC2 — Malformed rows return an error that identifies the row and column of the offending token. | ✗ fail | ✓ pass ▲ |');
    expect(markdown).toContain('**B (promote):** Promoted to current frontier. AC2 now reports row and column of the offending token; AC1 and AC3 remain passing. Operator promoted after manual review of the evaluation envelope.');
  });
});

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

  it('compares evolution attempts and writes markdown output with acceptance criteria delta', () => {
    const { root, planPath, runPath, evalPath } = tempRepo();
    const runB = writeRunPacket(root, 'attempt-b');
    const evalB = join(root, 'docs/evidence/attempt-b-evaluation.json');
    writeFileSync(evalB, JSON.stringify({
      schema: 'open-scaffold.evaluation.v1',
      evaluation_id: 'eval-attempt-b',
      subject: { source: 'run', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo', task_id: 'task-123', run_id: 'attempt-b', run_packet: '.osc/runs/attempt-b/run.json' },
      acceptance_criteria: [
        {
          id: 'AC1',
          text: 'Loop state is created.',
          status: 'pass',
          evaluator: { kind: 'human', name: 'reviewer', ref: null },
          evidence: [{ kind: 'path', ref: 'docs/evidence/attempt-b-proof.md', summary: 'Synthetic CLI evidence.' }],
          rationale: 'Loop state exists.',
        },
        {
          id: 'AC2',
          text: 'Frontier promotion is explicit.',
          status: 'pass',
          evaluator: { kind: 'human', name: 'reviewer', ref: null },
          evidence: [{ kind: 'path', ref: 'docs/evidence/attempt-b-proof.md', summary: 'Synthetic CLI evidence.' }],
          rationale: 'Frontier rationale is explicit.',
        },
      ],
      decision: { status: 'approved', approver: 'human', rationale: 'Evidence reviewed.' },
      improvement: { route: 'close', target: null, carried_forward: [], do_not_assume: ['No model benchmark claim.'] },
    }, null, 2));
    const outDir = join(root, '.osc/evolution/demo-loop');
    const reportPath = join(root, 'docs/evidence/evolution-compare.md');
    execFileSync(tsx, [cli, 'evolve', 'init', planPath, '--out', outDir, '--strategy', 'greedy'], { cwd: root, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'evolve', 'record', outDir, '--run', runPath, '--evaluation', evalPath, '--decision', 'promote', '--score', '0.62', '--rationale', 'First promoted frontier.'], { cwd: root, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'evolve', 'record', outDir, '--run', runB, '--evaluation', evalB, '--decision', 'promote', '--score', '0.94', '--rationale', 'Better frontier.'], { cwd: root, encoding: 'utf8' });

    const output = execFileSync(tsx, [cli, 'evolve', 'compare', outDir, '--format', 'markdown', '--out', reportPath], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Wrote evolution comparison:');
    const report = readFileSync(reportPath, 'utf8');
    expect(report).toContain('# Evolution loop: demo-loop — A vs B');
    expect(report).toContain('| Score | 0.62 | 0.94 | +0.32 ▲ |');
    expect(report).toContain('**B (promote):** Better frontier.');
    expect(report).toContain('## Acceptance criteria delta');
    expect(report).toContain('| AC2 — Frontier promotion is explicit. | ✗ fail | ✓ pass ▲ |');
  });

  it('analyzes a plateau loop in terminal, markdown, and JSON without mutating evidence unless --out is supplied', () => {
    const { root, outDir } = writePlateauCliLoop();
    const before = {
      loop: readFileSync(join(outDir, 'loop.json'), 'utf8'),
      attempts: readFileSync(join(outDir, 'attempts.jsonl'), 'utf8'),
      frontier: readFileSync(join(outDir, 'frontier.json'), 'utf8'),
    };
    const reportPath = join(root, 'docs/evidence/evolution-analysis.md');

    const terminal = execFileSync(tsx, [cli, 'evolve', 'analyze', outDir], { cwd: root, encoding: 'utf8' });
    expect(terminal).toContain('Evolution Analysis: plateau-loop');
    expect(terminal).toContain('Plateau: plateau — 2 attempt(s) since last score improvement');
    expect(terminal).toContain('Recommendation: redesign');
    expect(existsSync(reportPath)).toBe(false);

    const json = JSON.parse(execFileSync(tsx, [cli, 'evolve', 'analyze', outDir, '--format', 'json'], { cwd: root, encoding: 'utf8' }));
    expect(json.recommendation.action).toBe('redesign');
    expect(json.criteria.find((criterion: { id: string }) => criterion.id === 'AC28')).toMatchObject({ impossible: true, sensitivity: 'none' });

    const output = execFileSync(tsx, [cli, 'evolve', 'analyze', outDir, '--format', 'markdown', '--out', reportPath], { cwd: root, encoding: 'utf8' });
    expect(output).toContain('Wrote evolution analysis:');
    const report = readFileSync(reportPath, 'utf8');
    expect(report).toContain('# Evolution analysis: plateau-loop');
    expect(report).toContain('## Current vs frontier AC delta');
    expect(report).toContain('`redesign`');

    expect(readFileSync(join(outDir, 'loop.json'), 'utf8')).toBe(before.loop);
    expect(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')).toBe(before.attempts);
    expect(readFileSync(join(outDir, 'frontier.json'), 'utf8')).toBe(before.frontier);
  });

  it('rejects unknown strategies and prints evolve usage', () => {
    const { root, planPath } = tempRepo();
    const result = spawnSync(tsx, [cli, 'evolve', 'init', planPath, '--strategy', 'magical'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Invalid value for --strategy: magical');
    expect(result.stderr).toContain('Usage: osc evolve init');
  });
});
