import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  analyzeEvolutionLoop,
  recordEvolutionAttempt,
  renderEvolutionAnalysis,
  writeEvolutionLoop,
} from '../src/evolution.js';

// 165: coverage for the harness-enforced evolution loop — record auto-fill,
// AC-fingerprint plateau detection, and the question-the-requirement packet.
// Mirrors the fixture-building approach in tests/evolution.test.ts.

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-evolution-enforced-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
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

function writeRunPacket(root: string, runId: string) {
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
    artifacts: { evidence: [`docs/evidence/${runId}-proof.md`] },
  }, null, 2));
  writeFileSync(join(root, `docs/evidence/${runId}-proof.md`), `${runId} proof`);
  return runPath;
}

function writeEvaluation(root: string, runId: string, statuses: Record<string, 'pass' | 'partial' | 'fail' | 'blocked' | 'not_evaluated'> = {}) {
  const evalPath = join(root, `docs/evidence/${runId}-evaluation.json`);
  const criteria = [
    { id: 'AC1', text: 'Loop state is created.', status: statuses.AC1 ?? 'pass' },
    { id: 'AC2', text: 'Frontier promotion is explicit.', status: statuses.AC2 ?? 'fail' },
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
      evidence: [{ kind: 'path', ref: `docs/evidence/${runId}-proof.md`, summary: 'Synthetic test evidence.' }],
      rationale: `${criterion.id} ${criterion.status}`,
    })),
    decision: { status: 'rejected', approver: 'human', rationale: 'Evidence reviewed.' },
    improvement: { route: 'retry_run', target: null, carried_forward: [], do_not_assume: ['No model benchmark claim.'] },
  }, null, 2));
  return evalPath;
}

// 165: write a scoreless attempt journal directly so score, target_metric, and
// actual_delta are all absent (record auto-fill is deliberately bypassed here to
// prove fingerprint plateau detection from AC states alone).
function writeScorelessFingerprintLoop(ac2Statuses: Array<'pass' | 'fail'>) {
  const root = tempRepo();
  const planPath = writePlan(root);
  const outDir = join(root, '.osc/evolution/fingerprint-loop');
  writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-06-05T08:00:00.000Z'), strategy: 'greedy' });
  const ids = ac2Statuses.map((_, index) => `attempt-${String.fromCharCode(97 + index)}`);
  const lines = ids.map((runId, index) => {
    writeRunPacket(root, runId);
    const evalPath = writeEvaluation(root, runId, { AC1: 'pass', AC2: ac2Statuses[index] });
    const evaluationRef = evalPath.replace(`${root}/`, '');
    return JSON.stringify({
      schema: 'open-scaffold.evolution-attempt.v1',
      attempt_id: runId,
      recorded_at: `2026-06-05T08:${String(10 + index).padStart(2, '0')}:00.000Z`,
      run_id: runId,
      task_id: 'task-123',
      run_packet: `.osc/runs/${runId}/run.json`,
      evaluation_id: `eval-${runId}`,
      evaluation: evaluationRef,
      evaluation_decision: 'rejected',
      decision: 'reject',
      score: null,
      rationale: `Recorded ${runId} without score telemetry.`,
      evidence_refs: [`docs/evidence/${runId}-proof.md`, evaluationRef],
      adapter_receipts: [],
      boundary: {
        runtime_spawning: false,
        model_benchmarking: false,
        compliance_certification: false,
        approval_or_release_decision: false,
        external_anchoring: false,
      },
    });
  });
  writeFileSync(join(outDir, 'attempts.jsonl'), `${lines.join('\n')}\n`);
  return { root, outDir };
}

