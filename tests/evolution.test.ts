import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EVOLUTION_LOOP_SCHEMA,
  compareEvolutionLoop,
  loadEvolutionSource,
  recordEvolutionAttempt,
  renderEvolutionComparison,
  renderEvolutionLoopFiles,
  validateEvolutionLoopDir,
  writeEvolutionLoop,
} from '../src/evolution.js';

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
