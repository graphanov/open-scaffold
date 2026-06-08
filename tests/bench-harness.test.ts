import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBenchSuite, runHandoffLab } from '../src/bench.js';

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
    expect(result.proofGate.status).toBe('not_proven');
    expect(result.proofGate.blockers.map((blocker) => blocker.id)).toContain('not_live_codex');
    expect(existsSync(join(root, '.osc/bench/simulated-runtime-smoke/aggregate.json'))).toBe(true);
    expect(readFileSync(join(root, '.osc/bench/simulated-runtime-smoke/REPORT.md'), 'utf8')).toContain('Broad dominance: not proven');
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
});
