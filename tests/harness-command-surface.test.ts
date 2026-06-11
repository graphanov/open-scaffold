import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  answerHumanGate,
  getHarnessStatus,
  parseHarnessCommand,
  routeHarnessCommand,
} from '../src/harness.js';
import { persistAcceptedImprovement, readFeedback } from '../src/feedback.js';
import { recordEvolutionAttempt, writeEvolutionLoop } from '../src/evolution.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(prefix = 'osc-harness-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', root], { encoding: 'utf8' });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nHarness test repo.\n', 'utf8');
  return root;
}

function writeCheckpointPlan(root: string) {
  const planPath = join(root, '.osc/plans/active/checkpoint-demo.md');
  writeFileSync(planPath, `# Plan: checkpoint-demo

## Status

active

## Context

Checkpoint fixture.

## Goal

Test judgment checkpoints.

## Constraints / Out of scope

- Do not spawn blind retries.

## Files to touch

- demo.txt

## Acceptance criteria

- [ ] AC1: Stable criterion passes.
- [ ] AC2: Unsatisfiable criterion is questioned.

## Verification steps

1. Run tests.

## Open questions

None.
`);
  return planPath;
}

function writeCheckpointRun(root: string, runId: string) {
  const runDir = join(root, `.osc/runs/${runId}`);
  mkdirSync(runDir, { recursive: true });
  const runPath = join(runDir, 'run.json');
  writeFileSync(runPath, JSON.stringify({
    schemaVersion: 'open-scaffold.run.v1',
    runId,
    taskId: 'checkpoint-task',
    plan: {
      slug: 'checkpoint-demo',
      path: '.osc/plans/active/checkpoint-demo.md',
      acceptanceCriteria: ['Stable criterion passes.', 'Unsatisfiable criterion is questioned.'],
    },
    artifacts: { evidence: [`docs/evidence/${runId}.md`] },
  }, null, 2));
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, `docs/evidence/${runId}.md`), `${runId} evidence\n`);
  return runPath;
}

function writeCheckpointEvaluation(root: string, runId: string) {
  const evalPath = join(root, `docs/evidence/${runId}-evaluation.json`);
  writeFileSync(evalPath, JSON.stringify({
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: `eval-${runId}`,
    subject: { source: 'run', plan: '.osc/plans/active/checkpoint-demo.md', plan_slug: 'checkpoint-demo', task_id: 'checkpoint-task', run_id: runId, run_packet: `.osc/runs/${runId}/run.json` },
    acceptance_criteria: [
      { id: 'AC1', text: 'Stable criterion passes.', status: 'pass', evaluator: { kind: 'tests', name: 'fixture', ref: null }, evidence: [], rationale: 'pass' },
      { id: 'AC2', text: 'Unsatisfiable criterion is questioned.', status: 'fail', evaluator: { kind: 'tests', name: 'fixture', ref: null }, evidence: [], rationale: 'fail' },
    ],
  }, null, 2));
  return evalPath;
}

function writeCheckpointLoop(root: string) {
  const planPath = writeCheckpointPlan(root);
  const outDir = join(root, '.osc/evolution/checkpoint-loop');
  writeEvolutionLoop(planPath, outDir, root, { strategy: 'greedy', now: new Date('2026-06-11T12:00:00.000Z') });
  for (const [index, runId] of ['attempt-a', 'attempt-b', 'attempt-c'].entries()) {
    recordEvolutionAttempt(outDir, {
      runPath: writeCheckpointRun(root, runId),
      evaluationPath: writeCheckpointEvaluation(root, runId),
      decision: index === 0 ? 'promote' : 'reject',
      rationale: `Attempt ${runId} preserved the same failing AC fingerprint.`,
      now: new Date(`2026-06-11T12:${String(10 + index).padStart(2, '0')}:00.000Z`),
    }, root);
  }
  return outDir;
}

