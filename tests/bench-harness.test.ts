import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { classifyBenchLaneCompletion, runBenchSuite, runHandoffLab } from '../src/bench.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(prefix = 'osc-bench-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', root], { encoding: 'utf8' });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBenchmark reproduction test repo.\n', 'utf8');
  return root;
}

function trustAdapterConfig(root: string, id: string): void {
  const result = execFileSync(tsx, [cli, 'adapter', 'trust', id], { cwd: root, encoding: 'utf8' });
  expect(result).toContain(`Adapter: ${id}`);
}

function writeMarkerAdapter(root: string, id: string, body: string, extra: Record<string, unknown> = {}): void {
  const adapterDir = join(root, '.osc/adapters');
  mkdirSync(adapterDir, { recursive: true });
  writeFileSync(join(adapterDir, `${id}.mjs`), body, 'utf8');
  writeFileSync(join(adapterDir, `${id}.json`), JSON.stringify({
    schemaVersion: 'open-scaffold.adapter.v1',
    id,
    command: [process.execPath, `.osc/adapters/${id}.mjs`],
    timeoutMs: 1_000,
    maxStdoutBytes: 4_000,
    maxStderrBytes: 4_000,
    ...extra,
  }, null, 2) + '\n', 'utf8');
  trustAdapterConfig(root, id);
}

