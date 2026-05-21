import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EVOLUTION_LOOP_SCHEMA,
  loadEvolutionSource,
  recordEvolutionAttempt,
  renderEvolutionLoopFiles,
  validateEvolutionLoopDir,
  writeEvolutionLoop,
} from '../src/evolution.js';

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-evolution-'));
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

function writeEvaluation(root: string, runId = 'demo-run') {
  const evalPath = join(root, 'docs/evidence/evaluation.json');
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: 'eval-001',
    subject: { source: 'run', plan: '.osc/plans/active/087-demo.md', plan_slug: '087-demo', task_id: 'task-123', run_id: runId, run_packet: `.osc/runs/${runId}/run.json` },
    decision: { status: 'approved', approver: 'human', rationale: 'Evidence reviewed.' },
    improvement: { route: 'close', target: null, carried_forward: [], do_not_assume: ['No model benchmark claim.'] },
  }, null, 2));
  return evalPath;
}

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
    expect(attempts[0]).toMatchObject({ run_id: 'demo-run', evaluation_id: 'eval-001', decision: 'promote', score: 0.92 });
    expect(frontier.current).toMatchObject({ attempt_id: 'demo-run', run_id: 'demo-run', score: 0.92, rationale: 'Best evidence so far.' });
    expect(frontier.boundary).toMatchObject({ approval_or_release_decision: false, model_benchmarking: false });
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
