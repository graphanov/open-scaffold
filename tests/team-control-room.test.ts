import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { answerHumanGate, routeHarnessCommand } from '../src/harness.js';
import { persistAcceptedImprovement, readFeedback } from '../src/feedback.js';
import { schemaById } from '../src/schema-registry.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(prefix = 'osc-team-control-room-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', root], { encoding: 'utf8' });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nTeam control-room test repo.\n', 'utf8');
  writeFileSync(join(root, '.osc/plans/active/team-plan.md'), [
    '# Plan: team-plan',
    '',
    '## Status',
    '',
    'active',
    '',
    '## Goal',
    '',
    'Coordinate implementation, docs, and review lanes from one plan.',
    '',
    '## Acceptance criteria',
    '',
    '- [ ] Lanes share one evidence record.',
    '',
  ].join('\n'), 'utf8');
  return root;
}

function readJson(root: string, path: string): any {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

describe('$team control-room adapter parity', () => {
  it('records multiple worker lanes under one shared status, adapter metadata, evidence record, and failure code', () => {
    const root = tempScaffold();

    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$team "coordinate the active team plan" --plan .osc/plans/active/team-plan.md --context "plan is ready" --worker implementation --worker docs --worker review --worker-adapter implementation:codex --worker-adapter docs:plain --worker-adapter review:human --worker-outcome implementation:complete --worker-outcome docs:blocked --worker-outcome review:complete',
    });

    expect(result.status.state).toBe('blocked');
    expect(result.status.workers).toHaveLength(3);
    expect(result.status.workers.map((worker: any) => worker.id)).toEqual(['implementation', 'docs', 'review']);

    const docsLane = result.status.workers.find((worker: any) => worker.id === 'docs') as any;
    expect(docsLane).toMatchObject({
      state: 'blocked',
      adapter: {
        schema: 'osc.team-worker-adapter-contract.v1',
        adapterId: 'plain',
        transportNeutral: true,
        authority: {
          canMerge: false,
          canPublish: false,
          canRelease: false,
          canDeploy: false,
          canForcePush: false,
        },
      },
      failureCode: 'worker_blocked',
    });
    expect(docsLane.evidenceLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'shared_evidence', path: `.osc/runs/${result.runId}/shared-evidence.md` }),
      expect.objectContaining({ role: 'worker_evidence', path: `.osc/runs/${result.runId}/workers/docs/evidence.md` }),
    ]));

    const sharedEvidence = result.artifacts.find((artifact) => artifact.role === 'shared_evidence');
    expect(sharedEvidence?.path).toBe(`.osc/runs/${result.runId}/shared-evidence.md`);
    expect(existsSync(join(root, sharedEvidence!.path))).toBe(true);
    expect(existsSync(join(root, `.osc/runs/${result.runId}/postflight.md`))).toBe(true);

    const team = readJson(root, `.osc/runs/${result.runId}/team.json`);
    expect(team.planRef).toMatchObject({ path: '.osc/plans/active/team-plan.md' });
    expect(team.sharedEvidence).toMatchObject({ path: `.osc/runs/${result.runId}/shared-evidence.md` });
    expect(team.workers.find((worker: any) => worker.id === 'docs').failureCode).toBe('worker_blocked');
    expect(team.boundary).toMatchObject({ one_shared_run_record: true, worker_lanes_have_no_owner_authority: true });
  });

  it('surfaces worker-level human gates in shared status and resumes the same team run after an answer', () => {
    const root = tempScaffold();

    const waiting = routeHarnessCommand({
      repoRoot: root,
      input: '$team "two lane smoke" --context "plan is ready" --worker implementation --worker review --worker-outcome implementation:complete --worker-outcome review:needs-human --worker-question review:"Pick README.md or docs/HARNESS_COMMANDS.md before review continues."',
    });

    expect(waiting.status.state).toBe('waiting_on_human');
    expect(waiting.status.pendingHumanGates).toHaveLength(1);
    expect(waiting.status.pendingHumanGates[0]).toMatchObject({
      id: 'worker-review-needs-human',
      workerId: 'review',
      status: 'pending',
      prompt: expect.stringContaining('Pick README.md'),
    });
    expect((waiting.status.workers.find((worker: any) => worker.id === 'review') as any).humanGateIds).toEqual(['worker-review-needs-human']);

    const answered = answerHumanGate({
      repoRoot: root,
      runId: waiting.runId,
      gateId: 'worker-review-needs-human',
      answer: 'Use README.md first. This is task input only, not approval.',
    });

    expect(answered.runId).toBe(waiting.runId);
    expect(answered.status.state).toBe('ready');
    expect(answered.status.pendingHumanGates).toHaveLength(0);
    expect(answered.humanGates[0].answer?.boundary).toMatchObject({ answer_is_task_input: true, answer_is_not_approval: true });

    const team = readJson(root, `.osc/runs/${waiting.runId}/team.json`);
    expect(team.workers.find((worker: any) => worker.id === 'review')).toMatchObject({ state: 'ready', resumedFromGate: 'worker-review-needs-human' });
    expect(readFileSync(join(root, `.osc/runs/${waiting.runId}/postflight.md`), 'utf8')).toContain('State: ready');

    const sharedEvidence = readFileSync(join(root, `.osc/runs/${waiting.runId}/shared-evidence.md`), 'utf8');
    const reviewEvidence = readFileSync(join(root, `.osc/runs/${waiting.runId}/workers/review/evidence.md`), 'utf8');
    expect(sharedEvidence).toContain('- review: ready;');
    expect(sharedEvidence).not.toContain('review: waiting_on_human');
    expect(reviewEvidence).toContain('State: ready');
    expect(reviewEvidence).toContain('Human gates: none');
    expect(reviewEvidence).toContain('Resumed from gate: worker-review-needs-human');

    const events = readFileSync(join(root, `.osc/runs/${waiting.runId}/events.jsonl`), 'utf8')
      .trim()
      .split('\n')
      .map((line: string) => JSON.parse(line));
    expect(events.find((event: any) => event.type === 'human_gate')).toMatchObject({ schema: 'osc.harness-event.v1', gateSchema: 'osc.team-shared-gate.v1' });
    expect(events.map((event: any) => event.type)).toContain('command_ready');
    expect(events.map((event: any) => event.type)).not.toContain('command_completed');
  });

  it('turns failed worker lanes into shared feedback, repair hypotheses, and postflight evidence without fragmenting truth', () => {
    const root = tempScaffold();

    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$team "repair failed lane" --context "plan is ready" --worker implementation --worker review --worker-outcome implementation:complete --worker-outcome review:failed --repair-hypothesis "Review lane must cite the shared evidence before retry."',
    });

    expect(result.status.state).toBe('failed');
    const reviewLane = result.status.workers.find((worker: any) => worker.id === 'review') as any;
    expect(reviewLane).toMatchObject({ state: 'failed', failureCode: 'worker_failed' });

    const feedback = readFeedback({ repoRoot: root, runId: result.runId });
    expect(feedback).toHaveLength(1);
    expect(feedback[0]).toMatchObject({
      source: 'runtime',
      verdict: 'retry',
      scope: 'run',
      nextAction: 'retry-team',
      repairHypothesis: 'Review lane must cite the shared evidence before retry.',
    });
    expect(feedback[0].evidencePaths).toEqual(expect.arrayContaining([
      `.osc/runs/${result.runId}/shared-evidence.md`,
      `.osc/runs/${result.runId}/workers/review/evidence.md`,
    ]));

    const team = readJson(root, `.osc/runs/${result.runId}/team.json`);
    expect(team.repairHypotheses[0]).toMatchObject({ workerId: 'review', hypothesis: 'Review lane must cite the shared evidence before retry.' });
    const postflight = readFileSync(join(root, `.osc/runs/${result.runId}/postflight.md`), 'utf8');
    expect(postflight).toContain(`Feedback: .osc/runs/${result.runId}/feedback.jsonl`);
    expect(postflight).toContain('Review lane must cite the shared evidence before retry.');
    expect(postflight).toContain('Feedback is task input and learning signal, not owner approval.');
  });

  it('inherits only relevant accepted improvements into team runs and records the relevance signal', () => {
    const root = tempScaffold();
    persistAcceptedImprovement({
      repoRoot: root,
      slug: 'team-shared-evidence',
      title: 'Team shared evidence',
      lesson: 'Future team shared evidence runs should keep every worker linked to one shared evidence file.',
      evidencePaths: ['.osc/runs/example/shared-evidence.md'],
    });
    persistAcceptedImprovement({
      repoRoot: root,
      slug: 'runtime-marker-discipline',
      title: 'Runtime marker discipline',
      lesson: 'Future runtime marker runs should end with exactly one standalone marker.',
      evidencePaths: ['.osc/runs/example/runtime-receipt.json'],
    });

    const relevant = routeHarnessCommand({
      repoRoot: root,
      input: '$team "team shared evidence repair" --context "plan is ready" --worker implementation --inherit-improvements',
    });
    const relevantTeam = readJson(root, `.osc/runs/${relevant.runId}/team.json`);
    expect(relevantTeam.improvements.inherited.map((item: any) => item.slug)).toEqual(['team-shared-evidence']);
    expect(relevantTeam.improvements.inherited[0].relevance).toMatchObject({ requireQuery: true, query: 'team shared evidence repair' });

    const generic = routeHarnessCommand({
      repoRoot: root,
      input: '$team "the next work team" --context "plan is ready" --worker implementation --inherit-improvements',
    });
    const genericTeam = readJson(root, `.osc/runs/${generic.runId}/team.json`);
    expect(genericTeam.improvements.inherited).toEqual([]);
  });

  it('rejects duplicate worker ids before evidence paths or gate ids can collide', () => {
    const root = tempScaffold();

    expect(() => routeHarnessCommand({
      repoRoot: root,
      input: '$team "duplicate worker check" --context "plan is ready" --worker review --worker review',
    })).toThrow(/duplicate worker/i);
    expect(() => routeHarnessCommand({
      repoRoot: root,
      input: '$team "slug collision check" --context "plan is ready" --worker "review lane" --worker review-lane',
    })).toThrow(/duplicate worker/i);
    expect(() => routeHarnessCommand({
      repoRoot: root,
      input: '$team "duplicate outcome check" --context "plan is ready" --worker review --worker-outcome review:blocked --worker-outcome review:failed',
    })).toThrow(/duplicate worker-outcome/i);
    expect(() => routeHarnessCommand({
      repoRoot: root,
      input: '$team "duplicate adapter check" --context "plan is ready" --worker review --worker-adapter review:plain --worker-adapter review:human',
    })).toThrow(/duplicate worker-adapter/i);
    expect(() => routeHarnessCommand({
      repoRoot: root,
      input: '$team "duplicate question check" --context "plan is ready" --worker review --worker-question review:"Pick README" --worker-question review:"Pick docs"',
    })).toThrow(/duplicate worker-question/i);
  });

  it('rejects unsafe team plan refs before writing shared run artifacts', () => {
    const root = tempScaffold();

    for (const planRef of ['/tmp/plan.md', '../plan.md', 'https://example.test/plan.md', `bad${String.fromCharCode(0)}plan.md`]) {
      expect(() => routeHarnessCommand({
        repoRoot: root,
        input: `$team "unsafe plan check" --context "plan is ready" --plan "${planRef}"`,
      })).toThrow(/unsafe team plan ref/i);
    }
  });

  it('emits command_ready instead of completion for packaged team runs that are ready but not done', () => {
    const root = tempScaffold();

    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$team "ready event contract" --context "plan is ready" --worker implementation --worker review',
    });

    expect(result.status.state).toBe('ready');
    const events = readFileSync(join(root, `.osc/runs/${result.runId}/events.jsonl`), 'utf8')
      .trim()
      .split('\n')
      .map((line: string) => JSON.parse(line));
    expect(events.map((event: any) => event.type)).toContain('command_ready');
    expect(events.map((event: any) => event.type)).not.toContain('command_completed');
  });

  it('emits a transport-neutral control-room event stream and registers team/control-room schemas', () => {
    const root = tempScaffold();

    const result = routeHarnessCommand({
      repoRoot: root,
      input: '$team "control room event contract" --context "plan is ready" --worker implementation --worker review --worker-outcome implementation:complete --worker-outcome review:blocked',
    });

    expect(schemaById('osc.team-worker-lane.v1')).toBeTruthy();
    expect(schemaById('osc.team-shared-gate.v1')).toBeTruthy();
    expect(schemaById('osc.control-room-event.v1')).toBeTruthy();
    expect(schemaById('osc.team-worker-adapter-contract.v1')).toBeTruthy();

    const events = readFileSync(join(root, `.osc/runs/${result.runId}/events.jsonl`), 'utf8')
      .trim()
      .split('\n')
      .map((line: string) => JSON.parse(line));
    expect(events.map((event: any) => event.type)).toEqual(expect.arrayContaining(['team_worker_status', 'control_room_status', 'command_blocked']));
    for (const event of events) {
      expect(event.schema).toBe('osc.harness-event.v1');
      expect(event.controlRoom).toMatchObject({ schema: 'osc.control-room-event.v1', transport: 'neutral', platform: null });
      expect(JSON.stringify(event.controlRoom).toLowerCase()).not.toMatch(/discord|slack|telegram|electron|tauri/);
    }
  });
});
