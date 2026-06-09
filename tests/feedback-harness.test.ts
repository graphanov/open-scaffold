import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  analyzeFeedback,
  loadAcceptedImprovements,
  persistAcceptedImprovement,
  readFeedback,
  recordFeedback,
} from '../src/feedback.js';
import { routeHarnessCommand } from '../src/harness.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(prefix = 'osc-feedback-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', root], { encoding: 'utf8' });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nFeedback test repo.\n', 'utf8');
  return root;
}

function trustAdapterConfig(root: string, id: string): void {
  const result = execFileSync(tsx, [cli, 'adapter', 'trust', id], { cwd: root, encoding: 'utf8' });
  expect(result).toContain(`Adapter: ${id}`);
}

function writeMarkerAdapter(root: string, id: string, body: string): void {
  const adapterDir = join(root, '.osc/adapters');
  mkdirSync(adapterDir, { recursive: true });
  writeFileSync(join(adapterDir, `${id}.mjs`), body, 'utf8');
  writeFileSync(join(adapterDir, `${id}.json`), JSON.stringify({
    schemaVersion: 'open-scaffold.adapter.v1',
    id,
    command: [process.execPath, `.osc/adapters/${id}.mjs`],
    timeoutMs: 1_000,
    maxStdoutBytes: 1_000,
    maxStderrBytes: 1_000,
  }, null, 2) + '\n', 'utf8');
  trustAdapterConfig(root, id);
}