describe('165 evolution record auto-fill', () => {
  it('auto-fills accepted_ac_count target and passCount delta from the linked evaluation when caller omits them', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const outDir = join(root, '.osc/evolution/auto-fill-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-06-04T08:00:00.000Z'), strategy: 'greedy' });

    // First recorded attempt: passCount 1 (AC1 pass, AC2 fail), delta versus 0.
    recordEvolutionAttempt(outDir, {
      runPath: writeRunPacket(root, 'attempt-a'),
      evaluationPath: writeEvaluation(root, 'attempt-a', { AC1: 'pass', AC2: 'fail' }),
      decision: 'promote',
      score: 0.5,
      rationale: 'First frontier with one criterion passing.',
      now: new Date('2026-06-04T08:10:00.000Z'),
    }, root);

    // Second attempt: passCount 2, previous passCount 1, delta = +1.
    recordEvolutionAttempt(outDir, {
      runPath: writeRunPacket(root, 'attempt-b'),
      evaluationPath: writeEvaluation(root, 'attempt-b', { AC1: 'pass', AC2: 'pass' }),
      decision: 'promote',
      score: 0.9,
      rationale: 'Second attempt fixes the reachable criterion.',
      now: new Date('2026-06-04T08:20:00.000Z'),
    }, root);

    const attempts = readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { repair_hypothesis?: { target_metric?: string; actual_delta?: number } });

    expect(attempts[0].repair_hypothesis).toMatchObject({ target_metric: 'accepted_ac_count', actual_delta: 1 });
    expect(attempts[1].repair_hypothesis).toMatchObject({ target_metric: 'accepted_ac_count', actual_delta: 1 });
  });

  it('records actual_delta as the drop when the linked evaluation regresses', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const outDir = join(root, '.osc/evolution/regress-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-06-04T09:00:00.000Z'), strategy: 'greedy' });

    recordEvolutionAttempt(outDir, {
      runPath: writeRunPacket(root, 'attempt-a'),
      evaluationPath: writeEvaluation(root, 'attempt-a', { AC1: 'pass', AC2: 'pass' }),
      decision: 'promote',
      rationale: 'Both criteria pass.',
      now: new Date('2026-06-04T09:10:00.000Z'),
    }, root);
    recordEvolutionAttempt(outDir, {
      runPath: writeRunPacket(root, 'attempt-b'),
      evaluationPath: writeEvaluation(root, 'attempt-b', { AC1: 'pass', AC2: 'fail' }),
      decision: 'reject',
      rationale: 'Regressed: one criterion now fails.',
      now: new Date('2026-06-04T09:20:00.000Z'),
    }, root);

    const attempts = readFileSync(join(outDir, 'attempts.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { repair_hypothesis?: { target_metric?: string; actual_delta?: number } });

    // passCount 2 -> 1 => delta -1.
    expect(attempts[1].repair_hypothesis).toMatchObject({ target_metric: 'accepted_ac_count', actual_delta: -1 });
  });

  it('keeps explicit caller target-metric and actual-delta over the auto-filled values', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const outDir = join(root, '.osc/evolution/explicit-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-06-04T10:00:00.000Z'), strategy: 'greedy' });

    recordEvolutionAttempt(outDir, {
      runPath: writeRunPacket(root, 'attempt-a'),
      evaluationPath: writeEvaluation(root, 'attempt-a', { AC1: 'pass', AC2: 'fail' }),
      decision: 'retry',
      rationale: 'Caller supplies its own control fields.',
      repairHypothesis: {
        hypothesis: 'Rework the parser branch so malformed rows report row and column.',
        targetMetric: 'custom_metric',
        expectedGain: 2,
        actualDelta: 5,
      },
      now: new Date('2026-06-04T10:10:00.000Z'),
    }, root);

    const attempt = JSON.parse(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8').trim()) as { repair_hypothesis?: { hypothesis?: string; target_metric?: string; actual_delta?: number; expected_gain?: number } };
    expect(attempt.repair_hypothesis).toMatchObject({
      hypothesis: 'Rework the parser branch so malformed rows report row and column.',
      target_metric: 'custom_metric',
      actual_delta: 5,
      expected_gain: 2,
    });
  });

  it('does not auto-fill control fields when no evaluation is linked', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    const outDir = join(root, '.osc/evolution/no-eval-loop');
    writeEvolutionLoop(planPath, outDir, root, { now: new Date('2026-06-04T11:00:00.000Z'), strategy: 'greedy' });

    recordEvolutionAttempt(outDir, {
      runPath: writeRunPacket(root, 'attempt-a'),
      decision: 'reject',
      rationale: 'No evaluation envelope attached.',
      now: new Date('2026-06-04T11:10:00.000Z'),
    }, root);

    const attempt = JSON.parse(readFileSync(join(outDir, 'attempts.jsonl'), 'utf8').trim()) as { repair_hypothesis?: unknown };
    expect(attempt.repair_hypothesis).toBeUndefined();
  });
});

