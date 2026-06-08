import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  analyzeFeedback,
  loadAcceptedImprovements,
  persistAcceptedImprovement,
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

  it('persists accepted improvements and lets future work inherit them', () => {
    const root = tempScaffold();
    const applied = persistAcceptedImprovement({
      repoRoot: root,
      slug: 'keep-spawn-boundary-explicit',
      title: 'Keep spawn boundary explicit',
      lesson: 'Future harness runs should state that Open Scaffold core packages work and adapters execute it.',
      evidencePaths: ['.osc/runs/example/postflight.md'],
    });

    expect(applied.path).toBe('.osc/improvements/applied/keep-spawn-boundary-explicit.md');
    expect(readFileSync(join(root, applied.path), 'utf8')).toContain('Future harness runs should state');

    const lessons = loadAcceptedImprovements({ repoRoot: root, query: 'spawn boundary' });
    expect(lessons).toHaveLength(1);
    expect(lessons[0].slug).toBe('keep-spawn-boundary-explicit');

    const run = routeHarnessCommand({ repoRoot: root, input: '$work "spawn boundary next slice" --context "enough" --inherit-improvements' });
    const packet = JSON.parse(readFileSync(join(root, `.osc/runs/${run.runId}/run.json`), 'utf8'));
    expect(packet.improvements.inherited.map((item: { slug: string }) => item.slug)).toContain('keep-spawn-boundary-explicit');
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