describe('harness benchmark and reproduction machinery', () => {
  it('runs a simulated suite with aggregate metrics and strict no-overclaim proof gate', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-bench-'));
    const explicitFixtures = ['debugging-protocol-improvement', 'blocker-handling-missing-context', 'token-efficient-handoff-resume', 'toy-code-repair'];
    const result = runBenchSuite({
      repoRoot: root,
      mode: 'simulated',
      outDir: '.osc/bench/simulated-runtime-smoke',
      fixtureIds: explicitFixtures,
      includeAblations: true,
      ablationFixtureIds: explicitFixtures,
    });

    expect(result.schema).toBe('osc.bench-suite-aggregate.v1');
    expect(result.mode).toBe('simulated');
    expect(result.totals.fixtures).toBe(explicitFixtures.length);
    expect(result.totals.ablationFixtures).toBe(explicitFixtures.length);
    expect(result.metrics).toMatchObject({ quality: expect.any(Object), tokens: expect.any(Object), duration: expect.any(Object), rounds: expect.any(Object) });
    expect(result.cleanCompletion.allLanesClean).toBe(true);
    expect(result.proofGate.status).toBe('not_proven');
    expect(result.proofGate.reasons.map((blocker) => blocker.id)).toContain('not_live_codex');
    expect(result.reproductionVerdict.status).toBe('not_reproduced');
    expect(result.feedback.record).toMatchObject({ source: 'benchmark', verdict: 'retry', scope: 'benchmark' });
    expect(existsSync(join(root, '.osc/bench/simulated-runtime-smoke/aggregate.json'))).toBe(true);
    expect(readFileSync(join(root, '.osc/bench/simulated-runtime-smoke/REPORT.md'), 'utf8')).toContain('Reproduction verdict: not_reproduced');
  });

  it('does not silently cap explicitly selected ablation fixtures', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-ablation-cap-'));
    const explicitFixtures = [
      'debugging-protocol-improvement',
      'blocker-handling-missing-context',
      'token-efficient-handoff-resume',
      'reviewer-skill-improvement',
      'test-author-skill-improvement',
    ];

    const result = runBenchSuite({
      repoRoot: root,
      mode: 'simulated',
      outDir: '.osc/bench/explicit-ablation-fixtures',
      fixtureIds: explicitFixtures,
      includeAblations: true,
      ablationFixtureIds: explicitFixtures,
    });

    expect(result.totals.ablationFixtures).toBe(explicitFixtures.length);
    expect(result.totals.ablationRuns).toBe(explicitFixtures.length * 5);
    expect(new Set(result.ablations.map((item) => item.fixtureId))).toEqual(new Set(explicitFixtures));
  });

  it('runs a 15-candidate handoff lab and reports the best budget-passing compiler candidate', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-handoff-lab-'));
    const result = runHandoffLab({ repoRoot: root, outDir: '.osc/bench/handoff-lab-15' });

    expect(result.schema).toBe('osc.handoff-lab-aggregate.v1');
    expect(result.methodsTested).toBe(15);
    expect(result.best.score).toBe(result.best.maxScore);
    expect(result.best.length).toBeLessThanOrEqual(result.budget.maxChars);
    expect(result.narrowClaim.status).toBe('candidate_only_not_broad_proof');
    expect(existsSync(join(root, '.osc/bench/handoff-lab-15/aggregate.json'))).toBe(true);
    expect(readFileSync(join(root, '.osc/bench/handoff-lab-15/REPORT.md'), 'utf8')).toContain('candidate-only evidence');
  });

  it('marks live lanes dirty and records benchmark feedback when final markers are missing', () => {
    const root = tempScaffold('osc-live-dirty-');
    try {
      writeMarkerAdapter(root, 'missing-marker', `console.log('finished without the required final marker');\n`);

      const result = runBenchSuite({
        repoRoot: root,
        mode: 'live',
        outDir: '.osc/bench/live-dirty-marker',
        fixtureIds: ['token-efficient-handoff-resume'],
        includeAblations: true,
        ablationFixtureIds: ['token-efficient-handoff-resume'],
        allowSpawn: true,
        adapterId: 'missing-marker',
      });

      expect(result.cleanCompletion.allLanesClean).toBe(false);
      expect(result.fixtures[0].harness.completion.clean).toBe(false);
      expect(result.fixtures[0].harness.completion.reasonIds).toContain('runtime_marker_missing');
      expect(result.proofGate.reasons.map((reason) => reason.id)).toContain('live_lane_unclean');
      expect(result.reproductionVerdict.status).toBe('not_reproduced');
      expect(result.feedback.analysis.repairHypotheses[0].hypothesis).toContain('live lane');
      expect(existsSync(join(root, result.feedback.path))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('writes distinct live work packages for non-handoff control, harness, and ablation lanes', () => {
    const root = tempScaffold('osc-live-lane-prompts-');
    try {
      writeMarkerAdapter(root, 'complete-marker', `console.log('bounded benchmark answer');\nconsole.log('LOMEIN_COMPLETE');\n`);
      const result = runBenchSuite({
        repoRoot: root,
        mode: 'live',
        outDir: '.osc/bench/lane-prompts',
        fixtureIds: ['debugging-protocol-improvement'],
        includeAblations: true,
        ablationFixtureIds: ['debugging-protocol-improvement'],
        allowSpawn: true,
        adapterId: 'complete-marker',
      });
      const runPacketPath = (receiptPath: string) => receiptPath.replace(/runtime-receipt\.json$/, 'run.json');
      const control = JSON.parse(readFileSync(join(root, runPacketPath(result.fixtures[0].control.receiptPath!)), 'utf8'));
      const harness = JSON.parse(readFileSync(join(root, runPacketPath(result.fixtures[0].harness.receiptPath!)), 'utf8'));
      const ablationReceipt = result.ablations.find((item) => item.ablationId === 'naked-explicit-acceptance-criteria')?.evidencePaths.find((item) => item.role === 'runtime_receipt')?.path;
      expect(ablationReceipt).toBeTruthy();
      const ablation = JSON.parse(readFileSync(join(root, runPacketPath(ablationReceipt!)), 'utf8'));

      expect(control.workPackage.context).not.toBe(harness.workPackage.context);
      expect(ablation.workPackage.context).not.toBe(harness.workPackage.context);
      expect(control.workPackage.acceptanceCriteria).not.toEqual(harness.workPackage.acceptanceCriteria);
      expect(ablation.workPackage.context).toContain('Explicit acceptance criteria');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses runtime-reported token usage when live adapter output provides it', () => {
    const root = tempScaffold('osc-live-token-usage-');
    try {
      writeMarkerAdapter(root, 'token-usage-marker', `console.error('OPEN_SCAFFOLD_TOKEN_USAGE: {"promptTokens": 80, "completionTokens": 20, "totalTokens": 100}');\nconsole.log('root cause reproduction verification');\nconsole.log('LOMEIN_COMPLETE');\n`);
      const result = runBenchSuite({
        repoRoot: root,
        mode: 'live',
        outDir: '.osc/bench/live-token-usage',
        fixtureIds: ['debugging-protocol-improvement'],
        allowSpawn: true,
        adapterId: 'token-usage-marker',
      });

      expect(result.fixtures[0].control.tokens).toMatchObject({ value: 100, source: 'runtime_adapter_receipt', promptTokens: 80, completionTokens: 20 });
      expect(result.fixtures[0].harness.tokens).toMatchObject({ value: 100, source: 'runtime_adapter_receipt', promptTokens: 80, completionTokens: 20 });
      expect(result.fixtures[0].comparison.blockers).not.toContain('token_receipts_unavailable');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not treat stdout answer text as trusted token proof', () => {
    const root = tempScaffold('osc-live-forged-token-usage-');
    try {
      writeMarkerAdapter(root, 'forged-stdout-token-marker', `console.log('OPEN_SCAFFOLD_TOKEN_USAGE: {"promptTokens": 1, "completionTokens": 1, "totalTokens": 2}');\nconsole.log('root cause reproduction verification');\nconsole.log('LOMEIN_COMPLETE');\n`);
      const result = runBenchSuite({
        repoRoot: root,
        mode: 'live',
        outDir: '.osc/bench/live-forged-token-usage',
        fixtureIds: ['debugging-protocol-improvement'],
        allowSpawn: true,
        adapterId: 'forged-stdout-token-marker',
      });

      expect(result.fixtures[0].control.tokens).toMatchObject({ value: null, source: 'not_reported_by_runtime_adapter' });
      expect(result.fixtures[0].comparison.blockers).toContain('token_receipts_unavailable');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps live run ids distinct for long suite and fixture names', () => {
    const root = tempScaffold('osc-live-long-run-id-');
    try {
      writeMarkerAdapter(root, 'complete-marker', `console.log('bounded benchmark answer');\nconsole.log('LOMEIN_COMPLETE');\n`);
      const longFixture = 'debugging-protocol-improvement-with-extra-characters-that-would-have-truncated-away-lane-suffixes';
      const result = runBenchSuite({
        repoRoot: root,
        mode: 'live',
        outDir: '.osc/bench/very-long-reproduction-suite-name-that-would-have-caused-run-id-truncation-collisions',
        fixtureIds: [longFixture],
        includeAblations: true,
        ablationFixtureIds: [longFixture],
        allowSpawn: true,
        adapterId: 'complete-marker',
      });

      const receiptPaths = [
        result.fixtures[0].control.receiptPath,
        result.fixtures[0].harness.receiptPath,
        ...result.ablations.map((ablation) => ablation.evidencePaths.find((item) => item.role === 'runtime_receipt')?.path),
      ];
      expect(new Set(receiptPaths).size).toBe(receiptPaths.length);
      for (const receiptPath of receiptPaths) {
        expect(receiptPath).toBeTruthy();
        expect(existsSync(join(root, receiptPath!))).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not count an equal-duration live quality tie as partial reproduction', () => {
    const root = tempScaffold('osc-live-no-directional-win-');
    const originalNow = Date.now;
    try {
      writeMarkerAdapter(root, 'complete-marker', `console.log('bounded benchmark answer');\nconsole.log('LOMEIN_COMPLETE');\n`);
      Date.now = () => 1_000;
      const result = runBenchSuite({
        repoRoot: root,
        mode: 'live',
        outDir: '.osc/bench/live-no-directional-win',
        fixtureIds: ['debugging-protocol-improvement'],
        allowSpawn: true,
        adapterId: 'complete-marker',
      });

      expect(result.fixtures[0].comparison.qualityDeltaHarnessMinusControl).toBe(0);
      expect(result.fixtures[0].comparison.durationDeltaHarnessMinusControl).toBe(0);
      expect(result.reproductionVerdict.status).toBe('not_reproduced');
    } finally {
      Date.now = originalNow;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps broad proof blocked unless ablations cover every live fixture', () => {
    const root = tempScaffold('osc-live-ablation-coverage-');
    try {
      writeMarkerAdapter(root, 'complete-marker', `console.log('bounded benchmark answer');\nconsole.log('LOMEIN_COMPLETE');\n`);
      const fixtureIds = [
        'token-efficient-handoff-resume',
        'debugging-protocol-improvement',
        'blocker-handling-missing-context',
        'reviewer-skill-improvement',
        'test-author-skill-improvement',
        'fixture-6',
        'fixture-7',
        'fixture-8',
        'fixture-9',
        'fixture-10',
      ];

      const result = runBenchSuite({
        repoRoot: root,
        mode: 'live',
        outDir: '.osc/bench/live-incomplete-ablation-coverage',
        fixtureIds,
        includeAblations: true,
        ablationFixtureIds: ['token-efficient-handoff-resume'],
        allowSpawn: true,
        adapterId: 'complete-marker',
      });

      expect(result.totals.fixtures).toBe(10);
      expect(result.totals.ablationFixtures).toBe(1);
      expect(result.proofGate.reasons.map((reason) => reason.id)).toContain('incomplete_ablation_coverage');
      expect(result.proofGate.broadDominanceClaimAllowed).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('classifies timeout, signal, non-zero, missing-marker, and incomplete evidence as unclean live completions', () => {
    const baseReceipt = {
      status: 'completed',
      exit: { status: 0, signal: null, timedOut: false },
      marker: { state: 'complete', marker: 'LOMEIN_COMPLETE', count: 1, finalStandalone: true, context: '' },
      failure: { code: null, message: null },
      evidencePaths: [
        { role: 'runtime_receipt', path: '.osc/runs/run/runtime-receipt.json' },
        { role: 'runtime_stdout_log', path: '.osc/runs/run/runtime/stdout.log' },
        { role: 'runtime_stderr_log', path: '.osc/runs/run/runtime/stderr.log' },
      ],
    } as any;

    expect(classifyBenchLaneCompletion(baseReceipt)).toMatchObject({ clean: true, status: 'clean', reasonIds: [] });
    expect(classifyBenchLaneCompletion({ ...baseReceipt, status: 'failed', exit: { ...baseReceipt.exit, timedOut: true }, failure: { code: 'runtime_timeout', message: 'timeout' } })).toMatchObject({ clean: false, reasonIds: expect.arrayContaining(['runtime_timeout']) });
    expect(classifyBenchLaneCompletion({ ...baseReceipt, status: 'failed', exit: { ...baseReceipt.exit, status: null, signal: 'SIGTERM' }, failure: { code: 'runtime_signaled', message: 'signal' } })).toMatchObject({ clean: false, reasonIds: expect.arrayContaining(['runtime_signaled']) });
    expect(classifyBenchLaneCompletion({ ...baseReceipt, status: 'failed', exit: { ...baseReceipt.exit, status: 2 }, failure: { code: 'runtime_non_zero', message: 'non-zero' } })).toMatchObject({ clean: false, reasonIds: expect.arrayContaining(['runtime_non_zero']) });
    expect(classifyBenchLaneCompletion({ ...baseReceipt, status: 'failed', marker: { ...baseReceipt.marker, state: 'missing', marker: null }, failure: { code: 'runtime_marker_missing', message: 'missing' } })).toMatchObject({ clean: false, reasonIds: expect.arrayContaining(['runtime_marker_missing']) });
    expect(classifyBenchLaneCompletion({ ...baseReceipt, evidencePaths: [] })).toMatchObject({ clean: false, reasonIds: expect.arrayContaining(['incomplete_evidence']) });
  });
});
