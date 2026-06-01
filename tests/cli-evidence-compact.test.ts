import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-evidence-compact-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  mkdirSync(join(root, '.osc/runs/demo-run'), { recursive: true });
  mkdirSync(join(root, '.osc/evolution/demo-loop'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  const rawLog = join(root, '.osc/runs/demo-run/codex-events.jsonl');
  writeFileSync(rawLog, 'RAW_TRANSCRIPT_SECRET /home/example/private/path\n{"event":"token"}\n');
  const candidateNote = join(root, 'docs/evidence/model-candidate-note.md');
  writeFileSync(candidateNote, 'MODEL_CANDIDATE_SECRET: model-authored draft notes should not be embedded.');
  const proof = join(root, 'docs/evidence/proof.md');
  writeFileSync(proof, 'Curated proof: verification failed on AC2.');
  const runPath = join(root, '.osc/runs/demo-run/run.json');
  writeFileSync(runPath, JSON.stringify({
    schemaVersion: 'open-scaffold.run.v1',
    runId: 'demo-run',
    taskId: 'task-123',
    plan: {
      slug: '136-demo',
      path: '.osc/plans/active/136-demo.md',
      goal: 'Compact repeated-run evidence without leaking raw logs.',
      acceptanceCriteria: ['AC1: Summary exists.', 'AC2: Failures remain visible.'],
      verificationSteps: ['npm test -- --run tests/cli-evidence-compact.test.ts', 'npm run build'],
    },
    artifacts: {
      manifest: '.osc/runs/demo-run/run.json',
      logs: ['.osc/runs/demo-run/codex-events.jsonl'],
      outputs: ['.osc/runs/demo-run/runtime-output.log'],
      evidence: ['docs/evidence/proof.md'],
    },
  }, null, 2));
  writeFileSync(join(root, '.osc/runs/demo-run/runtime-output.log'), 'RAW_OUTPUT_SECRET should stay local.');
  const evalPath = join(root, 'docs/evidence/demo-run-evaluation.json');
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: 'eval-demo-run',
    subject: { source: 'run', plan: '.osc/plans/active/136-demo.md', plan_slug: '136-demo', task_id: 'task-123', run_id: 'demo-run', run_packet: '.osc/runs/demo-run/run.json' },
    acceptance_criteria: [
      {
        id: 'AC1',
        text: 'Summary exists.',
        status: 'pass',
        evaluator: { kind: 'automated-check', name: 'compact-fixture', ref: 'docs/evidence/proof.md' },
        evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Curated proof.' }],
        rationale: 'Summary was generated.',
      },
      {
        id: 'AC2',
        text: 'Failures remain visible.',
        status: 'fail',
        evaluator: { kind: 'automated-check', name: 'compact-fixture', ref: 'docs/evidence/proof.md' },
        evidence: [
          { kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Curated proof.' },
          { kind: 'path', ref: 'C:\\Users\\alice\\secret.log', summary: 'Synthetic Windows local path; must be omitted from compact output.' },
        ],
        rationale: 'Failure was reproduced at /home/example/private/raw.log.',
      },
    ],
    decision: { status: 'rejected', approver: 'human', rationale: 'AC2 remains failed.' },
    improvement: { route: 'retry_run', target: null, carried_forward: ['AC2 must stay visible.'], do_not_assume: ['Compact evidence is not proof of correctness.'] },
  }, null, 2));
  return { root, runPath, evalPath, rawLog, candidateNote };
}

function writeLoop(root: string, runPath: string, evalPath: string) {
  const loopDir = join(root, '.osc/evolution/demo-loop');
  writeFileSync(join(loopDir, 'loop.json'), JSON.stringify({
    schema: 'open-scaffold.evolution-loop.v1',
    loop_id: 'demo-loop',
    objective: 'Compact a repeated-attempt loop.',
    subject: { plan_slug: '136-demo', task_id: 'task-123' },
    strategy: { name: 'manual', executes_in_core: false },
  }, null, 2));
  writeFileSync(join(loopDir, 'attempts.jsonl'), `${JSON.stringify({
    schema: 'open-scaffold.evolution-attempt.v1',
    attempt_id: 'demo-run',
    run_id: 'demo-run',
    task_id: 'task-123',
    run_packet: '.osc/runs/demo-run/run.json',
    evaluation: 'docs/evidence/demo-run-evaluation.json',
    evaluation_decision: 'rejected',
    evidence_refs: ['docs/evidence/proof.md', '.osc/runs/demo-run/codex-events.jsonl'],
    adapter_receipts: [],
    decision: 'retry',
    score: 0.5,
    rationale: 'AC2 remains failed.',
  })}\n`);
  writeFileSync(join(loopDir, 'frontier.json'), JSON.stringify({
    schema: 'open-scaffold.evolution-frontier.v1',
    loop_id: 'demo-loop',
    current: { attempt_id: 'demo-run', run_id: 'demo-run', score: 0.5, rationale: 'Best but still failed.' },
    history: [],
  }, null, 2));
  expect(existsSync(runPath)).toBe(true);
  expect(existsSync(evalPath)).toBe(true);
  return loopDir;
}