describe('165 evolution fingerprint plateau detection', () => {
  it('reports a plateau from identical per-AC fingerprints across three attempts even when score and control fields are absent', () => {
    const { root, outDir } = writeScorelessFingerprintLoop(['fail', 'fail', 'fail']);

    const analysis = analyzeEvolutionLoop(outDir, {}, root);

    expect(analysis.plateau).toMatchObject({ status: 'plateau', fingerprintPlateau: true, scoreObserved: false, currentScore: null });
    expect(analysis.currentAttempt.score).toBeNull();
    expect(analysis.currentAttempt.repairHypothesis).toBeNull();
    expect(analysis.acceptanceSummary).toMatchObject({ currentPass: 1, currentTotal: 2 });
  });

  it('does not report a fingerprint plateau when the AC pattern is not stable across three attempts', () => {
    const { root, outDir } = writeScorelessFingerprintLoop(['fail', 'pass', 'fail']);

    const analysis = analyzeEvolutionLoop(outDir, {}, root);

    expect(analysis.plateau.fingerprintPlateau).toBe(false);
    expect(analysis.plateau.status).not.toBe('plateau');
  });

  it('does not report a fingerprint plateau with only two frozen attempts', () => {
    const { root, outDir } = writeScorelessFingerprintLoop(['fail', 'fail']);

    const analysis = analyzeEvolutionLoop(outDir, {}, root);

    expect(analysis.plateau.fingerprintPlateau).toBe(false);
  });
});

describe('165 evolution question-the-requirement packet', () => {
  it('recommends redesign and names the unsatisfiable criterion across every packet form on a zero-sensitivity plateau', () => {
    const { root, outDir } = writeScorelessFingerprintLoop(['fail', 'fail', 'fail']);

    const analysis = analyzeEvolutionLoop(outDir, {}, root);

    expect(analysis.recommendation.action).toBe('redesign');
    expect(analysis.recommendation.reasons).toEqual(expect.arrayContaining(['zero_sensitivity_plateau', 'question_the_requirement']));
    expect(analysis.recommendation.summary).toContain('the requirement itself may be unsatisfiable');

    const criterion = analysis.criteria.find((entry) => entry.id === 'AC2');
    expect(criterion).toMatchObject({ currentStatus: 'fail', alwaysFailing: true });

    expect(analysis.nextActionPacket.requirementQuestions).toEqual([
      expect.stringContaining('AC2 failed in every attempt with no observed delta'),
    ]);
    expect(analysis.nextActionPacket.requirementQuestions[0]).toContain('the requirement itself may be unsatisfiable');
    expect(analysis.nextActionPacket.acceptance.remainingFailures).toEqual([
      expect.objectContaining({ id: 'AC2', alwaysFailing: true }),
    ]);

    const terminal = renderEvolutionAnalysis(analysis, 'terminal');
    expect(terminal).toContain('Recommendation: redesign');
    expect(terminal).toContain('Question the requirement:');
    expect(terminal).toContain('the requirement itself may be unsatisfiable');

    const markdown = renderEvolutionAnalysis(analysis, 'markdown');
    expect(markdown).toContain('### Question the requirement');
    expect(markdown).toContain('the requirement itself may be unsatisfiable');

    const json = JSON.parse(renderEvolutionAnalysis(analysis, 'json')) as { nextActionPacket: { requirementQuestions: string[]; recommendedAction: string } };
    expect(json.nextActionPacket.recommendedAction).toBe('redesign');
    expect(json.nextActionPacket.requirementQuestions[0]).toContain('the requirement itself may be unsatisfiable');

    const compactTerminal = renderEvolutionAnalysis(analysis, 'terminal', { compact: true });
    expect(compactTerminal).toContain('Action: redesign');
    expect(compactTerminal).toContain('Question requirement:');
    expect(compactTerminal).toContain('the requirement itself may be unsatisfiable');

    const compactMarkdown = renderEvolutionAnalysis(analysis, 'markdown', { compact: true });
    expect(compactMarkdown).toContain('## Question the requirement');

    const compactJson = JSON.parse(renderEvolutionAnalysis(analysis, 'json', { compact: true })) as { action: string; requirementQuestions: string[] };
    expect(compactJson.action).toBe('redesign');
    expect(compactJson.requirementQuestions[0]).toContain('question whether');
  });

  it('does not emit question-the-requirement language when a criterion eventually passes', () => {
    const { root, outDir } = writeScorelessFingerprintLoop(['fail', 'fail', 'pass']);

    const analysis = analyzeEvolutionLoop(outDir, {}, root);

    expect(analysis.recommendation.reasons).not.toContain('question_the_requirement');
    expect(analysis.nextActionPacket.requirementQuestions).toEqual([]);
    expect(renderEvolutionAnalysis(analysis, 'terminal')).not.toContain('Question the requirement:');
    expect(renderEvolutionAnalysis(analysis, 'markdown', { compact: true })).not.toContain('## Question the requirement');
  });
});