describe('harness command surface', () => {
  it('parses the four primary dollar commands independent of transport', () => {
    for (const name of ['$interview', '$plan', '$work', '$team'] as const) {
      const parsed = parseHarnessCommand(`${name} "ship a safe slice" --context "repo truth"`);
      expect(parsed.command).toBe(name.slice(1));
      expect(parsed.intent).toBe('ship a safe slice');
      expect(parsed.options.context).toEqual(['repo truth']);
    }
  });

  it('rejects granular meme/prototype command names in the public router', () => {
    for (const forbidden of ['$jon', '$damn-food', '$soy-sauce', '$vegetables']) {
      expect(() => parseHarnessCommand(`${forbidden} "nope"`)).toThrow(/unsupported harness command/i);
    }
  });

  it('routes $interview into a bounded clarification draft and missing-context human gate', () => {
    const root = tempScaffold();
    const result = routeHarnessCommand({ repoRoot: root, input: '$interview "make the runtime safer"' });

    expect(result.command).toBe('interview');
    expect(result.status.state).toBe('waiting_on_human');
    expect(result.humanGates).toHaveLength(1);
    expect(result.humanGates[0]).toMatchObject({ id: 'missing-required-context', status: 'pending', required: true });
    expect(result.artifacts.some((artifact) => artifact.path.endsWith('/interview.json'))).toBe(true);
    expect(existsSync(join(root, result.artifacts.find((artifact) => artifact.path.endsWith('/interview.json'))!.path))).toBe(true);
  });

  it('lets a human answer satisfy a gate and resume a $work run as task input, not approval', () => {
    const root = tempScaffold();
    const created = routeHarnessCommand({ repoRoot: root, input: '$work "implement the smallest safe slice"' });
    expect(created.status.state).toBe('waiting_on_human');

    const answered = answerHumanGate({
      repoRoot: root,
      runId: created.runId,
      gateId: 'missing-required-context',
      answer: 'Human context: README-only smoke; no commit, push, publish, or runtime spawn.',
    });

    expect(answered.status.state).toBe('ready');
    expect(answered.humanGates[0]).toMatchObject({ status: 'satisfied' });
    expect(answered.humanGates[0].answer?.boundary).toMatchObject({ answer_is_task_input: true, answer_is_not_approval: true });
    const status = getHarnessStatus({ repoRoot: root, runId: created.runId });
    expect(status.state).toBe('ready');
    expect(status.pendingHumanGates).toHaveLength(0);
  });

  it('creates a repo-native plan artifact from $plan without using long CLI-brained UX', () => {
    const root = tempScaffold();
    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$plan "Add a harness smoke" --slug harness-smoke --acceptance "Harness smoke is documented" --verify "Run npm test"',
    });

    expect(result.command).toBe('plan');
    expect(result.status.state).toBe('completed');
    const planPath = join(root, '.osc/plans/active/harness-smoke.md');
    expect(existsSync(planPath)).toBe(true);
    const plan = readFileSync(planPath, 'utf8');
    expect(plan).toContain('## Acceptance criteria');
    expect(plan).toContain('Harness smoke is documented');
    expect(plan).not.toMatch(/TODO:|john-lomein|damn-food|soy-sauce|vegetables/i);
  });

  it('creates a bounded $team run with multiple worker lanes and one shared evidence record', () => {
    const root = tempScaffold();
    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$team "coordinate implementation docs and review" --context "plan is ready" --worker implementation --worker docs --worker review',
    });

    expect(result.command).toBe('team');
    expect(result.status.state).toBe('ready');
    expect(result.workerStatuses.map((worker) => worker.id)).toEqual(['implementation', 'docs', 'review']);
    const sharedEvidence = result.artifacts.find((artifact) => artifact.role === 'shared_evidence');
    expect(sharedEvidence).toBeTruthy();
    expect(result.artifacts.find((artifact) => artifact.role === 'feedback')).toBeTruthy();
    expect(existsSync(join(root, sharedEvidence!.path))).toBe(true);
    const team = JSON.parse(readFileSync(join(root, `.osc/runs/${result.runId}/team.json`), 'utf8'));
    expect(team.feedback).toMatchObject({ schema: 'osc.feedback.v1', feedback_is_not_approval: true });
  });

  it('writes an ambient record for $work postflight without worker-authored bookkeeping', () => {
    const root = tempScaffold();
    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$work "ambient record smoke" --context "repo truth"',
    });

    expect(result.status.state).toBe('ready');
    const ambientArtifact = result.artifacts.find((artifact) => artifact.role === 'ambient_record');
    expect(ambientArtifact).toBeTruthy();
    const ambient = JSON.parse(readFileSync(join(root, ambientArtifact!.path), 'utf8'));
    expect(ambient).toMatchObject({
      schema: 'osc.ambient-work-record.v1',
      runId: result.runId,
      source: 'harness-postflight',
      runtime: { status: 'dry_run', spawned: false },
      boundary: { not_worker_authored: true, not_approval: true },
    });
  });

  it('lets $work checkpoint block another runtime attempt before dispatch', () => {
    const root = tempScaffold();
    writeCheckpointLoop(root);

    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$work "blind retry should not run" --context "repo truth" --checkpoint .osc/evolution/checkpoint-loop --adapter codex --allow-spawn',
    });

    expect(result.status.state).toBe('blocked');
    expect(result.message).toContain('Judgment checkpoint blocked runtime dispatch');
    const packet = JSON.parse(readFileSync(join(root, `.osc/runs/${result.runId}/run.json`), 'utf8'));
    expect(packet.runtime.spawning).toBe(false);
    expect(packet.judgmentCheckpoint.retryAuthorized).toMatchObject({ allow: false, mode: 'blocked_by_packet' });
    expect(existsSync(join(root, `.osc/runs/${result.runId}/judgment-checkpoint.json`))).toBe(true);
    expect(existsSync(join(root, `.osc/runs/${result.runId}/runtime-receipt.json`))).toBe(false);
    const feedback = readFeedback({ repoRoot: root, runId: result.runId });
    expect(feedback[0]).toMatchObject({ source: 'reviewer', verdict: 'block', scope: 'run' });
  });

  it('gives $team a shared feedback path, repair hypothesis, accepted lessons, and postflight parity', () => {
    const root = tempScaffold();
    persistAcceptedImprovement({
      repoRoot: root,
      slug: 'team-handoff-budget',
      title: 'Team handoff budget',
      lesson: 'Future team handoff runs should keep shared continuation notes compact and cite shared evidence.',
      evidencePaths: ['.osc/runs/team-example/shared-evidence.md'],
    });
    persistAcceptedImprovement({
      repoRoot: root,
      slug: 'unrelated-runtime-marker',
      title: 'Runtime marker discipline',
      lesson: 'Future runtime marker runs should end with exactly one standalone marker.',
      evidencePaths: ['.osc/runs/runtime-example/runtime-receipt.json'],
    });

    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$team "team handoff budget repair" --context "plan is ready" --worker implementation --worker review --inherit-improvements --worker-outcome review:blocked --repair-hypothesis "Review lane should summarize blockers in shared evidence before retry."',
    });

    expect(result.command).toBe('team');
    expect(result.status.state).toBe('blocked');
    const team = JSON.parse(readFileSync(join(root, `.osc/runs/${result.runId}/team.json`), 'utf8'));
    expect(team.improvements.inherited.map((item: { slug: string }) => item.slug)).toEqual(['team-handoff-budget']);
    expect(team.repairHypotheses[0].hypothesis).toContain('Review lane should summarize blockers');
    expect(team.feedback).toMatchObject({ schema: 'osc.feedback.v1', feedback_is_not_approval: true });
    const feedback = readFeedback({ repoRoot: root, runId: result.runId });
    expect(feedback[0]).toMatchObject({ source: 'runtime', verdict: 'block', scope: 'run', nextAction: 'retry-team' });
    const postflight = readFileSync(join(root, `.osc/runs/${result.runId}/postflight.md`), 'utf8');
    expect(postflight).toContain(`Feedback: .osc/runs/${result.runId}/feedback.jsonl`);
    expect(postflight).toContain('Accepted improvements inherited: 1');
    expect(postflight).toContain('Feedback is task input and learning signal, not owner approval.');
  });

  it('rejects unsafe run ids and symlinked status reads before gate resume', () => {
    const root = tempScaffold();
    const outside = mkdtempSync(join(tmpdir(), 'osc-harness-outside-'));
    expect(() => getHarnessStatus({ repoRoot: root, runId: '..' })).toThrow(/safe/);
    mkdirSync(join(root, '.osc/runs/symlink-run'), { recursive: true });
    symlinkSync(join(outside, 'status.json'), join(root, '.osc/runs/symlink-run/status.json'));
    expect(() => getHarnessStatus({ repoRoot: root, runId: 'symlink-run' })).toThrow(/symlink/i);
  });
});