describe('osc evidence compact', () => {
  it('writes compact run summary and manifest without embedding raw logs or local paths', () => {
    const { root, runPath, evalPath, rawLog, candidateNote } = tempRepo();
    const outDir = join(root, 'docs/evidence/compact-demo-run');

    const output = execFileSync(tsx, [cli, 'evidence', 'compact', runPath, '--evaluation', evalPath, '--candidate-note', candidateNote, '--out', outDir], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Wrote compact evidence summary:');
    expect(output).toContain('Wrote compact evidence manifest:');
    const markdown = readFileSync(join(outDir, 'compact-evidence.md'), 'utf8');
    const manifestText = readFileSync(join(outDir, 'compact-evidence.json'), 'utf8');
    const manifest = JSON.parse(manifestText);

    expect(manifest.schema).toBe('open-scaffold.compact-evidence.v1');
    expect(manifest.subject).toMatchObject({ kind: 'run', run_id: 'demo-run', plan_slug: '136-demo' });
    expect(manifest.evaluation.status_counts).toMatchObject({ pass: 1, fail: 1 });
    expect(manifest.evaluation.failed_criteria[0]).toMatchObject({ id: 'AC2', status: 'fail' });
    expect(manifest.summary.next_recommendation).toBe('retry_run');
    expect(manifest.raw_local_evidence.some((ref: any) => ref.ref === '.osc/runs/demo-run/codex-events.jsonl' && ref.digest_sha256)).toBe(true);
    expect(manifest.promoted_evidence.some((ref: any) => ref.ref === 'docs/evidence/demo-run-evaluation.json' && ref.role === 'evaluation_envelope')).toBe(true);
    expect(manifest.candidate_notes[0]).toMatchObject({ ref: 'docs/evidence/model-candidate-note.md', canonical: false });

    expect(markdown).toContain('AC2');
    expect(markdown).toContain('retry_run');
    expect(markdown).toContain('Raw/local evidence omitted from public payload');
    expect(`${markdown}\n${manifestText}`).not.toContain('RAW_TRANSCRIPT_SECRET');
    expect(`${markdown}\n${manifestText}`).not.toContain('RAW_OUTPUT_SECRET');
    expect(`${markdown}\n${manifestText}`).not.toContain('MODEL_CANDIDATE_SECRET');
    expect(`${markdown}\n${manifestText}`).not.toContain('/home/example');
    expect(`${markdown}\n${manifestText}`).not.toContain('C:/Users');
    expect(`${markdown}\n${manifestText}`).not.toContain('C:\\Users');
    expect(`${markdown}\n${manifestText}`).not.toContain('Users\\\\alice');
    expect(`${markdown}\n${manifestText}`).not.toContain('secret.log');
    expect(readFileSync(rawLog, 'utf8')).toContain('RAW_TRANSCRIPT_SECRET');
  });

  it('prints compact loop JSON without mutating loop state', () => {
    const { root, runPath, evalPath } = tempRepo();
    const loopDir = writeLoop(root, runPath, evalPath);
    const before = {
      loop: readFileSync(join(loopDir, 'loop.json'), 'utf8'),
      attempts: readFileSync(join(loopDir, 'attempts.jsonl'), 'utf8'),
      frontier: readFileSync(join(loopDir, 'frontier.json'), 'utf8'),
    };

    const manifest = JSON.parse(execFileSync(tsx, [cli, 'evidence', 'compact', loopDir, '--json'], { cwd: root, encoding: 'utf8' }));

    expect(manifest.subject).toMatchObject({ kind: 'evolution_loop', loop_id: 'demo-loop', plan_slug: '136-demo' });
    expect(manifest.summary).toMatchObject({ attempt_count: 1, current_attempt_id: 'demo-run', frontier_attempt_id: 'demo-run', decision: 'retry' });
    expect(manifest.evaluation.failed_criteria[0]).toMatchObject({ id: 'AC2', status: 'fail' });
    expect(manifest.raw_local_evidence.some((ref: any) => ref.ref === '.osc/runs/demo-run/codex-events.jsonl')).toBe(true);
    expect(manifest.promoted_evidence.some((ref: any) => ref.ref === '.osc/evolution/demo-loop/attempts.jsonl' && ref.role === 'attempt_journal')).toBe(true);
    expect(manifest.raw_local_evidence.some((ref: any) => ref.ref === '.osc/evolution/demo-loop/attempts.jsonl')).toBe(false);
    expect(JSON.stringify(manifest)).not.toContain('RAW_TRANSCRIPT_SECRET');

    expect(readFileSync(join(loopDir, 'loop.json'), 'utf8')).toBe(before.loop);
    expect(readFileSync(join(loopDir, 'attempts.jsonl'), 'utf8')).toBe(before.attempts);
    expect(readFileSync(join(loopDir, 'frontier.json'), 'utf8')).toBe(before.frontier);
  });
});
