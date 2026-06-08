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

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(prefix = 'osc-harness-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', root], { encoding: 'utf8' });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nHarness test repo.\n', 'utf8');
  return root;
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

  it('rejects unsafe run ids and symlinked status reads before gate resume', () => {
    const root = tempScaffold();
    const outside = mkdtempSync(join(tmpdir(), 'osc-harness-outside-'));
    expect(() => getHarnessStatus({ repoRoot: root, runId: '..' })).toThrow(/safe/);
    mkdirSync(join(root, '.osc/runs/symlink-run'), { recursive: true });
    symlinkSync(join(outside, 'status.json'), join(root, '.osc/runs/symlink-run/status.json'));
    expect(() => getHarnessStatus({ repoRoot: root, runId: 'symlink-run' })).toThrow(/symlink/i);
  });
});