function readJson(root: string, path: string): any {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

describe('harness feedback and self-improvement loop', () => {
  it('records feedback with required source/verdict/scope fields and analyzes repair hypotheses', () => {
    const root = tempScaffold();
    const run = routeHarnessCommand({ repoRoot: root, input: '$work "repair failing docs" --context "README-only"' });

    const recorded = recordFeedback({
      repoRoot: root,
      runId: run.runId,
      source: 'tests',
      verdict: 'retry',
      scope: 'run',
      whatHappened: 'Verification failed because the README still overclaimed runtime spawning.',
      whyItMatters: 'The command surface must preserve the no-spawn boundary.',
      repairHypothesis: 'Rewrite the run package wording so runtime spawning stays adapter-owned.',
      evidencePaths: [run.artifacts[0].path],
      nextAction: 'retry',
    });

    expect(recorded.record).toMatchObject({ schema: 'osc.feedback.v1', source: 'tests', verdict: 'retry', scope: 'run' });
    expect(recorded.record.boundary).toMatchObject({ feedback_is_not_approval: true });
    expect(existsSync(join(root, `.osc/runs/${run.runId}/feedback.jsonl`))).toBe(true);

    const analysis = analyzeFeedback({ repoRoot: root, runId: run.runId });
    expect(analysis.schema).toBe('osc.feedback-analysis.v1');
    expect(analysis.repairHypotheses[0].hypothesis).toContain('runtime spawning');
    expect(analysis.nextAction).toBe('retry');
    expect(existsSync(join(root, `.osc/runs/${run.runId}/improvement-candidates.json`))).toBe(true);
  });

  it('keeps feedback ids distinct for multiple records in one run', () => {
    const root = tempScaffold();
    const run = routeHarnessCommand({ repoRoot: root, input: '$team "two worker outcomes" --context "ready"' });
    const first = recordFeedback({
      repoRoot: root,
      runId: run.runId,
      source: 'reviewer',
      verdict: 'retry',
      scope: 'run',
      whatHappened: 'Review worker found a blocker.',
      whyItMatters: 'The shared result needs repair before retry.',
      repairHypothesis: 'Repair the review blocker.',
      nextAction: 'retry-team',
    });
    const second = recordFeedback({
      repoRoot: root,
      runId: run.runId,
      source: 'benchmark',
      verdict: 'retry',
      scope: 'run',
      whatHappened: 'Benchmark worker found a blocker.',
      whyItMatters: 'The shared result needs repair before retry.',
      repairHypothesis: 'Repair the benchmark blocker.',
      nextAction: 'retry-team',
    });

    expect(first.record.id).not.toBe(second.record.id);
  });

  it('turns failed and blocked runtime outcomes into feedback records with repair hypotheses', () => {
    const root = tempScaffold();
    try {
      writeMarkerAdapter(root, 'missing-marker', `console.log('finished without the required marker');\n`);
      writeMarkerAdapter(root, 'blocked-marker', `console.log('Blocked because the fixture is missing.');\nconsole.log('LOMEIN_BLOCKED');\n`);

      const failed = routeHarnessCommand({
        repoRoot: root,
        input: '$work "repair failed runtime" --context "repo truth" --adapter missing-marker --allow-spawn',
      });
      expect(failed.status.state).toBe('failed');
      const failedFeedback = readFeedback({ repoRoot: root, runId: failed.runId });
      expect(failedFeedback).toHaveLength(1);
      expect(failedFeedback[0]).toMatchObject({
        schema: 'osc.feedback.v1',
        source: 'runtime',
        verdict: 'retry',
        scope: 'runtime',
        nextAction: 'retry',
      });
      expect(failedFeedback[0].whatHappened).toContain('runtime_marker_missing');
      expect(failedFeedback[0].repairHypothesis).toContain('runtime_marker_missing');
      expect(failedFeedback[0].evidencePaths).toEqual(expect.arrayContaining([
        `.osc/runs/${failed.runId}/runtime-receipt.json`,
        `.osc/runs/${failed.runId}/runtime/stdout.log`,
      ]));
      const failedAnalysis = analyzeFeedback({ repoRoot: root, runId: failed.runId });
      expect(failedAnalysis.nextAction).toBe('retry');
      expect(failedAnalysis.repairHypotheses[0].hypothesis).toContain('runtime_marker_missing');

      const blocked = routeHarnessCommand({
        repoRoot: root,
        input: '$work "repair blocked runtime" --context "repo truth" --adapter blocked-marker --allow-spawn',
      });
      expect(blocked.status.state).toBe('blocked');
      const blockedFeedback = readFeedback({ repoRoot: root, runId: blocked.runId });
      expect(blockedFeedback[0]).toMatchObject({ source: 'runtime', verdict: 'block', scope: 'runtime', nextAction: 'block' });
      expect(blockedFeedback[0].repairHypothesis).toContain('runtime_blocked');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lets a retry inherit the repair hypothesis while preserving old attempt evidence', () => {
    const root = tempScaffold();
    try {
      writeMarkerAdapter(root, 'missing-marker', `console.log('finished without the required marker');\n`);
      writeMarkerAdapter(root, 'complete-marker', `console.log('retry completed with repaired marker handling');\nconsole.log('LOMEIN_COMPLETE');\n`);

      const first = routeHarnessCommand({
        repoRoot: root,
        input: '$work "retry feedback loop" --context "repo truth" --adapter missing-marker --allow-spawn',
      });
      const oldReceiptPath = `.osc/runs/${first.runId}/runtime-receipt.json`;
      const oldReceipt = readJson(root, oldReceiptPath);
      expect(oldReceipt).toMatchObject({ status: 'failed', failure: { code: 'runtime_marker_missing' } });

      const retry = routeHarnessCommand({
        repoRoot: root,
        input: `$work "retry feedback loop" --context "repo truth" --adapter complete-marker --allow-spawn --retry-of ${first.runId}`,
      });

      expect(existsSync(join(root, `.osc/runs/${first.runId}/improvement-candidates.json`))).toBe(false);
      expect(retry.runId).not.toBe(first.runId);
      expect(readJson(root, oldReceiptPath)).toMatchObject({ status: 'failed', failure: { code: 'runtime_marker_missing' } });
      expect(readJson(root, `.osc/runs/${retry.runId}/runtime-receipt.json`)).toMatchObject({ status: 'completed' });
      const retryPacket = readJson(root, `.osc/runs/${retry.runId}/run.json`);
      expect(retryPacket.retry).toMatchObject({ parentRunId: first.runId, attempt: 2 });
      expect(retryPacket.retry.repairHypothesis).toContain('runtime_marker_missing');
      expect(retryPacket.retry.previousEvidencePaths).toContain(oldReceiptPath);
      expect(retryPacket.context.join('\n')).toContain('Repair hypothesis from');
      expect(existsSync(join(root, `.osc/runs/${retry.runId}/retry.json`))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('persists accepted improvements and lets future work inherit only relevant lessons', () => {
    const root = tempScaffold();
    const applied = persistAcceptedImprovement({
      repoRoot: root,
      slug: 'compact-handoff-budget',
      title: 'Keep compact handoffs under budget',
      lesson: 'Future handoff resume runs should keep continuation packets below the character budget and cite evidence refs.',
      evidencePaths: ['.osc/runs/example/postflight.md'],
    });
    persistAcceptedImprovement({
      repoRoot: root,
      slug: 'keep-spawn-boundary-explicit',
      title: 'Keep spawn boundary explicit',
      lesson: 'Future runtime spawn boundary runs should state that Open Scaffold core packages work and adapters execute it.',
      evidencePaths: ['.osc/runs/example/runtime-receipt.json'],
    });

    expect(applied.path).toBe('.osc/improvements/applied/compact-handoff-budget.md');
    expect(readFileSync(join(root, applied.path), 'utf8')).toContain('Future handoff resume runs');

    const lessons = loadAcceptedImprovements({ repoRoot: root, query: 'handoff resume budget' });
    expect(lessons).toHaveLength(1);
    expect(lessons[0].slug).toBe('compact-handoff-budget');

    const run = routeHarnessCommand({ repoRoot: root, input: '$work "handoff resume budget next slice" --context "enough" --inherit-improvements' });
    const packet = JSON.parse(readFileSync(join(root, `.osc/runs/${run.runId}/run.json`), 'utf8'));
    expect(packet.improvements.inherited.map((item: { slug: string }) => item.slug)).toEqual(['compact-handoff-budget']);
    expect(loadAcceptedImprovements({ repoRoot: root, query: 'release approval evidence' })).toEqual([]);
    expect(loadAcceptedImprovements({ repoRoot: root, query: 'the next work team' })).toEqual([]);

    const genericWork = routeHarnessCommand({ repoRoot: root, input: '$work "the next work team" --context "enough" --inherit-improvements' });
    const genericPacket = JSON.parse(readFileSync(join(root, `.osc/runs/${genericWork.runId}/run.json`), 'utf8'));
    expect(genericPacket.improvements.inherited).toEqual([]);

    const genericTeam = routeHarnessCommand({ repoRoot: root, input: '$team "the next work team" --context "enough" --worker implementation --inherit-improvements' });
    const genericTeamPacket = JSON.parse(readFileSync(join(root, `.osc/runs/${genericTeam.runId}/team.json`), 'utf8'));
    expect(genericTeamPacket.improvements.inherited).toEqual([]);

    const emptyIntentWork = routeHarnessCommand({ repoRoot: root, input: '$work --context "enough" --inherit-improvements' });
    const emptyIntentPacket = JSON.parse(readFileSync(join(root, `.osc/runs/${emptyIntentWork.runId}/run.json`), 'utf8'));
    expect(emptyIntentPacket.improvements.inherited).toEqual([]);

    const emptyIntentTeam = routeHarnessCommand({ repoRoot: root, input: '$team --context "enough" --worker implementation --inherit-improvements' });
    const emptyIntentTeamPacket = JSON.parse(readFileSync(join(root, `.osc/runs/${emptyIntentTeam.runId}/team.json`), 'utf8'));
    expect(emptyIntentTeamPacket.improvements.inherited).toEqual([]);
  });

  it('rejects unsafe feedback refs and symlinked accepted-improvement inheritance', () => {
    const root = tempScaffold();
    const run = routeHarnessCommand({ repoRoot: root, input: '$work "unsafe refs" --context "repo truth"' });

    expect(() => recordFeedback({
      repoRoot: root,
      runId: run.runId,
      source: 'human',
      verdict: 'retry',
      scope: 'run',
      whatHappened: 'A local file URL was supplied.',
      whyItMatters: 'Feedback evidence refs must not leak local paths.',
      repairHypothesis: 'Reject file URLs before persisting records.',
      evidencePaths: ['file:///private/path/secret.txt'],
      nextAction: 'retry',
    })).toThrow(/http\(s\)/i);

    const outside = mkdtempSync(join(tmpdir(), 'osc-feedback-outside-'));
    mkdirSync(join(root, '.osc/improvements/applied'), { recursive: true });
    symlinkSync(join(outside, 'secret.md'), join(root, '.osc/improvements/applied/symlinked.md'));
    expect(() => loadAcceptedImprovements({ repoRoot: root })).toThrow(/symlink/i);
  });
});
