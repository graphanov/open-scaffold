import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  EVOLUTION_LOOP_SCHEMA,
  analyzeEvolutionLoop,
  compareEvolutionLoop,
  loadEvolutionSource,
  recordEvolutionAttempt,
  renderEvolutionAnalysis,
  renderEvolutionComparison,
  renderEvolutionLoopFiles,
  validateEvolutionLoopDir,
  writeEvolutionLoop,
} from '../src/evolution.js';

const repoRoot = resolve(import.meta.dirname, '..');
const evolutionDemoRoot = join(repoRoot, 'examples/evolution-ledger-demo');
const evolutionDemoLoop = join(evolutionDemoRoot, '.osc/evolution/reviewable-csv-importer');

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-evolution-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  mkdirSync(join(root, '.osc/runs/demo-run'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  return root;
}

function writePlan(root: string) {
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

- [ ] AC1: Loop state is created.
- [ ] AC2: Frontier promotion is explicit.

## Verification steps

1. Run tests.

## Open questions

- None.
`);
  return planPath;
}

function writeRunPacket(root: string, runId = 'demo-run') {
  const runDir = join(root, `.osc/runs/${runId}`);
  mkdirSync(runDir, { recursive: true });
  const runPath = join(runDir, 'run.json');
  writeFileSync(runPath, JSON.stringify({
    schemaVersion: 'open-scaffold.run.v1',
    runId,
    taskId: 'task-123',
    plan: {
      slug: '087-demo',
      path: '.osc/plans/active/087-demo.md',
      acceptanceCriteria: ['Loop state is created.', 'Frontier promotion is explicit.'],
    },
    artifacts: {
      evidence: ['docs/evidence/proof.md'],
      manifest: `.osc/runs/${runId}/run.json`,
    },
  }, null, 2));
  writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof');
  return runPath;
}

function writeEvaluation(root: string, runId = 'demo-run', statuses: Record<string, 'pass' | 'partial' | 'fail' | 'blocked' | 'not_evaluated'> = {}) {
  const evalPath = join(root, `docs/evidence/${runId}-evaluation.json`);
  const criteria = [
    { id: 'AC1', text: 'Loop state is created.', status: statuses.AC1 ?? 'pass' },
    { id: 'AC2', text: 'Frontier promotion is explicit.', status: statuses.AC2 ?? 'pass' },
  ];
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: `eval-${runId}`,
    subject: { source: 'run', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo', task_id: 'task-123', run_id: runId, run_packet: `.osc/runs/${runId}/run.json` },
    acceptance_criteria: criteria.map((criterion) => ({
      id: criterion.id,
      text: criterion.text,
      status: criterion.status,
      evaluator: { kind: 'human', name: 'reviewer', ref: null },
      evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Synthetic test evidence.' }],
      rationale: `${criterion.id} ${criterion.status}`,
    })),
    decision: { status: 'approved', approver: 'human', rationale: 'Evidence reviewed.' },
    improvement: { route: 'close', target: null, carried_forward: [], do_not_assume: ['No model benchmark claim.'] },
  }, null, 2));
  return evalPath;
}

function writeDispatchReceipt(root: string, runId = 'demo-run') {
  const runDir = join(root, `.osc/runs/${runId}`);
  mkdirSync(runDir, { recursive: true });
  const receiptPath = join(runDir, 'dispatch-receipt.json');
  const evidencePath = join(runDir, 'runtime-omx-evidence.md');
  const logPath = join(runDir, 'runtime-omx.log');
  writeFileSync(receiptPath, JSON.stringify({
    schema_version: 'open-scaffold.dispatch-receipt.v1',
    receipt_id: `runtime-omx:no-spawn-preview:${runId}`,
    run_id: runId,
    adapter_id: 'runtime-omx',
    runtime_backend: 'omx',
    artifacts: [`.osc/runs/${runId}/runtime-omx-evidence.md`, `.osc/runs/${runId}/runtime-omx.log`],
    status: 'dry_run',
  }, null, 2));
  writeFileSync(evidencePath, 'runtime omx evidence');
  writeFileSync(logPath, 'runtime omx log');
  return { receiptPath, evidencePath, logPath };
}

function writePlateauEvaluation(root: string, runId: string, ac2Status: 'pass' | 'fail' = 'fail') {
  const evalPath = join(root, `docs/evidence/${runId}-evaluation.json`);
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: `eval-${runId}`,
    subject: {
      source: 'run',
      plan: '.osc/plans/active/087-demo.md',
      plan_slug: '087-demo',
      task_id: 'task-123',
      run_id: runId,
      run_packet: `.osc/runs/${runId}/run.json`,
    },
    acceptance_criteria: [
      {
        id: 'AC1',
        text: 'Deterministic driver output is produced.',
        status: 'pass',
        evaluator: { kind: 'automated-check', name: 'synthetic-scorer', ref: 'docs/evidence/scorer.md' },
        evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Determinism probe passed.' }],
        rationale: 'Stable deterministic output.',
      },
      {
        id: 'AC2',
        text: 'Frontier promotion improves one reachable criterion.',
        status: ac2Status,
        evaluator: { kind: 'automated-check', name: 'synthetic-scorer', ref: 'docs/evidence/scorer.md' },
        evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: ac2Status === 'pass' ? 'Reachable criterion passed.' : 'Reachable criterion still failed.' }],
        rationale: ac2Status === 'pass' ? 'Fixed by the second attempt.' : 'Not fixed yet.',
      },
      {
        id: 'AC28',
        text: 'Renderer probe returns a playable visual artifact.',
        status: 'fail',
        evaluator: { kind: 'domain-tool', name: 'synthetic-2000m-scorer', ref: 'docs/evidence/scorer.md' },
        evidence: [{ kind: 'path', ref: 'docs/evidence/scorer.md', summary: 'Probe-only criterion is hardcoded pass=false for headless JSON drivers.' }],
        rationale: 'The scorer marks this criterion probe-only and impossible for the current artifact type.',
        analysis: {
          score_sensitivity: 'none',
          impossible: true,
          reason: 'probe_only',
          source: 'docs/evidence/scorer.md#AC28',
        },
      },
    ],
    decision: { status: 'rejected', approver: 'human', rationale: 'Score frontier is not acceptance approval.' },
    improvement: { route: 'create_next_slice', target: null, carried_forward: ['AC28 requires benchmark redesign.'], do_not_assume: ['No raw benchmark win.'] },
  }, null, 2));
  return evalPath;
}

function writePlateauLoop() {
  const root = tempRepo();
  const planPath = writePlan(root);
  const outDir = join(root, '.osc/evolution/plateau-loop');
  writeFileSync(join(root, 'docs/evidence/scorer.md'), 'Synthetic scorer metadata: AC28 is probe-only/pass-false for headless JSON drivers.');
  writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-31T08:00:00.000Z'), strategy: 'greedy' });
  const attempts = [
    { runId: 'attempt-a', score: 0.9, ac2Status: 'fail' as const, decision: 'promote' as const, rationale: 'First score frontier.' },
    { runId: 'attempt-b', score: 0.944893, ac2Status: 'pass' as const, decision: 'promote' as const, rationale: 'Improved reachable AC2 but AC28 remains scorer-blocked.' },
    { runId: 'attempt-c', score: 0.944893, ac2Status: 'pass' as const, decision: 'retry' as const, rationale: 'Retry plateaued at the same score.' },
    { runId: 'attempt-d', score: 0.944893, ac2Status: 'pass' as const, decision: 'retry' as const, rationale: 'Another retry plateaued; remaining failure is probe-only.' },
  ];
  for (const [index, attempt] of attempts.entries()) {
    const runPath = writeRunPacket(root, attempt.runId);
    const evalPath = writePlateauEvaluation(root, attempt.runId, attempt.ac2Status);
    recordEvolutionAttempt(outDir, {
      runPath,
      evaluationPath: evalPath,
      decision: attempt.decision,
      score: attempt.score,
      rationale: attempt.rationale,
      now: new Date(`2026-05-31T08:${String(10 + index).padStart(2, '0')}:00.000Z`),
    }, root);
  }
  return { root, outDir };
}

function writeStaleBlockerEvaluation(root: string, runId: string, hasBlocker: boolean, omitAc28 = false) {
  const evalPath = join(root, `docs/evidence/${runId}-stale-blocker-evaluation.json`);
  const ac28: Record<string, unknown> = {
    id: 'AC28',
    text: 'Renderer evidence is evaluated against the current scorer contract.',
    status: 'fail',
    evaluator: { kind: 'automated-check', name: 'synthetic-scorer', ref: 'docs/evidence/proof.md' },
    evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Current scorer still reports a reachable failure.' }],
    rationale: 'Current attempt still fails, but current scorer metadata now treats the criterion as reachable.',
  };
  if (hasBlocker) {
    ac28.analysis = {
      score_sensitivity: 'none',
      impossible: true,
      reason: 'probe_only',
      source: 'docs/evidence/scorer.md#old-AC28',
    };
    ac28.rationale = 'Old scorer metadata marked this criterion probe-only.';
  }
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: `eval-${runId}`,
    subject: { source: 'run', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo', task_id: 'task-123', run_id: runId, run_packet: `.osc/runs/${runId}/run.json` },
    acceptance_criteria: [
      {
        id: 'AC1',
        text: 'Loop state is created.',
        status: 'pass',
        evaluator: { kind: 'human', name: 'reviewer', ref: 'docs/evidence/proof.md' },
        evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Synthetic evidence.' }],
        rationale: 'Loop state exists.',
      },
      ...(omitAc28 ? [] : [ac28]),
    ],
    decision: { status: 'rejected', approver: 'human', rationale: 'Current scorer still reports a reachable failure.' },
    improvement: { route: 'retry_run', target: null, carried_forward: ['AC28 still needs implementation work.'], do_not_assume: ['No raw benchmark win.'] },
  }, null, 2));
  return evalPath;
}

function writeStaleBlockerLoop() {
  const root = tempRepo();
  const planPath = writePlan(root);
  const outDir = join(root, '.osc/evolution/stale-blocker-loop');
  writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-31T10:00:00.000Z'), strategy: 'greedy' });
  const attempts = [
    { runId: 'attempt-a', blocker: true, omitAc28: false, decision: 'promote' as const },
    { runId: 'attempt-b', blocker: false, omitAc28: false, decision: 'retry' as const },
    { runId: 'attempt-c', blocker: false, omitAc28: false, decision: 'retry' as const },
  ];
  for (const [index, attempt] of attempts.entries()) {
    const runPath = writeRunPacket(root, attempt.runId);
    const evalPath = writeStaleBlockerEvaluation(root, attempt.runId, attempt.blocker, attempt.omitAc28);
    recordEvolutionAttempt(outDir, {
      runPath,
      evaluationPath: evalPath,
      decision: attempt.decision,
      score: 0.7,
      rationale: index === 0 ? 'Initial frontier with old scorer metadata.' : 'Retry plateaued after scorer metadata changed.',
      now: new Date(`2026-05-31T10:${String(10 + index).padStart(2, '0')}:00.000Z`),
    }, root);
  }
  return { root, outDir };
}

function writeMissingCurrentBlockerLoop() {
  const root = tempRepo();
  const planPath = writePlan(root);
  const outDir = join(root, '.osc/evolution/missing-current-blocker-loop');
  writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-31T11:00:00.000Z'), strategy: 'greedy' });
  const attempts = [
    { runId: 'attempt-a', blocker: true, omitAc28: false, decision: 'promote' as const },
    { runId: 'attempt-b', blocker: false, omitAc28: true, decision: 'retry' as const },
    { runId: 'attempt-c', blocker: false, omitAc28: true, decision: 'retry' as const },
  ];
  for (const [index, attempt] of attempts.entries()) {
    const runPath = writeRunPacket(root, attempt.runId);
    const evalPath = writeStaleBlockerEvaluation(root, attempt.runId, attempt.blocker, attempt.omitAc28);
    recordEvolutionAttempt(outDir, {
      runPath,
      evaluationPath: evalPath,
      decision: attempt.decision,
      score: 0.7,
      rationale: index === 0 ? 'Initial frontier with old scorer metadata.' : 'Retry plateaued after current scorer omitted AC28.',
      now: new Date(`2026-05-31T11:${String(10 + index).padStart(2, '0')}:00.000Z`),
    }, root);
  }
  return { root, outDir };
}

function writeOrdinaryFailureEvaluation(root: string, runId: string, privateRefs = false) {
  const evalPath = join(root, `docs/evidence/${runId}-ordinary-evaluation.json`);
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: `eval-${runId}`,
    subject: { source: 'run', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo', task_id: 'task-123', run_id: runId, run_packet: `.osc/runs/${runId}/run.json` },
    acceptance_criteria: [
      {
        id: 'AC1',
        text: 'Loop state is created.',
        status: 'pass',
        evaluator: { kind: 'human', name: 'reviewer', ref: 'docs/evidence/proof.md' },
        evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Synthetic evidence.' }],
        rationale: 'Loop state exists.',
      },
      {
        id: 'AC2',
        text: 'Skipped rows are listed in the report while tests cover the remaining reachable behavior.',
        status: 'fail',
        source: privateRefs ? 'docs/../../.osc-dev/notes.md' : undefined,
        evaluator: { kind: 'human', name: 'reviewer', ref: privateRefs ? '/private/scorer.md' : 'docs/evidence/proof.md' },
        evidence: [{ kind: 'path', ref: privateRefs ? '.osc/research/private-scorer.md' : 'docs/evidence/proof.md', summary: 'Reachable work remains incomplete.' }],
        rationale: 'Missing tests for a reachable behavior; another implementation or scorer inspection can still help.',
        analysis: {
          reason: 'missing_tests',
          source: privateRefs ? 'file:///private/scorer.md' : 'docs/evidence/proof.md',
          evidence_source: privateRefs ? '../raw-scorer.log' : undefined,
        },
      },
    ],
    decision: { status: 'rejected', approver: 'human', rationale: 'Reachable behavior remains incomplete.' },
    improvement: { route: 'retry_run', target: null, carried_forward: ['AC2 needs tests.'], do_not_assume: ['No model benchmark claim.'] },
  }, null, 2));
  return evalPath;
}

function writeOrdinaryFailureLoop(privateRefs = false) {
  const root = tempRepo();
  const planPath = writePlan(root);
  const outDir = join(root, '.osc/evolution/ordinary-failure-loop');
  writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-31T09:00:00.000Z'), strategy: 'greedy' });
  for (const [index, runId] of ['attempt-a', 'attempt-b', 'attempt-c'].entries()) {
    const runPath = writeRunPacket(root, runId);
    const evalPath = writeOrdinaryFailureEvaluation(root, runId, privateRefs);
    recordEvolutionAttempt(outDir, {
      runPath,
      evaluationPath: evalPath,
      decision: index === 0 ? 'promote' : 'retry',
      score: 0.7,
      rationale: index === 0 ? 'Initial score frontier.' : 'Retry did not move score, but remaining failure is reachable.',
      now: new Date(`2026-05-31T09:${String(10 + index).padStart(2, '0')}:00.000Z`),
    }, root);
  }
  return { root, outDir };
}

describe('checked-in evolution ledger demo fixture', () => {
  it('validates without warnings and keeps boundary claims off', () => {
    const result = validateEvolutionLoopDir(evolutionDemoLoop, evolutionDemoRoot);
    const attempts = readFileSync(join(evolutionDemoLoop, 'attempts.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { decision?: string; attempt_id?: string });

    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(attempts.map((attempt) => attempt.attempt_id)).toEqual(['attempt-a', 'attempt-b-prompt-rewrite', 'attempt-c']);
    expect(attempts.map((attempt) => attempt.decision)).toContain('reject');
  });

  it('compares previous frontier to current frontier with a fail-to-pass acceptance-criteria delta', () => {
    const comparison = compareEvolutionLoop(evolutionDemoLoop, {}, evolutionDemoRoot);

    expect(comparison.kind).toBe('comparison');
    if (comparison.kind !== 'comparison') throw new Error('expected comparison');
    expect(comparison.loop).toMatchObject({ loopDir: 'reviewable-csv-importer', strategy: 'manual', attemptCount: 3 });
    expect(comparison.a.attemptId).toBe('attempt-a');
    expect(comparison.b.attemptId).toBe('attempt-c');
    expect(comparison.scoreDelta).toBeCloseTo(0.32);
    expect(comparison.boundaryDifferences).toEqual([]);
    expect(comparison.a.boundary).toMatchObject({
      runtime_spawning: false,
      model_benchmarking: false,
      compliance_certification: false,
      approval_or_release_decision: false,
      external_anchoring: false,
    });
    expect(comparison.b.boundary).toMatchObject({
      runtime_spawning: false,
      model_benchmarking: false,
      compliance_certification: false,
      approval_or_release_decision: false,
      external_anchoring: false,
    });
    expect(comparison.frontierHistory.map((item: { attemptId: string }) => item.attemptId)).toEqual(['attempt-a', 'attempt-c']);

    const ac2 = comparison.acceptanceCriteria.rows.find((row: { id: string }) => row.id === 'AC2');
    expect(ac2).toMatchObject({
      text: 'Malformed rows return an error that identifies the row and column of the offending token.',
      aStatus: 'fail',
      bStatus: 'pass',
    });
    const ac1 = comparison.acceptanceCriteria.rows.find((row: { id: string }) => row.id === 'AC1');
    expect(ac1).toMatchObject({ aStatus: 'pass', bStatus: 'pass' });
  });
});

describe('evolution loop rendering', () => {
  it('renders contract-first loop files from a plan without runtime spawning claims', () => {
    const root = tempRepo();
    const planPath = writePlan(root);

    const files = renderEvolutionLoopFiles(loadEvolutionSource(planPath, root), {
      now: new Date('2026-05-21T08:00:00.000Z'),
      strategy: 'greedy',
    });
    const loop = JSON.parse(files.loopJson);
    const frontier = JSON.parse(files.frontierJson);

    expect(loop.schema).toBe(EVOLUTION_LOOP_SCHEMA);
    expect(loop.loop_id).toBe('20260521T080000Z-087-demo-evolution');
    expect(loop.subject).toMatchObject({ source: 'plan', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo' });
    expect(loop.strategy).toMatchObject({ name: 'greedy', executes_in_core: false });
    expect(loop.scorer).toMatchObject({ kind: 'human', approval_authority: false });
    expect(loop.boundary).toMatchObject({ runtime_spawning: false, model_benchmarking: false, compliance_certification: false, approval_or_release_decision: false });
    expect(loop.notes.join('\n')).toContain('does not spawn runtimes');
    expect(files.attemptsJsonl).toBe('');
    expect(frontier.schema).toBe('open-scaffold.evolution-frontier.v1');
    expect(frontier.current).toBeNull();
  });

  it('writes loop.json, attempts.jsonl, and frontier.json into the selected loop directory', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const outDir = join(root, '.osc/evolution/demo-loop');

    const result = writeEvolutionLoop(planPath, outDir, root, {
      now: new Date('2026-05-21T08:00:00.000Z'),
      strategy: 'manual',
    });

    expect(result.loopDir).toBe(outDir);
    expect(existsSync(join(outDir, 'loop.json'))).toBe(true);
    expect(existsSync(join(outDir, 'attempts.jsonl'))).toBe(true);
    expect(existsSync(join(outDir, 'frontier.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(outDir, 'loop.json'), 'utf8')).strategy.name).toBe('manual');
  });
});

describe('evolution attempt recording and validation', () => {
  it('records a promoted run attempt and updates frontier explicitly', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root);
    const evalPath = writeEvaluation(root);
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });

    const result = recordEvolutionAttempt(outDir, {
      runPath,
      evaluationPath: evalPath,
      decision: 'promote',
      score: 0.92,
      rationale: 'Best evidence so far.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);

    const attempts = readFileSync(join(outDir, 'attempts.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const frontier = JSON.parse(readFileSync(join(outDir, 'frontier.json'), 'utf8'));

    expect(result.attempt.attempt_id).toBe('demo-run');
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ run_id: 'demo-run', evaluation_id: 'eval-demo-run', decision: 'promote', score: 0.92 });
    expect(frontier.current).toMatchObject({ attempt_id: 'demo-run', run_id: 'demo-run', score: 0.92, rationale: 'Best evidence so far.' });
    expect(frontier.boundary).toMatchObject({ approval_or_release_decision: false, model_benchmarking: false });
  });

  it('validates frontier before appending a promoted attempt', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root);
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });
    const validFrontier = readFileSync(join(outDir, 'frontier.json'), 'utf8');
    writeFileSync(join(outDir, 'frontier.json'), '{not json');

    expect(() => recordEvolutionAttempt(outDir, {
      runPath,
      decision: 'promote',
      rationale: 'Best evidence so far.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root)).toThrow(/Invalid evolution frontier/);
    expect(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')).toBe('');

    writeFileSync(join(outDir, 'frontier.json'), validFrontier);
    const result = recordEvolutionAttempt(outDir, {
      runPath,
      decision: 'promote',
      rationale: 'Best evidence so far.',
      now: new Date('2026-05-21T08:11:00.000Z'),
    }, root);
    expect(result.frontierUpdated).toBe(true);
    expect(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('rejects evaluation envelopes from a different run before appending attempt state', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root, 'demo-run');
    const evalPath = writeEvaluation(root, 'other-run');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });

    expect(() => recordEvolutionAttempt(outDir, {
      runPath,
      evaluationPath: evalPath,
      decision: 'promote',
      rationale: 'Mismatched evidence should not persist.',
    }, root)).toThrow(/Evaluation run_id other-run does not match run packet demo-run/);
    expect(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')).toBe('');
    const frontier = JSON.parse(readFileSync(join(outDir, 'frontier.json'), 'utf8'));
    expect(frontier.current).toBeNull();
  });

  it('records adapter receipt and evidence refs on attempts and promoted frontier', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root, 'demo-run');
    const evalPath = writeEvaluation(root, 'demo-run');
    const { receiptPath, evidencePath, logPath } = writeDispatchReceipt(root, 'demo-run');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });

    const options = {
      runPath,
      evaluationPath: evalPath,
      receiptPaths: [receiptPath],
      evidencePaths: [evidencePath, logPath],
      decision: 'promote' as const,
      score: 0.88,
      rationale: 'Runtime OMX preview is the best attempt so far.',
      now: new Date('2026-05-21T08:12:00.000Z'),
    };
    const result = recordEvolutionAttempt(outDir, options, root);

    const attempts = readFileSync(join(outDir, 'attempts.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const frontier = JSON.parse(readFileSync(join(outDir, 'frontier.json'), 'utf8'));

    expect(result.attempt.adapter_receipts).toEqual(['.osc/runs/demo-run/dispatch-receipt.json']);
    expect(attempts[0].evidence_refs).toEqual(expect.arrayContaining([
      'docs/evidence/proof.md',
      'docs/evidence/demo-run-evaluation.json',
      '.osc/runs/demo-run/dispatch-receipt.json',
      '.osc/runs/demo-run/runtime-omx-evidence.md',
      '.osc/runs/demo-run/runtime-omx.log',
    ]));
    expect(frontier.current.evidence_refs).toEqual(expect.arrayContaining([
      '.osc/runs/demo-run/dispatch-receipt.json',
      '.osc/runs/demo-run/runtime-omx-evidence.md',
      '.osc/runs/demo-run/runtime-omx.log',
    ]));
  });

  it('rejects mismatched adapter receipt run ids before appending attempt state', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root, 'demo-run');
    const { receiptPath } = writeDispatchReceipt(root, 'other-run');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });

    const options = {
      runPath,
      receiptPaths: [receiptPath],
      decision: 'retry' as const,
      rationale: 'Mismatched adapter receipt should not persist.',
    };
    expect(() => recordEvolutionAttempt(outDir, options, root)).toThrow(/Dispatch receipt run_id other-run does not match run packet demo-run/);
    expect(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')).toBe('');
    const frontier = JSON.parse(readFileSync(join(outDir, 'frontier.json'), 'utf8'));
    expect(frontier.current).toBeNull();
  });

  it('rejects private adapter evidence refs before appending attempt state', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root, 'demo-run');
    const outDir = join(root, '.osc/evolution/demo-loop');
    mkdirSync(join(root, '.osc/research'), { recursive: true });
    const privateRef = join(root, '.osc/research/private-runtime-log.md');
    writeFileSync(privateRef, 'private runtime log');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });

    const options = {
      runPath,
      evidencePaths: [privateRef],
      decision: 'retry' as const,
      rationale: 'Private adapter refs should not persist.',
    };
    expect(() => recordEvolutionAttempt(outDir, options, root)).toThrow(/private\/internal workspace state/);
    expect(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')).toBe('');
  });

  it('validates a loop directory and rejects duplicate attempts plus unsafe boundary claims', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root);
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });
    recordEvolutionAttempt(outDir, { runPath, decision: 'reject', rationale: 'Not good enough.', now: new Date('2026-05-21T08:10:00.000Z') }, root);
    writeFileSync(join(outDir, 'attempts.jsonl'), readFileSync(join(outDir, 'attempts.jsonl'), 'utf8') + readFileSync(join(outDir, 'attempts.jsonl'), 'utf8'));
    const loop = JSON.parse(readFileSync(join(outDir, 'loop.json'), 'utf8'));
    loop.boundary.runtime_spawning = true;
    loop.source_refs.push('.osc/research/private.md');
    writeFileSync(join(outDir, 'loop.json'), JSON.stringify(loop, null, 2));

    const result = validateEvolutionLoopDir(outDir, root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evolution.boundary.unsupported_true');
    expect(result.failures.map((failure) => failure.code)).toContain('evolution.source_ref.private_path');
    expect(result.failures.map((failure) => failure.code)).toContain('evolution.attempt.duplicate_id');
  });
});

describe('evolution analysis', () => {
  it('reports plateau, impossible probe-only criteria, AC deltas, sensitivity, and redesign recommendation without mutating loop state', () => {
    const { root, outDir } = writePlateauLoop();
    const before = {
      loop: readFileSync(join(outDir, 'loop.json'), 'utf8'),
      attempts: readFileSync(join(outDir, 'attempts.jsonl'), 'utf8'),
      frontier: readFileSync(join(outDir, 'frontier.json'), 'utf8'),
      evaluation: readFileSync(join(root, 'docs/evidence/attempt-d-evaluation.json'), 'utf8'),
    };

    const analysis = analyzeEvolutionLoop(outDir, {}, root);

    expect(analysis.loop).toMatchObject({ loopDir: 'plateau-loop', attemptCount: 4 });
    expect(analysis.plateau).toMatchObject({ status: 'plateau', noImprovementCount: 2, currentScore: 0.944893 });
    expect(analysis.acceptanceSummary).toMatchObject({ currentPass: 2, currentTotal: 3, frontierPass: 2, frontierTotal: 3 });
    expect(analysis.currentVsPrevious.rows.find((row) => row.id === 'AC28')).toMatchObject({ previousStatus: 'fail', currentStatus: 'fail' });
    expect(analysis.currentVsFrontier.rows.find((row) => row.id === 'AC2')).toMatchObject({ frontierStatus: 'pass', currentStatus: 'pass' });
    const ac2 = analysis.criteria.find((criterion) => criterion.id === 'AC2');
    expect(ac2).toMatchObject({ currentStatus: 'pass', sensitivity: 'observed_positive' });
    const ac28 = analysis.criteria.find((criterion) => criterion.id === 'AC28');
    expect(ac28).toMatchObject({
      currentStatus: 'fail',
      sensitivity: 'none',
      impossible: true,
      evidence: expect.arrayContaining(['docs/evidence/scorer.md#AC28']),
      reasons: expect.arrayContaining(['probe_only']),
    });
    expect(analysis.recommendation).toMatchObject({ action: 'redesign' });
    expect(analysis.recommendation.summary).toContain('remaining failing criteria');
    expect(analysis.notes.join('\n')).toContain('Score-frontier promotion is not acceptance approval');

    const terminal = renderEvolutionAnalysis(analysis, 'terminal');
    expect(terminal).toContain('Plateau: plateau — 2 attempt(s) since last score improvement');
    expect(terminal).toContain('AC28: fail | sensitivity=none | impossible=probe_only');
    expect(terminal).toContain('Recommendation: redesign');

    const markdown = renderEvolutionAnalysis(analysis, 'markdown');
    expect(markdown).toContain('# Evolution analysis: plateau-loop');
    expect(markdown).toContain('## Current vs frontier AC delta');
    expect(markdown).toContain('| AC28 — Renderer probe returns a playable visual artifact. | ✗ fail | ✗ fail |');
    expect(markdown).toContain('## Recommendation');
    expect(markdown).toContain('`redesign`');

    const json = JSON.parse(renderEvolutionAnalysis(analysis, 'json'));
    expect(json.recommendation.action).toBe('redesign');
    expect(json.criteria.find((criterion: { id: string }) => criterion.id === 'AC28').impossible).toBe(true);

    expect(readFileSync(join(outDir, 'loop.json'), 'utf8')).toBe(before.loop);
    expect(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')).toBe(before.attempts);
    expect(readFileSync(join(outDir, 'frontier.json'), 'utf8')).toBe(before.frontier);
    expect(readFileSync(join(root, 'docs/evidence/attempt-d-evaluation.json'), 'utf8')).toBe(before.evaluation);
  });

  it('uses current-attempt blocker metadata for recommendation instead of stale frontier metadata', () => {
    const { outDir, root } = writeStaleBlockerLoop();

    const analysis = analyzeEvolutionLoop(outDir, {}, root);
    const ac28 = analysis.criteria.find((criterion) => criterion.id === 'AC28');

    expect(analysis.plateau.status).toBe('plateau');
    expect(ac28).toMatchObject({
      currentStatus: 'fail',
      frontierStatus: 'fail',
      sensitivity: 'unknown',
      impossible: false,
    });
    expect(ac28?.reasons).not.toContain('probe_only');
    expect(analysis.recommendation.action).toBe('inspect_scorer');
  });

  it('treats missing current criterion metadata as scorer-inspection instead of stale blocker evidence', () => {
    const { outDir, root } = writeMissingCurrentBlockerLoop();

    const analysis = analyzeEvolutionLoop(outDir, {}, root);
    const ac28 = analysis.criteria.find((criterion) => criterion.id === 'AC28');

    expect(analysis.acceptanceSummary).toMatchObject({ currentPass: 1, currentTotal: 1 });
    expect(ac28).toMatchObject({
      currentStatus: null,
      frontierStatus: 'fail',
      sensitivity: 'unknown',
      impossible: false,
      reasons: [],
      evidence: [],
    });
    expect(analysis.recommendation).toMatchObject({
      action: 'inspect_scorer',
      reasons: expect.arrayContaining(['missing_current_acceptance_criteria']),
    });
  });

  it('does not classify ordinary reachable failure reasons as impossible redesign-only blockers', () => {
    const { outDir, root } = writeOrdinaryFailureLoop();

    const analysis = analyzeEvolutionLoop(outDir, {}, root);
    const ac2 = analysis.criteria.find((criterion) => criterion.id === 'AC2');

    expect(analysis.plateau.status).toBe('plateau');
    expect(ac2).toMatchObject({
      currentStatus: 'fail',
      sensitivity: 'unknown',
      impossible: false,
      reasons: expect.arrayContaining(['missing_tests']),
    });
    expect(ac2?.reasons).not.toContain('skipped');
    expect(analysis.recommendation.action).toBe('inspect_scorer');
    expect(analysis.recommendation.summary).toContain('Scores have stopped improving');
  });

  it('suppresses private or internal criterion evidence refs from analysis reports', () => {
    const { outDir, root } = writeOrdinaryFailureLoop(true);

    const analysis = analyzeEvolutionLoop(outDir, {}, root);
    const ac2 = analysis.criteria.find((criterion) => criterion.id === 'AC2');
    const terminal = renderEvolutionAnalysis(analysis, 'terminal');
    const markdown = renderEvolutionAnalysis(analysis, 'markdown');

    expect(ac2?.evidence).toEqual([]);
    expect(terminal).not.toContain('/private/scorer.md');
    expect(terminal).not.toContain('file:///private/scorer.md');
    expect(terminal).not.toContain('.osc/research/private-scorer.md');
    expect(terminal).not.toContain('../raw-scorer.log');
    expect(terminal).not.toContain('docs/../../.osc-dev/notes.md');
    expect(markdown).not.toContain('/private/scorer.md');
    expect(markdown).not.toContain('file:///private/scorer.md');
    expect(markdown).not.toContain('.osc/research/private-scorer.md');
    expect(markdown).not.toContain('../raw-scorer.log');
    expect(markdown).not.toContain('docs/../../.osc-dev/notes.md');
  });
});

describe('evolution comparison rendering', () => {
  it('compares the previous frontier attempt against the current frontier by default', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const evalB = writeEvaluation(root, 'attempt-b');
    const evidenceB = join(root, 'docs/evidence/attempt-b-extra.md');
    writeFileSync(evidenceB, 'attempt b extra proof');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z'), strategy: 'greedy' });
    recordEvolutionAttempt(outDir, {
      runPath: runA,
      decision: 'promote',
      score: 0.62,
      rationale: 'Handled easy cases but failed BOM input.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: runB,
      evaluationPath: evalB,
      evidencePaths: [evidenceB],
      decision: 'promote',
      score: 0.94,
      rationale: 'Handled BOM input and all edge cases.',
      now: new Date('2026-05-21T08:20:00.000Z'),
    }, root);

    const comparison = compareEvolutionLoop(outDir, {}, root);

    expect(comparison.kind).toBe('comparison');
    if (comparison.kind !== 'comparison') throw new Error('expected comparison');
    expect(comparison.a.attemptId).toBe('attempt-a');
    expect(comparison.b.attemptId).toBe('attempt-b');
    expect(comparison.loop.strategy).toBe('greedy');
    expect(comparison.scoreDelta).toBeCloseTo(0.32);
    expect(comparison.evidence.onlyInB).toContain('docs/evidence/attempt-b-extra.md');
    expect(comparison.evaluation.b.present).toBe(true);
    expect(comparison.frontierHistory.map((item) => item.attemptId)).toEqual(['attempt-a', 'attempt-b']);

    const terminal = renderEvolutionComparison(comparison, 'terminal');
    expect(terminal).toContain('Evolution Loop: demo-loop');
    expect(terminal).toContain('A -> attempt-a');
    expect(terminal).toContain('B -> attempt-b');
    expect(terminal).toContain('+0.32');
    expect(terminal).toContain('Only in B');
    expect(terminal).toContain('Frontier history');

    const markdown = renderEvolutionComparison(comparison, 'markdown');
    expect(markdown).toContain('# Evolution loop: demo-loop — A vs B');
    expect(markdown).toContain('| Score | 0.62 | 0.94 | +0.32 ▲ |');
    expect(markdown).toContain('**B (promote):** Handled BOM input and all edge cases.');

    const json = JSON.parse(renderEvolutionComparison(comparison, 'json'));
    expect(json.a.attemptId).toBe('attempt-a');
    expect(json.b.attemptId).toBe('attempt-b');
  });

  it('renders acceptance criteria deltas from linked evaluation envelopes', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const evalA = writeEvaluation(root, 'attempt-a', { AC2: 'fail' });
    const evalB = writeEvaluation(root, 'attempt-b', { AC2: 'pass' });
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z'), strategy: 'greedy' });
    recordEvolutionAttempt(outDir, {
      runPath: runA,
      evaluationPath: evalA,
      decision: 'promote',
      score: 0.62,
      rationale: 'First frontier still failed AC2.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: runB,
      evaluationPath: evalB,
      decision: 'promote',
      score: 0.94,
      rationale: 'Second frontier passes AC2.',
      now: new Date('2026-05-21T08:20:00.000Z'),
    }, root);

    const comparison = compareEvolutionLoop(outDir, {}, root);
    const markdown = renderEvolutionComparison(comparison, 'markdown');
    const terminal = renderEvolutionComparison(comparison, 'terminal');

    expect(markdown).toContain('## Acceptance criteria delta');
    expect(markdown).toContain('| AC1 — Loop state is created. | ✓ pass | ✓ pass |');
    expect(markdown).toContain('| AC2 — Frontier promotion is explicit. | ✗ fail | ✓ pass ▲ |');
    expect(terminal).toContain('Acceptance criteria delta');
    expect(terminal).toContain('AC2: A=fail | B=pass ▲ — Frontier promotion is explicit.');
  });

  it('resolves compare evaluation refs from the loop scaffold root instead of caller cwd', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const evalA = writeEvaluation(root, 'attempt-a', { AC2: 'fail' });
    const evalB = writeEvaluation(root, 'attempt-b', { AC2: 'pass' });
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z'), strategy: 'greedy' });
    recordEvolutionAttempt(outDir, {
      runPath: runA,
      evaluationPath: evalA,
      decision: 'promote',
      score: 0.62,
      rationale: 'First frontier still failed AC2.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: runB,
      evaluationPath: evalB,
      decision: 'promote',
      score: 0.94,
      rationale: 'Second frontier passes AC2.',
      now: new Date('2026-05-21T08:20:00.000Z'),
    }, root);

    const comparison = compareEvolutionLoop(outDir);
    const markdown = renderEvolutionComparison(comparison, 'markdown');

    expect(markdown).toContain('| AC2 — Frontier promotion is explicit. | ✗ fail | ✓ pass ▲ |');
  });

  it('uses the loop .osc parent as compare root for partial historical scaffolds', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const evalA = writeEvaluation(root, 'attempt-a', { AC2: 'fail' });
    const evalB = writeEvaluation(root, 'attempt-b', { AC2: 'pass' });
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z'), strategy: 'greedy' });
    recordEvolutionAttempt(outDir, {
      runPath: runA,
      evaluationPath: evalA,
      decision: 'promote',
      score: 0.62,
      rationale: 'First frontier still failed AC2.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: runB,
      evaluationPath: evalB,
      decision: 'promote',
      score: 0.94,
      rationale: 'Second frontier passes AC2.',
      now: new Date('2026-05-21T08:20:00.000Z'),
    }, root);
    rmSync(join(root, '.osc/releases'), { recursive: true, force: true });

    const comparison = compareEvolutionLoop(outDir);
    const markdown = renderEvolutionComparison(comparison, 'markdown');

    expect(markdown).toContain('| AC2 — Frontier promotion is explicit. | ✗ fail | ✓ pass ▲ |');
  });

  it('does not reinterpret Windows absolute evaluation refs as repo-relative paths on POSIX', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const evalB = writeEvaluation(root, 'attempt-b', { AC2: 'pass' });
    const windowsRef = 'C:\\tmp\\attempt-b-evaluation.json';
    writeFileSync(join(root, windowsRef), readFileSync(evalB, 'utf8'));
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z'), strategy: 'greedy' });
    recordEvolutionAttempt(outDir, {
      runPath: runA,
      decision: 'promote',
      score: 0.62,
      rationale: 'First frontier had no evaluation envelope.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: runB,
      decision: 'promote',
      score: 0.94,
      rationale: 'Second frontier records a Windows absolute evaluation ref.',
      now: new Date('2026-05-21T08:20:00.000Z'),
    }, root);
    const attemptsPath = join(outDir, 'attempts.jsonl');
    const attempts = readFileSync(attemptsPath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    attempts[1].evaluation = windowsRef;
    attempts[1].evaluation_id = 'eval-attempt-b';
    writeFileSync(attemptsPath, `${attempts.map((attempt) => JSON.stringify(attempt)).join('\n')}\n`);

    const comparison = compareEvolutionLoop(outDir, {}, root);
    const markdown = renderEvolutionComparison(comparison, 'markdown');

    expect(markdown).not.toContain('AC2 — Frontier promotion is explicit. | — | ✓ pass ▲');
  });

  it('shows known acceptance criteria when only one side has an evaluation envelope', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const evalB = writeEvaluation(root, 'attempt-b', { AC1: 'pass', AC2: 'pass' });
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z'), strategy: 'greedy' });
    recordEvolutionAttempt(outDir, {
      runPath: runA,
      decision: 'promote',
      score: 0.62,
      rationale: 'First frontier had no evaluation envelope.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: runB,
      evaluationPath: evalB,
      decision: 'promote',
      score: 0.94,
      rationale: 'Second frontier added evaluation coverage.',
      now: new Date('2026-05-21T08:20:00.000Z'),
    }, root);

    const comparison = compareEvolutionLoop(outDir, {}, root);
    const markdown = renderEvolutionComparison(comparison, 'markdown');

    expect(markdown).toContain('## Acceptance criteria delta');
    expect(markdown).toContain('| AC1 — Loop state is created. | — | ✓ pass ▲ |');
    expect(markdown).toContain('| AC2 — Frontier promotion is explicit. | — | ✓ pass ▲ |');
  });

  it('ignores missing evaluation envelopes while keeping comparison output available', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const evalA = writeEvaluation(root, 'attempt-a', { AC2: 'fail' });
    const evalB = writeEvaluation(root, 'attempt-b', { AC2: 'pass' });
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z'), strategy: 'greedy' });
    recordEvolutionAttempt(outDir, {
      runPath: runA,
      evaluationPath: evalA,
      decision: 'promote',
      score: 0.62,
      rationale: 'First frontier pointed at evaluation evidence that was later moved.',
      now: new Date('2026-05-21T08:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: runB,
      evaluationPath: evalB,
      decision: 'promote',
      score: 0.94,
      rationale: 'Second frontier still has evaluation evidence.',
      now: new Date('2026-05-21T08:20:00.000Z'),
    }, root);
    rmSync(evalA);

    const comparison = compareEvolutionLoop(outDir, {}, root);
    const markdown = renderEvolutionComparison(comparison, 'markdown');

    expect(markdown).toContain('# Evolution loop: demo-loop — A vs B');
    expect(markdown).toContain('| Evaluation envelope | ✓ | ✓ | — |');
    expect(markdown).toContain('| AC1 — Loop state is created. | — | ✓ pass ▲ |');
    expect(markdown).toContain('| AC2 — Frontier promotion is explicit. | — | ✓ pass ▲ |');
  });

  it('throws a clear error for unknown explicit compare targets', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root, 'attempt-a');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });
    recordEvolutionAttempt(outDir, { runPath, decision: 'promote', rationale: 'Only attempt.', now: new Date('2026-05-21T08:10:00.000Z') }, root);

    expect(() => compareEvolutionLoop(outDir, { a: 'missing-attempt', b: 'frontier' }, root)).toThrow(/Unknown evolution attempt target: missing-attempt/);
  });

  it('returns a successful message for single-attempt loops instead of failing', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runPath = writeRunPacket(root, 'attempt-a');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });
    recordEvolutionAttempt(outDir, { runPath, decision: 'promote', score: 0.75, rationale: 'Only attempt.', now: new Date('2026-05-21T08:10:00.000Z') }, root);

    const comparison = compareEvolutionLoop(outDir, {}, root);

    expect(comparison.kind).toBe('message');
    expect(renderEvolutionComparison(comparison, 'terminal')).toContain('Only one attempt recorded; nothing to compare yet.');
  });

  it('does not default to last two attempts when no frontier comparison exists', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });
    recordEvolutionAttempt(outDir, { runPath: runA, decision: 'reject', score: 0.25, rationale: 'Rejected first.', now: new Date('2026-05-21T08:10:00.000Z') }, root);
    recordEvolutionAttempt(outDir, { runPath: runB, decision: 'retry', score: 0.4, rationale: 'Needs another attempt.', now: new Date('2026-05-21T08:20:00.000Z') }, root);

    const comparison = compareEvolutionLoop(outDir, {}, root);

    expect(comparison.kind).toBe('message');
    expect(renderEvolutionComparison(comparison, 'terminal')).toContain('No previous frontier/current frontier comparison is recorded yet.');
  });

  it('marks side B as current frontier only when B is actually the current frontier', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const runA = writeRunPacket(root, 'attempt-a');
    const runB = writeRunPacket(root, 'attempt-b');
    const outDir = join(root, '.osc/evolution/demo-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-05-21T08:00:00.000Z') });
    recordEvolutionAttempt(outDir, { runPath: runA, decision: 'promote', score: 0.75, rationale: 'Current frontier.', now: new Date('2026-05-21T08:10:00.000Z') }, root);
    recordEvolutionAttempt(outDir, { runPath: runB, decision: 'reject', score: 0.5, rationale: 'Rejected non-frontier.', now: new Date('2026-05-21T08:20:00.000Z') }, root);

    const comparison = compareEvolutionLoop(outDir, { a: 'frontier', b: 'attempt-b' }, root);
    const markdown = renderEvolutionComparison(comparison, 'markdown');

    expect(markdown).toContain('`attempt-a` (promote, current frontier) → `attempt-b` (reject)');
    expect(markdown).not.toContain('`attempt-b` (reject, current frontier)');
  });
});
